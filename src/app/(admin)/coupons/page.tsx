import type { Metadata } from "next";
import { CouponManager, type CouponRow } from "@/components/coupons/CouponManager";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Coupon } from "@/lib/models/Coupon";
import { now } from "@/lib/time";

export const metadata: Metadata = { title: "Coupons" };

export default async function CouponsPage() {
  await requireStaffPage({ adminOnly: true });
  await connectToDatabase();
  const coupons = await Coupon.find().sort({ isActive: -1, createdAt: -1 }).lean();

  const rows: CouponRow[] = coupons.map((coupon) => ({
    id: String(coupon._id),
    code: coupon.code,
    type: coupon.type,
    amount: coupon.amount,
    maxDiscount: coupon.maxDiscount ?? null,
    minSubtotal: coupon.minSubtotal ?? null,
    minQuantity: coupon.minQuantity ?? null,
    freeShipping: coupon.freeShipping ?? false,
    description: coupon.description ?? "",
    startsAt: coupon.startsAt?.toISOString() ?? null,
    endsAt: coupon.endsAt?.toISOString() ?? null,
    usageLimit: coupon.usageLimit ?? null,
    usedCount: coupon.usedCount ?? 0,
    isActive: coupon.isActive ?? true,
  }));

  return (
    <>
      <PageHeader description="Discount codes customers enter at checkout. Usage is counted when an order is placed." title="Coupons" />
      <CouponManager coupons={rows} now={now()} />
    </>
  );
}
