"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/lib/models/Coupon";
import { COUPON_TYPES, type CouponType } from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

// Coupons are read fresh at checkout, so the storefront needs no cache refresh.

export type CouponInput = {
  code: string;
  type: CouponType;
  amount: number;
  maxDiscount: number | null;
  minSubtotal: number | null;
  minQuantity: number | null;
  freeShipping: boolean;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  isActive: boolean;
};

export async function saveCoupon(input: CouponInput, id: string | null) {
  return runAction(async () => {
    await requireStaff({ adminOnly: true });
    const errors: Record<string, string> = {};
    const code = input.code.trim().toUpperCase().replace(/\s+/g, "");
    if (!/^[A-Z0-9_-]{3,24}$/.test(code)) errors.code = "Use 3–24 letters, numbers, dashes or underscores";
    if (!COUPON_TYPES.includes(input.type)) errors.type = "Choose a discount type";
    if (!Number.isFinite(input.amount) || input.amount < 0) errors.amount = "Enter 0 or more";
    if (input.type === "PERCENTAGE" && input.amount > 100) errors.amount = "A percentage can't be over 100";
    if (input.amount === 0 && !input.freeShipping) errors.amount = "Give a discount, free delivery, or both";
    const startsAt = input.startsAt ? new Date(input.startsAt) : null;
    const endsAt = input.endsAt ? new Date(input.endsAt) : null;
    if (startsAt && endsAt && endsAt <= startsAt) errors.endsAt = "End must be after the start";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    const positive = (value: number | null) => (value && value > 0 ? Math.round(value) : null);
    const fields = {
      code,
      type: input.type,
      amount: input.amount,
      maxDiscount: input.type === "PERCENTAGE" ? positive(input.maxDiscount) : null,
      minSubtotal: positive(input.minSubtotal),
      minQuantity: positive(input.minQuantity),
      freeShipping: input.freeShipping,
      description: input.description.trim(),
      startsAt,
      endsAt,
      usageLimit: positive(input.usageLimit),
      isActive: input.isActive,
    };

    await connectToDatabase();
    if (await Coupon.exists({ code, ...(id ? { _id: { $ne: id } } : {}) })) {
      throw new InputError("That code is already used", { code: "Already used" });
    }
    if (id) await Coupon.updateOne({ _id: id }, { $set: fields }, { runValidators: true });
    else await Coupon.create(fields);
    revalidatePath("/coupons");
  }, id ? "Coupon saved" : "Coupon created");
}

export async function setCouponActive(id: string, isActive: boolean) {
  return runAction(async () => {
    await requireStaff({ adminOnly: true });
    await connectToDatabase();
    await Coupon.updateOne({ _id: id }, { $set: { isActive } });
    revalidatePath("/coupons");
  }, isActive ? "Coupon turned on" : "Coupon turned off");
}

export async function deleteCoupon(id: string) {
  return runAction(async () => {
    await requireStaff({ adminOnly: true });
    await connectToDatabase();
    await Coupon.deleteOne({ _id: id });
    revalidatePath("/coupons");
  }, "Coupon deleted");
}
