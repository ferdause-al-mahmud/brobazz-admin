"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import {
  bookPathao,
  bookSteadfast,
  courierNames,
  fetchCourierStatus,
  parsePathaoAddress,
  pathaoSuccessRate,
  steadfastFraudScore,
  type CourierProvider,
  type PathaoLocation,
} from "@/lib/couriers";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { InputError, runAction } from "./result";

function refresh(orderID: number) {
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderID}`);
}

/** Pathao needs city/zone/area IDs; this reads them from the delivery address for the booking dialog. */
export async function locateForPathao(address: string) {
  return runAction(async () => {
    await requireStaff();
    const result = await parsePathaoAddress(address);
    if (!result.ok) throw new InputError(result.error);
    const { ok: _ok, ...location } = result;
    return location;
  });
}

export type CourierBookingInput = {
  provider: CourierProvider;
  codAmount: number;
  note: string;
  weight: number;
  /** Required for Pathao (from locateForPathao). */
  location: PathaoLocation | null;
  markShipped: boolean;
};

/** Books the parcel with Pathao or Steadfast and saves the consignment on the order. */
type ParcelLine = { name: string; variantLabel?: string | null; quantity: number };
const describeLines = (lines: ParcelLine[]) =>
  lines.map((line) => `${line.name}${line.variantLabel ? ` (${line.variantLabel})` : ""} × ${line.quantity}`).join(", ");

/** What's in the parcel; an exchange also tells the rider what to collect. */
function parcelDescription(order: { items: ParcelLine[]; exchangeOf?: number | null; exchangeReturns?: ParcelLine[] | null }) {
  if (!order.exchangeOf || !order.exchangeReturns?.length) return describeLines(order.items);
  return `EXCHANGE — deliver: ${describeLines(order.items)}; collect from customer: ${describeLines(order.exchangeReturns)}`;
}

export async function bookCourier(orderID: number, input: CourierBookingInput) {
  return runAction(async () => {
    const user = await requireStaff();
    if (!(input.provider in courierNames)) throw new InputError("Choose Pathao or Steadfast");
    if (!Number.isFinite(input.codAmount) || input.codAmount < 0) throw new InputError("Enter the amount to collect");
    await connectToDatabase();

    const order = await Order.findOne({ orderID });
    if (!order) throw new InputError("This order no longer exists");
    if (order.courier?.provider && order.courier.trackingNumber) {
      throw new InputError(`Already booked with ${courierNames[order.courier.provider]} (${order.courier.trackingNumber})`);
    }
    if (["cancelled", "returned", "delivered"].includes(order.status)) throw new InputError(`This order is ${order.status}`);

    const parcel = {
      orderID,
      name: order.customer.name,
      phone: order.customer.phone,
      address: order.customer.address,
      note: input.note.trim(),
      codAmount: input.codAmount,
      itemDescription: parcelDescription(order).slice(0, 500),
      itemQuantity: order.items.reduce((sum, item) => sum + item.quantity, 0),
      weight: input.weight > 0 ? input.weight : 0.5,
    };

    let booking;
    if (input.provider === "pathao") {
      if (!input.location) throw new InputError("Find the delivery area first");
      booking = await bookPathao(parcel, input.location);
    } else {
      booking = await bookSteadfast(parcel);
    }
    if (!booking.ok) throw new InputError(`${courierNames[input.provider]}: ${booking.error}`);

    order.courier = {
      name: courierNames[input.provider],
      provider: input.provider,
      trackingNumber: booking.consignmentId,
      trackingUrl: booking.trackingUrl || undefined,
      bookedAt: new Date(),
      deliveryFee: booking.deliveryFee ?? undefined,
      status: booking.status,
      statusCheckedAt: new Date(),
    };
    const note = `Booked with ${courierNames[input.provider]} · consignment ${booking.consignmentId}`;
    if (input.markShipped && order.status !== "shipped") {
      order.status = "shipped";
      order.statusHistory.push({ status: "shipped", note, by: user.name, at: new Date() });
    } else {
      order.adminNote = [order.adminNote, note].filter(Boolean).join("\n");
    }
    await order.save();
    refresh(orderID);
    return booking.consignmentId;
  }, "Parcel booked");
}

/** Asks the courier for the parcel's latest status and stores it on the order. */
export async function refreshCourierStatus(orderID: number) {
  return runAction(async () => {
    await requireStaff();
    await connectToDatabase();
    const order = await Order.findOne({ orderID });
    const provider = order?.courier?.provider;
    const consignmentId = order?.courier?.trackingNumber;
    if (!order || !provider || !consignmentId) throw new InputError("This order isn't booked with Pathao or Steadfast");

    const result = await fetchCourierStatus(provider, consignmentId);
    if (!result.ok) throw new InputError(result.error);
    order.set({ "courier.status": result.status, "courier.statusCheckedAt": new Date() });
    await order.save();
    refresh(orderID);
    return result.status;
  });
}

/** A phone number's history in this store plus Pathao's and Steadfast's shared records. */
export async function checkCustomerRecord(phone: string) {
  return runAction(async () => {
    await requireStaff();
    const digits = phone.replace(/\D/g, "").replace(/^880/, "0");
    if (digits.length < 10) throw new InputError("Enter a valid phone number");
    await connectToDatabase();

    const [store, pathao, steadfast] = await Promise.all([
      Order.aggregate<{ _id: string; count: number }>([
        { $match: { "customer.phone": digits } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      pathaoSuccessRate(digits),
      steadfastFraudScore(digits),
    ]);
    const count = (status: string) => store.find((row) => row._id === status)?.count ?? 0;
    return {
      phone: digits,
      store: {
        total: store.reduce((sum, row) => sum + row.count, 0),
        delivered: count("delivered"),
        returned: count("returned"),
        cancelled: count("cancelled"),
      },
      pathao,
      steadfast,
    };
  });
}

export type CustomerRecord = Extract<Awaited<ReturnType<typeof checkCustomerRecord>>, { ok: true }>["data"];
