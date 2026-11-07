"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";
import { connectToDatabase } from "@/lib/db";
import type { ManualOrderInput } from "@/lib/manual-order";
import { Order } from "@/lib/models/Order";
import { User } from "@/lib/models/User";
import { allocateOrderID, buildOrderLines, lineErrors, toLocalPhone } from "@/lib/order-create";
import { OutOfStockError, reserveStock } from "@/lib/order-stock";
import { revalidateStorefront } from "@/lib/revalidate";
import { InputError, runAction } from "./result";

/** Details from this phone number's last order, to fill in the new-order form. */
export async function findCustomerByPhone(phone: string) {
  return runAction(async () => {
    await requireStaff();
    const digits = toLocalPhone(phone);
    if (digits.length !== 11) return null;
    await connectToDatabase();
    const [lastOrder, user, orders] = await Promise.all([
      Order.findOne({ "customer.phone": digits }).sort({ createdAt: -1 }).lean(),
      User.findOne({ phone: digits }, { name: 1, email: 1 }).lean(),
      Order.countDocuments({ "customer.phone": digits }),
    ]);
    if (!lastOrder && !user) return null;
    return {
      name: lastOrder?.customer.name ?? user?.name ?? "",
      email: lastOrder?.customer.email ?? user?.email ?? "",
      address: lastOrder?.customer.address ?? "",
      orders,
      hasAccount: Boolean(user),
    };
  });
}

/** Creates an order entered by staff (phone, Facebook, walk-in…), taking stock like a web order. */
export async function createManualOrder(input: ManualOrderInput) {
  return runAction(async () => {
    const user = await requireStaff();
    const phone = toLocalPhone(input.customer.phone);
    const errors: Record<string, string> = lineErrors(input.items);
    if (input.customer.name.trim().length < 2) errors.name = "Enter the customer's name";
    if (!/^01[3-9]\d{8}$/.test(phone)) errors.phone = "Enter an 11-digit number starting 013–019";
    if (input.customer.address.trim().length < 10) errors.address = "Enter the full delivery address";
    if (!Number.isFinite(input.shippingCost) || input.shippingCost < 0) errors.shippingCost = "Enter 0 or more";
    if (!Number.isFinite(input.discount) || input.discount < 0) errors.discount = "Enter 0 or more";
    if (!Number.isFinite(input.advance) || input.advance < 0) errors.advance = "Enter 0 or more";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    const { connection } = await connectToDatabase();
    const lines = await buildOrderLines(input.items);

    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const discount = Math.min(Math.round(input.discount), subtotal);
    const shippingCost = Math.round(input.shippingCost);
    const total = Math.max(0, subtotal - discount + shippingCost);
    // Paid in full counts as an advance of the whole total, so the courier collects nothing.
    const advancePaid = input.paymentStatus === "paid" ? total : Math.round(input.advance);
    if (advancePaid > total) throw new InputError("The advance is more than the order total", { advance: `At most ${total}` });
    const paymentStatus = advancePaid > 0 && advancePaid === total ? "paid" : "unpaid";

    const [settings, account] = await Promise.all([getSettings(), User.findOne({ phone }, { _id: 1 }).lean()]);
    const shipping = settings.shippingOptions.find((option) => option.value === input.shippingOption);
    const channel = input.channel.trim();
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
              user: account?._id,
              customer: {
                name: input.customer.name.trim(),
                phone,
                email: input.customer.email.trim() || undefined,
                address: input.customer.address.trim(),
                notes: input.customer.notes.trim() || undefined,
              },
              items: lines,
              shippingOption: shipping?.value ?? "custom",
              shippingLabel: shipping?.label ?? "Custom delivery",
              paymentOption: "cash",
              subtotal,
              shippingCost,
              discount,
              total,
              advancePaid,
              source: "admin",
              channel: channel || undefined,
              createdBy: user.name,
              status: input.status,
              paymentStatus,
              adminNote: input.adminNote.trim() || undefined,
              statusHistory: [
                { status: "pending", by: user.name, note: `Entered in the admin${channel ? ` · ${channel}` : ""}`, at: now },
                ...(input.status === "confirmed" ? [{ status: "confirmed", by: user.name, at: now }] : []),
              ],
            },
          ],
          { session },
        );
      });
    } catch (error) {
      if (error instanceof OutOfStockError) throw new InputError(error.message);
      throw error;
    }

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    await revalidateStorefront(["products"], user.id);
    return orderID;
  }, "Order created");
}
