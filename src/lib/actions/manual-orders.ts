"use server";

import { randomBytes } from "node:crypto";
import { isValidObjectId } from "mongoose";
import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";
import { connectToDatabase } from "@/lib/db";
import type { ManualOrderInput } from "@/lib/manual-order";
import { Counter } from "@/lib/models/Counter";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { User } from "@/lib/models/User";
import { OutOfStockError, reserveStock } from "@/lib/order-stock";
import { revalidateStorefront } from "@/lib/revalidate";
import { variantLabel } from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

// Same numbering as storefront orders (customer/lib/orders.ts): 10001, 10002, …
const FIRST_ORDER_ID = 10000;

function toLocalPhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^880/, "0");
}

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
    const errors: Record<string, string> = {};
    const phone = toLocalPhone(input.customer.phone);
    if (input.customer.name.trim().length < 2) errors.name = "Enter the customer's name";
    if (!/^01[3-9]\d{8}$/.test(phone)) errors.phone = "Enter an 11-digit number starting 013–019";
    if (input.customer.address.trim().length < 10) errors.address = "Enter the full delivery address";
    if (!input.items.length) errors.items = "Add at least one product";
    if (!Number.isFinite(input.shippingCost) || input.shippingCost < 0) errors.shippingCost = "Enter 0 or more";
    if (!Number.isFinite(input.discount) || input.discount < 0) errors.discount = "Enter 0 or more";
    input.items.forEach((item, index) => {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) errors[`items.${index}`] = "Quantity must be at least 1";
      else if (!Number.isFinite(item.price) || item.price < 0) errors[`items.${index}`] = "Enter a price";
    });
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    const { connection } = await connectToDatabase();
    const products = new Map(
      (await Product.find({ _id: { $in: input.items.map((item) => item.productId) } }).lean()).map((product) => [
        product._id,
        product,
      ]),
    );

    const lines = input.items.map((item) => {
      const product = products.get(item.productId);
      if (!product) throw new InputError("A product in this order no longer exists");
      const base = { productId: product._id, name: product.name, quantity: item.quantity, price: Math.round(item.price) };
      if (!product.variants.length) return { ...base, options: [], image: product.images[0] };

      const variant = item.variantId && isValidObjectId(item.variantId)
        ? product.variants.find((entry) => String(entry._id) === item.variantId)
        : undefined;
      if (!variant) throw new InputError(`Choose a size or colour for ${product.name}`);
      return {
        ...base,
        variantId: String(variant._id),
        sku: variant.sku ?? undefined,
        options: variant.options.map(({ name, value }) => ({ name, value })),
        variantLabel: variantLabel(variant.options),
        image: variant.image ?? product.images[0],
      };
    });

    const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
    const discount = Math.min(Math.round(input.discount), subtotal);
    const shippingCost = Math.round(input.shippingCost);
    const [settings, account] = await Promise.all([getSettings(), User.findOne({ phone }, { _id: 1 }).lean()]);
    const shipping = settings.shippingOptions.find((option) => option.value === input.shippingOption);
    const channel = input.channel.trim();
    const now = new Date();

    let orderID = 0;
    try {
      await connection.transaction(async (session) => {
        for (const line of lines) await reserveStock(line, session);
        const counter = await Counter.findOneAndUpdate(
          { _id: "orderID" },
          { $inc: { seq: 1 } },
          { upsert: true, returnDocument: "after", session },
        );
        if (!counter) throw new Error("Couldn't allocate an order number");
        orderID = FIRST_ORDER_ID + counter.seq;

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
              total: Math.max(0, subtotal - discount + shippingCost),
              source: "admin",
              channel: channel || undefined,
              createdBy: user.name,
              status: input.status,
              paymentStatus: input.paymentStatus,
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
