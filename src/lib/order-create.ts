import "server-only";
import { isValidObjectId, type ClientSession } from "mongoose";
import { InputError } from "@/lib/actions/result";
import type { ManualOrderLine, PickerProduct } from "@/lib/manual-order";
import { Counter } from "@/lib/models/Counter";
import { Order } from "@/lib/models/Order";
import { Product, type ProductDocument } from "@/lib/models/Product";
import { effectivePrice, variantLabel, variantPricing } from "@/lib/store-definitions";

// Shared by staff-created orders (manual orders and exchanges).

// Same numbering as storefront orders (customer/lib/orders.ts): 10001, 10002, …
const FIRST_ORDER_ID = 10000;

/** Phone number as stored on orders: 01XXXXXXXXX. */
export function toLocalPhone(phone: string) {
  return phone.replace(/\D/g, "").replace(/^880/, "0");
}

/** Field errors for the product lines of a staff-created order. */
export function lineErrors(items: ManualOrderLine[]) {
  const errors: Record<string, string> = {};
  if (!items.length) errors.items = "Add at least one product";
  items.forEach((item, index) => {
    if (!Number.isInteger(item.quantity) || item.quantity < 1) errors[`items.${index}`] = "Quantity must be at least 1";
    else if (!Number.isFinite(item.price) || item.price < 0) errors[`items.${index}`] = "Enter a price";
  });
  return errors;
}

/** Turns the form's lines into order items, copying names, options and images from the products. */
export async function buildOrderLines(items: ManualOrderLine[]) {
  const products = new Map(
    (await Product.find({ _id: { $in: items.map((item) => item.productId) } }).lean()).map((product) => [product._id, product]),
  );

  return items.map((item) => {
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
}

/** The next order number, allocated inside the order's transaction. */
export async function allocateOrderID(session: ClientSession) {
  const counter = await Counter.findOneAndUpdate(
    { _id: "orderID" },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after", session },
  );
  if (!counter) throw new Error("Couldn't allocate an order number");
  return FIRST_ORDER_ID + counter.seq;
}

/** How many units of each line of `orderID` are already being exchanged (open or done exchanges). */
export async function exchangedQuantities(orderID: number) {
  const exchanges = await Order.find(
    // Open exchanges, plus any whose old items already came back (even if the replacement was later returned).
    { exchangeOf: orderID, $or: [{ status: { $nin: ["cancelled", "returned"] } }, { exchangeReturnedAt: { $exists: true } }] },
    { exchangeReturns: 1 },
  ).lean();
  const taken = new Map<number, number>();
  for (const exchange of exchanges) {
    for (const line of exchange.exchangeReturns ?? []) taken.set(line.itemIndex, (taken.get(line.itemIndex) ?? 0) + line.quantity);
  }
  return taken;
}

/** Active products as the order forms' product picker shows them. */
export async function getPickerProducts(): Promise<PickerProduct[]> {
  const stored = await Product.find({ isActive: true }).sort({ name: 1 }).lean<(ProductDocument & { _id: string })[]>();
  return stored.map((product) => ({
    id: product._id,
    name: product.name,
    image: product.images[0] ?? null,
    price: product.finalPrice ?? effectivePrice(product),
    stock: product.stock,
    variants: product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        id: String((variant as { _id?: unknown })._id),
        label: variantLabel(variant.options),
        price: effectivePrice(variantPricing(product, variant)),
        stock: variant.stock,
        image: variant.image ?? null,
      })),
  }));
}
