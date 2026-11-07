"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";
import { connectToDatabase } from "@/lib/db";
import type { ExchangeInput } from "@/lib/manual-order";
import { Order } from "@/lib/models/Order";
import { allocateOrderID, buildOrderLines, exchangedQuantities, lineErrors } from "@/lib/order-create";
import { OutOfStockError, reserveStock } from "@/lib/order-stock";
import { revalidateStorefront } from "@/lib/revalidate";
import { InputError, runAction } from "./result";

/**
 * Creates an exchange for a delivered order: a new order (so it can be booked with the courier like any
 * other) that delivers the replacement items and collects the old ones.
 *
 * - Stock for the replacements is taken now, like any order.
 * - The old items come back into stock when the exchange is marked delivered (see updateOrderStatus).
 * - The old items' value is credited against the replacements, so the exchange's total — and the
 *   revenue it adds — is only the price difference plus the delivery charge. A cheaper replacement
 *   isn't refunded here.
 */
export async function createExchangeOrder(originalID: number, input: ExchangeInput) {
  return runAction(async () => {
    const user = await requireStaff();
    const errors: Record<string, string> = lineErrors(input.items);
    if (!Number.isFinite(input.shippingCost) || input.shippingCost < 0) errors.shippingCost = "Enter 0 or more";
    const returns = input.returns.filter((line) => line.quantity > 0);
    if (!returns.length) errors.returns = "Choose what the customer is sending back";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    const { connection } = await connectToDatabase();
    const original = await Order.findOne({ orderID: originalID }).lean();
    if (!original) throw new InputError("The original order no longer exists");
    if (original.status !== "delivered") throw new InputError("Only delivered orders can be exchanged");

    const taken = await exchangedQuantities(originalID);
    const exchangeReturns = returns.map(({ itemIndex, quantity }) => {
      const item = original.items[itemIndex];
      if (!item || !Number.isInteger(quantity)) throw new InputError("Choose what the customer is sending back");
      const left = item.quantity - (taken.get(itemIndex) ?? 0);
      if (quantity > left) {
        throw new InputError(
          left > 0 ? `Only ${left} × ${item.name} can still be exchanged` : `${item.name} has already been exchanged`,
        );
      }
      return {
        itemIndex,
        productId: item.productId,
        variantId: item.variantId ?? undefined,
        sku: item.sku ?? undefined,
        name: item.name,
        variantLabel: item.variantLabel ?? undefined,
        quantity,
        price: item.price,
        image: item.image ?? undefined,
      };
    });

    const lines = await buildOrderLines(input.items);
    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const returnedValue = exchangeReturns.reduce((sum, line) => sum + line.price * line.quantity, 0);
    // A cheaper replacement leaves part of the credit unused; that's settled outside this order for now.
    const exchangeCredit = Math.min(returnedValue, subtotal);
    const shippingCost = Math.round(input.shippingCost);
    const total = subtotal - exchangeCredit + shippingCost;

    const settings = await getSettings();
    const shipping = settings.shippingOptions.find((option) => option.value === input.shippingOption);
    const describe = (line: { name: string; variantLabel?: string | null; quantity: number }) =>
      `${line.name}${line.variantLabel ? ` (${line.variantLabel})` : ""} × ${line.quantity}`;
    const now = new Date();

    let orderID = 0;
    try {
      await connection.transaction(async (session) => {
        for (const line of lines) await reserveStock(line, session);
        orderID = await allocateOrderID(session);

        await Order.create(
          [
            {
              orderID,
              trackingToken: randomBytes(6).toString("hex"),
              user: original.user,
              customer: {
                name: original.customer.name,
                phone: original.customer.phone,
                email: original.customer.email ?? undefined,
                address: original.customer.address,
              },
              items: lines,
              shippingOption: shipping?.value ?? (input.shippingOption === "pickup" ? "pickup" : "custom"),
              shippingLabel: shipping?.label ?? (input.shippingOption === "pickup" ? "Shop pickup" : "Custom delivery"),
              paymentOption: "cash",
              subtotal,
              shippingCost,
              total,
              advancePaid: 0,
              // Nothing to collect (same-price swap at the shop) counts as paid.
              paymentStatus: total === 0 ? "paid" : "unpaid",
              source: "admin",
              channel: "Exchange",
              createdBy: user.name,
              status: "confirmed",
              exchangeOf: originalID,
              exchangeReturns,
              exchangeCredit,
              adminNote: input.adminNote.trim() || undefined,
              statusHistory: [
                {
                  status: "confirmed",
                  by: user.name,
                  note: `Exchange for #${originalID} · collect ${exchangeReturns.map(describe).join(", ")}`,
                  at: now,
                },
              ],
            },
          ],
          { session },
        );

        const summary = `Exchange #${orderID} (${now.toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka" })}): ${exchangeReturns.map(describe).join(", ")} → ${lines.map(describe).join(", ")}`;
        await Order.updateOne(
          { orderID: originalID },
          { $set: { adminNote: [original.adminNote, summary].filter(Boolean).join("\n") } },
          { session },
        );
      });
    } catch (error) {
      if (error instanceof OutOfStockError) throw new InputError(error.message);
      throw error;
    }

    revalidatePath("/orders");
    revalidatePath(`/orders/${originalID}`);
    revalidatePath("/dashboard");
    await revalidateStorefront(["products"], user.id);
    return orderID;
  }, "Exchange created");
}
