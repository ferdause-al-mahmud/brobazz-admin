// What the "New order" form sends to createManualOrder(). Client-safe.

export const ORDER_CHANNELS = ["Phone", "Facebook", "Instagram", "WhatsApp", "Walk-in", "Other"] as const;

export type ManualOrderLine = {
  productId: string;
  variantId: string | null;
  quantity: number;
  /** Unit price charged; defaults to the current selling price but staff may change it. */
  price: number;
};

export type ManualOrderInput = {
  customer: { name: string; phone: string; email: string; address: string; notes: string };
  items: ManualOrderLine[];
  shippingOption: string;
  shippingCost: number;
  discount: number;
  status: "pending" | "confirmed";
  paymentStatus: "unpaid" | "paid";
  /** Received before delivery (cash-on-delivery orders only); the courier collects the rest. */
  advance: number;
  channel: string;
  adminNote: string;
};

/** What the "Create exchange" form sends to createExchangeOrder(). */
export type ExchangeInput = {
  /** Lines of the delivered order coming back: their index in its items, and how many. */
  returns: { itemIndex: number; quantity: number }[];
  /** What the customer gets instead. */
  items: ManualOrderLine[];
  shippingOption: string;
  shippingCost: number;
  adminNote: string;
};

/** A product as the order form's picker shows it. */
export type PickerProduct = {
  id: string;
  name: string;
  image: string | null;
  price: number;
  stock: number;
  variants: { id: string; label: string; price: number; stock: number; image: string | null }[];
};
