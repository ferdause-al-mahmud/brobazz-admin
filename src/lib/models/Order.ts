import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { ORDER_STATUSES, PAYMENT_STATUSES } from "@/lib/store-definitions";

// Identical in customer/lib/models/Order.ts — change both together.

const optionValueSchema = new Schema(
  {
    name: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const orderItemSchema = new Schema(
  {
    productId: { type: String, required: true },
    // The product variant bought (its _id as a string); absent for products without variants.
    variantId: { type: String },
    sku: { type: String },
    name: { type: String, required: true },
    // The chosen option values, e.g. [{ name: "Size", value: "M" }, { name: "Color", value: "Black" }].
    options: { type: [optionValueSchema], default: [] },
    // "M / Black". Kept with the order so it reads the same even if the product changes.
    variantLabel: { type: String },
    // Older orders, from before variants, stored a size here.
    selectedSize: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    // Unit price charged, copied at order time so later price changes don't rewrite history.
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
  },
  { _id: false },
);

// An item the customer sends back in an exchange (a copy of the line from the original order).
const exchangeReturnSchema = new Schema(
  {
    // Position of the line in the original order's items.
    itemIndex: { type: Number, required: true, min: 0 },
    productId: { type: String, required: true },
    variantId: { type: String },
    sku: { type: String },
    name: { type: String, required: true },
    variantLabel: { type: String },
    quantity: { type: Number, required: true, min: 1 },
    // Unit price the customer paid for it, credited against the replacement.
    price: { type: Number, required: true, min: 0 },
    image: { type: String },
  },
  { _id: false },
);

const customerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String, required: true },
    address: { type: String, required: true },
    notes: { type: String },
  },
  { _id: false },
);

const statusChangeSchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    note: { type: String },
    // Staff member's name, or "customer" / "system".
    by: { type: String },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderID: { type: Number, required: true, unique: true },
    // Lets a guest view their order without an account; never expose it in lists.
    trackingToken: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },
    customer: { type: customerSchema, required: true },
    items: { type: [orderItemSchema], required: true },
    // Value of one of the store's shipping options at order time (see StoreSettings).
    shippingOption: { type: String, required: true },
    shippingLabel: { type: String },
    paymentOption: { type: String, enum: ["cash"], required: true },
    subtotal: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    couponCode: { type: String },
    couponDiscount: { type: Number, default: 0 },
    couponFreeShipping: { type: Boolean, default: false },
    // Extra discount a staff member gave on a manual order.
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true },
    // Paid before delivery (e.g. bKash for an outside-Dhaka order). The courier collects total − advancePaid.
    // Revenue still counts the full total once the order is delivered.
    advancePaid: { type: Number, default: 0, min: 0 },
    // "website" for storefront checkouts, "admin" for orders entered by staff.
    source: { type: String, enum: ["website", "admin"], default: "website", index: true },
    // Where a manual order came from, e.g. "Facebook", "Phone", "WhatsApp".
    channel: { type: String },
    // Staff member who entered a manual order.
    createdBy: { type: String },
    status: { type: String, enum: ORDER_STATUSES, default: "pending", required: true, index: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid", required: true },
    statusHistory: { type: [statusChangeSchema], default: [] },
    // When the order was marked delivered. Revenue is counted on this date.
    deliveredAt: { type: Date, index: true },
    courier: {
      // Free text for couriers without an integration; "Pathao" / "Steadfast" when booked from the admin.
      name: { type: String },
      provider: { type: String, enum: ["pathao", "steadfast"] },
      // Consignment ID returned by the courier.
      trackingNumber: { type: String },
      trackingUrl: { type: String },
      bookedAt: { type: Date },
      deliveryFee: { type: Number },
      // Last status reported by the courier, as they word it.
      status: { type: String },
      statusCheckedAt: { type: Date },
    },
    // Internal note, only shown in the admin panel.
    adminNote: { type: String },
    // Set once the items went back into stock (cancelled/returned), so it never happens twice.
    restockedAt: { type: Date },
    // Exchange orders: the delivered order this one replaces items from, what comes back from it, and
    // the value of those items credited against this order (so revenue only counts the difference).
    exchangeOf: { type: Number, index: true },
    exchangeReturns: { type: [exchangeReturnSchema], default: undefined },
    exchangeCredit: { type: Number, default: 0, min: 0 },
    // Set when the exchange is delivered and the old items are back with us; resellable ones go back into stock.
    exchangeReturnedAt: { type: Date },
    exchangeReturnResellable: { type: Boolean },
  },
  { timestamps: true },
);

orderSchema.index({ createdAt: -1 });

export type OrderDocument = InferSchemaType<typeof orderSchema>;

const createOrderModel = () => model("Order", orderSchema);

export const Order =
  (models.Order as ReturnType<typeof createOrderModel> | undefined) ?? createOrderModel();
