"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { linesStillWithCustomer, receiveExchangedItems, restockItems } from "@/lib/order-stock";
import { revalidateStorefront } from "@/lib/revalidate";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  RESTOCKING_STATUSES,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

function refresh(orderID: number) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderID}`);
  revalidatePath("/dashboard");
}

/**
 * Moves an order to a new status and records it in the history. Cancelling or returning puts the
 * items back in stock the first time; such an order can't be reopened, because its stock is gone.
 * Delivering an exchange takes back the customer's old items, into stock if `resellable`.
 */
export async function updateOrderStatus(orderID: number, status: OrderStatus, note: string, options: { resellable?: boolean } = {}) {
  return runAction(async () => {
    const user = await requireStaff();
    if (!ORDER_STATUSES.includes(status)) throw new InputError("Unknown status");
    const { connection } = await connectToDatabase();

    let restocked = false;
    await connection.transaction(async (session) => {
      const order = await Order.findOne({ orderID }).session(session);
      if (!order) throw new InputError("This order no longer exists");
      if (order.status === status) throw new InputError(`The order is already ${status}`);
      if (order.restockedAt && !RESTOCKING_STATUSES.includes(status)) {
        throw new InputError("This order's items were already returned to stock, so it can't be reopened. Create a new order instead.");
      }

      if (RESTOCKING_STATUSES.includes(status) && !order.restockedAt) {
        // Units already swapped through a delivered exchange came back then; don't count them twice.
        const exchanges = await Order.find(
          { orderID: { $ne: orderID }, exchangeOf: orderID },
          { orderID: 1, status: 1, exchangeReturns: 1, exchangeReturnedAt: 1 },
        )
          .session(session)
          .lean();
        // An exchange still on its way would bring the same item back again when delivered.
        const open = exchanges.find((exchange) => !exchange.exchangeReturnedAt && !RESTOCKING_STATUSES.includes(exchange.status));
        if (open) throw new InputError(`Exchange #${open.orderID} for this order is still open. Cancel or deliver it first.`);
        await restockItems(linesStillWithCustomer(order.items, exchanges), session);
        order.restockedAt = new Date();
        restocked = true;
      }

      if (status === "delivered" && order.exchangeOf && order.exchangeReturns?.length && !order.exchangeReturnedAt) {
        const resellable = options.resellable ?? true;
        await receiveExchangedItems(order.exchangeReturns, resellable, session);
        order.exchangeReturnedAt = new Date();
        order.exchangeReturnResellable = resellable;
        restocked = true;
      }

      order.status = status;
      order.statusHistory.push({ status, note: note.trim() || undefined, by: user.name, at: new Date() });
      // Revenue counts delivered orders on the day they were delivered.
      order.deliveredAt = status === "delivered" ? new Date() : undefined;
      if (status === "delivered" && order.paymentStatus === "unpaid") {
        // Cash on delivery: delivered means the courier collected the money.
        order.paymentStatus = "paid";
      }
      await order.save({ session });
    });

    refresh(orderID);
    if (restocked) await revalidateStorefront(["products"], user.id);
  }, `Order marked ${status}`);
}

export async function updatePaymentStatus(orderID: number, paymentStatus: PaymentStatus) {
  return runAction(async () => {
    await requireStaff();
    if (!PAYMENT_STATUSES.includes(paymentStatus)) throw new InputError("Unknown payment status");
    await connectToDatabase();
    await Order.updateOne({ orderID }, { $set: { paymentStatus } });
    refresh(orderID);
  }, "Payment updated");
}

/** Records money received before delivery; the courier then collects only the rest. */
export async function updateAdvance(orderID: number, amount: number) {
  return runAction(async () => {
    await requireStaff();
    if (!Number.isFinite(amount) || amount < 0) throw new InputError("Enter 0 or more");
    await connectToDatabase();
    const order = await Order.findOne({ orderID });
    if (!order) throw new InputError("This order no longer exists");
    if (["delivered", "cancelled", "returned"].includes(order.status)) throw new InputError(`This order is already ${order.status}`);
    const advancePaid = Math.round(amount);
    if (advancePaid > order.total) throw new InputError(`The advance can't be more than the total (${order.total})`);

    order.advancePaid = advancePaid;
    if (order.paymentStatus !== "refunded") order.paymentStatus = advancePaid === order.total && advancePaid > 0 ? "paid" : "unpaid";
    await order.save();
    refresh(orderID);
  }, "Advance saved");
}

export async function updateCourier(orderID: number, courier: { name: string; trackingNumber: string; trackingUrl: string }) {
  return runAction(async () => {
    await requireStaff();
    const trackingUrl = courier.trackingUrl.trim();
    if (trackingUrl && !/^https?:\/\//.test(trackingUrl)) throw new InputError("The tracking link must start with https://");
    await connectToDatabase();
    await Order.updateOne(
      { orderID },
      { $set: { courier: { name: courier.name.trim(), trackingNumber: courier.trackingNumber.trim(), trackingUrl } } },
    );
    refresh(orderID);
  }, "Courier details saved");
}

export async function updateAdminNote(orderID: number, adminNote: string) {
  return runAction(async () => {
    await requireStaff();
    await connectToDatabase();
    await Order.updateOne({ orderID }, { $set: { adminNote: adminNote.trim().slice(0, 2000) } });
    refresh(orderID);
  }, "Note saved");
}

/** Fixes delivery details (a typo in the phone or address) before the order ships. */
export async function updateOrderCustomer(
  orderID: number,
  customer: { name: string; phone: string; email: string; address: string },
) {
  return runAction(async () => {
    await requireStaff();
    const phone = customer.phone.replace(/\D/g, "");
    const errors: Record<string, string> = {};
    if (customer.name.trim().length < 2) errors.name = "Enter a name";
    if (!/^01[3-9]\d{8}$/.test(phone)) errors.phone = "Enter an 11-digit number starting 013–019";
    if (customer.address.trim().length < 10) errors.address = "Enter the full address";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    await connectToDatabase();
    await Order.updateOne(
      { orderID },
      {
        $set: {
          "customer.name": customer.name.trim(),
          "customer.phone": phone,
          "customer.email": customer.email.trim() || undefined,
          "customer.address": customer.address.trim(),
        },
      },
    );
    refresh(orderID);
  }, "Customer details saved");
}

/**
 * Deletes an order for good (admin only). With `restock`, its items go back on the shelf first,
 * unless that already happened (cancelled/returned) or it was delivered.
 */
export async function deleteOrder(orderID: number, restock: boolean) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    const { connection } = await connectToDatabase();
    let restocked = false;
    await connection.transaction(async (session) => {
      const order = await Order.findOne({ orderID }).session(session);
      if (!order) return;
      if (restock && !order.restockedAt && order.status !== "delivered") {
        await restockItems(order.items, session);
        restocked = true;
      }
      await order.deleteOne({ session });
    });
    revalidatePath("/orders");
    revalidatePath("/dashboard");
    if (restocked) await revalidateStorefront(["products"], user.id);
  }, `Order #${orderID} deleted`);
}
