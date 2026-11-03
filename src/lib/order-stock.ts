import "server-only";
import { Types, type ClientSession } from "mongoose";
import { Product } from "@/lib/models/Product";

// Stock moves for orders, matching reserveStock() in customer/lib/orders.ts: a variant's stock and
// the product's total move together, and soldCount follows (it drives "Best sellers").

export type StockLine = { productId: string; variantId?: string | null; quantity: number; name: string; variantLabel?: string | null };

export class OutOfStockError extends Error {}

/** Takes stock for one line, failing (inside the transaction) if not enough is left. */
export async function reserveStock(line: StockLine, session: ClientSession) {
  const quantity = line.quantity;
  const result = line.variantId
    ? await Product.updateOne(
        {
          _id: line.productId,
          variants: { $elemMatch: { _id: new Types.ObjectId(line.variantId), stock: { $gte: quantity } } },
        },
        { $inc: { "variants.$.stock": -quantity, stock: -quantity, soldCount: quantity } },
        { session },
      )
    : await Product.updateOne(
        { _id: line.productId, "variants.0": { $exists: false }, stock: { $gte: quantity } },
        { $inc: { stock: -quantity, soldCount: quantity } },
        { session },
      );
  if (result.modifiedCount === 1) return;

  const product = await Product.findById(line.productId).session(session).lean();
  const left = line.variantId
    ? (product?.variants.find((variant) => String(variant._id) === line.variantId)?.stock ?? 0)
    : (product?.stock ?? 0);
  const name = line.variantLabel ? `${line.name} (${line.variantLabel})` : line.name;
  throw new OutOfStockError(left > 0 ? `Only ${left} × ${name} left in stock` : `${name} is out of stock`);
}

/** Puts an order's items back on the shelf (cancelled, returned or deleted order). */
export async function restockItems(items: StockLine[], session: ClientSession) {
  for (const item of items) {
    const quantity = item.quantity;
    if (item.variantId && Types.ObjectId.isValid(item.variantId)) {
      await Product.updateOne(
        { _id: item.productId, "variants._id": new Types.ObjectId(item.variantId) },
        { $inc: { "variants.$.stock": quantity, stock: quantity, soldCount: -quantity } },
        { session },
      );
    } else {
      await Product.updateOne(
        { _id: item.productId, "variants.0": { $exists: false } },
        { $inc: { stock: quantity, soldCount: -quantity } },
        { session },
      );
    }
  }
}
