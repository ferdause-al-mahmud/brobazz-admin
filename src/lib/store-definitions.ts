// Constants and helpers shared by the storefront, its API routes and the admin panel.
// No server imports, so client components can use them too.
// Identical in customer/lib/store-definitions.ts — change both together.

/** What kind of goods a product is. Decides which details the admin form asks for. */
export const PRODUCT_TYPES = ["leather", "clothing"] as const;
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const productTypeLabels: Record<ProductType, string> = {
  leather: "Leather goods",
  clothing: "Clothing",
};

export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/** Statuses whose items are back on the shelf; moving an order into one restocks it once. */
export const RESTOCKING_STATUSES: OrderStatus[] = ["cancelled", "returned"];

export const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** How a collection is presented: an evergreen edit, a season ("Winter 26") or a time-boxed campaign. */
export const COLLECTION_KINDS = ["collection", "season", "campaign"] as const;
export type CollectionKind = (typeof COLLECTION_KINDS)[number];

export const COLLECTION_SORTS = ["manual", "new", "best-selling", "price-asc", "price-desc"] as const;
export type CollectionSort = (typeof COLLECTION_SORTS)[number];

export const COUPON_TYPES = ["PERCENTAGE", "FLAT"] as const;
export type CouponType = (typeof COUPON_TYPES)[number];

export type OptionValue = { name: string; value: string };

/** "Black / M". Empty for products without variants. */
export function variantLabel(options: OptionValue[] | undefined | null) {
  return (options ?? []).map((option) => option.value).join(" / ");
}

/** Price actually charged: the sale price when it's set and lower. */
export function effectivePrice({ price, salePrice }: { price: number; salePrice?: number | null }) {
  return salePrice !== null && salePrice !== undefined && salePrice < price ? salePrice : price;
}

type Priced = { price: number; salePrice?: number | null };
type VariantPriced = { price?: number | null; salePrice?: number | null };

/**
 * A variant's list and sale price. A variant with its own price uses its own sale price too;
 * one without inherits both from the product.
 */
export function variantPricing(product: Priced, variant: VariantPriced | null | undefined) {
  if (variant && variant.price !== null && variant.price !== undefined) {
    return { price: variant.price, salePrice: variant.salePrice ?? null };
  }
  return { price: product.price, salePrice: product.salePrice ?? null };
}

/** Whether a collection's date window (if any) includes `now`. */
export function isWithinWindow(
  { startsAt, endsAt }: { startsAt?: Date | string | null; endsAt?: Date | string | null },
  now = new Date(),
) {
  if (startsAt && new Date(startsAt) > now) return false;
  if (endsAt && new Date(endsAt) < now) return false;
  return true;
}
