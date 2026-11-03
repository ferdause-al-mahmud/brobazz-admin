import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { COUPON_TYPES } from "@/lib/store-definitions";

// Identical in customer/lib/models/Coupon.ts — change both together.
const couponSchema = new Schema(
  {
    // Stored normalized: upper case, no spaces.
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    type: { type: String, enum: COUPON_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    maxDiscount: { type: Number, min: 0, default: null },
    minSubtotal: { type: Number, min: 0, default: null },
    minQuantity: { type: Number, min: 0, default: null },
    freeShipping: { type: Boolean, default: false },
    description: { type: String, default: "" },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    // Total redemptions allowed; null for unlimited. `usedCount` is incremented when an order is placed.
    usageLimit: { type: Number, min: 0, default: null },
    usedCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type CouponDocument = InferSchemaType<typeof couponSchema>;

const createCouponModel = () => model("Coupon", couponSchema);

export const Coupon =
  (models.Coupon as ReturnType<typeof createCouponModel> | undefined) ?? createCouponModel();
