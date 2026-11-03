import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { OrderStatus, PaymentStatus, ReviewStatus } from "@/lib/store-definitions";

const tones = {
  neutral: "bg-[#eef0f4] text-[#4f5868]",
  brand: "bg-brand-primary/10 text-brand-primary",
  gold: "bg-brand-secondary/18 text-[#7a5f17]",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
};

export type BadgeTone = keyof typeof tones;

export function Badge({
  tone = "neutral",
  dot,
  children,
  className,
}: {
  tone?: BadgeTone;
  /** Adds a leading dot, so state never relies on the text colour alone. */
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {dot && <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export const orderStatusMeta: Record<OrderStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Pending", tone: "gold" },
  confirmed: { label: "Confirmed", tone: "brand" },
  processing: { label: "Processing", tone: "info" },
  shipped: { label: "Shipped", tone: "info" },
  delivered: { label: "Delivered", tone: "good" },
  cancelled: { label: "Cancelled", tone: "bad" },
  returned: { label: "Returned", tone: "neutral" },
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const meta = orderStatusMeta[status];
  return (
    <Badge dot tone={meta.tone}>
      {meta.label}
    </Badge>
  );
}

const paymentMeta: Record<PaymentStatus, { label: string; tone: BadgeTone }> = {
  unpaid: { label: "Unpaid", tone: "warn" },
  paid: { label: "Paid", tone: "good" },
  refunded: { label: "Refunded", tone: "neutral" },
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={paymentMeta[status].tone}>{paymentMeta[status].label}</Badge>;
}

const reviewMeta: Record<ReviewStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Awaiting review", tone: "gold" },
  approved: { label: "Published", tone: "good" },
  rejected: { label: "Hidden", tone: "neutral" },
};

export function ReviewStatusBadge({ status }: { status: ReviewStatus }) {
  return (
    <Badge dot tone={reviewMeta[status].tone}>
      {reviewMeta[status].label}
    </Badge>
  );
}

export function StockBadge({ stock, threshold }: { stock: number; threshold: number }) {
  if (stock < 1) return <Badge dot tone="bad">Out of stock</Badge>;
  if (stock <= threshold) return <Badge dot tone="warn">Low · {stock}</Badge>;
  return <Badge dot tone="good">{stock} in stock</Badge>;
}
