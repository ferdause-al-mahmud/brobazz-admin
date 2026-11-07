import type { Metadata } from "next";
import Link from "next/link";
import { Plus, ShoppingBag } from "lucide-react";
import type { QueryFilter } from "mongoose";
import { CustomerRecordButton } from "@/components/orders/CustomerRecord";
import { Badge, OrderStatusBadge, PaymentBadge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ClickableRow } from "@/components/ui/ClickableRow";
import { ParamSelect, SearchBox } from "@/components/ui/client";
import {
  EmptyState,
  PageHeader,
  Pagination,
  withParams,
} from "@/components/ui/Page";
import { LinkTabs } from "@/components/ui/Tabs";
import { Table, Td, Th } from "@/components/ui/Table";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { formatDate, formatTaka } from "@/lib/format";
import { Order, type OrderDocument } from "@/lib/models/Order";
import { daysAgo } from "@/lib/time";
import {
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  type OrderStatus,
} from "@/lib/store-definitions";
import { orderStatusMeta } from "@/components/ui/Badge";

export const metadata: Metadata = { title: "Orders" };

const PAGE_SIZE = 25;
const RANGES = { "7": 7, "30": 30, "90": 90 } as const;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function OrdersPage({
  searchParams,
}: PageProps<"/orders">) {
  await requireStaffPage();
  const params = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [
      key,
      Array.isArray(value) ? value[0] : value,
    ]),
  ) as Record<string, string | undefined>;

  const status =
    ORDER_STATUSES.find((value) => value === params.status) ?? null;
  const payment =
    PAYMENT_STATUSES.find((value) => value === params.payment) ?? null;
  const range =
    params.range && params.range in RANGES
      ? RANGES[params.range as keyof typeof RANGES]
      : null;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim();

  const base: QueryFilter<OrderDocument> = {};
  if (range) base.createdAt = { $gte: daysAgo(range) };
  if (payment) base.paymentStatus = payment;
  if (params.source === "admin") base.source = "admin";
  if (params.source === "website") base.source = { $ne: "admin" };
  if (q) {
    const digits = q.replace(/\D/g, "");
    const pattern = new RegExp(escapeRegex(q), "i");
    base.$or = [
      ...(digits && Number(digits) < 2 ** 31
        ? [{ orderID: Number(digits) }]
        : []),
      ...(digits.length >= 4
        ? [{ "customer.phone": new RegExp(escapeRegex(digits)) }]
        : []),
      { "customer.name": pattern },
      { "customer.email": pattern },
    ];
  }
  const filter: QueryFilter<OrderDocument> = status
    ? { ...base, status }
    : base;

  await connectToDatabase();
  const [orders, total, statusCounts] = await Promise.all([
    Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE)
      .lean(),
    Order.countDocuments(filter),
    Order.aggregate<{ _id: OrderStatus; count: number }>([
      { $match: base },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = Object.fromEntries(
    statusCounts.map(({ _id, count }) => [_id, count]),
  ) as Partial<Record<OrderStatus, number>>;
  const allCount = statusCounts.reduce((sum, { count }) => sum + count, 0);
  const href = (overrides: Record<string, string | number | undefined>) =>
    withParams("/orders", params, overrides);

  return (
    <>
      <PageHeader
        actions={
          <ButtonLink href="/orders/new">
            <Plus /> New order
          </ButtonLink>
        }
        description="Website orders and orders your team entered. Click an order to confirm it, book a courier, or cancel it."
        title="Orders"
      />
      <Card>
        <div className="border-b border-line px-5 pt-1">
          <LinkTabs
            active={status ?? "all"}
            tabs={[
              {
                value: "all",
                label: "All",
                count: allCount,
                href: href({ status: undefined, page: undefined }),
              },
              ...ORDER_STATUSES.map((value) => ({
                value,
                label: orderStatusMeta[value].label,
                count: counts[value] ?? 0,
                href: href({ status: value, page: undefined }),
              })),
            ]}
          />
        </div>
        <div className="flex flex-wrap gap-2 px-5 py-3">
          <SearchBox placeholder="Order #, phone, name or email" />
          <ParamSelect
            label="Date range"
            options={[
              { value: "", label: "All time" },
              { value: "7", label: "Last 7 days" },
              { value: "30", label: "Last 30 days" },
              { value: "90", label: "Last 90 days" },
            ]}
            param="range"
          />
          <ParamSelect
            label="Payment"
            options={[
              { value: "", label: "Any payment" },
              { value: "unpaid", label: "Unpaid" },
              { value: "paid", label: "Paid" },
              { value: "refunded", label: "Refunded" },
            ]}
            param="payment"
          />
          <ParamSelect
            label="Source"
            options={[
              { value: "", label: "All sources" },
              { value: "website", label: "Website" },
              { value: "admin", label: "Manual" },
            ]}
            param="source"
          />
        </div>

        {orders.length === 0 ? (
          <EmptyState
            description={
              q || status || range
                ? "Try a different search or filter."
                : "Orders placed on the storefront appear here."
            }
            icon={<ShoppingBag />}
            title={q || status || range ? "No orders match" : "No orders yet"}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Items</Th>
                <Th className="text-right">Total</Th>
                <Th>Payment</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const units = order.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );
                return (
                  <ClickableRow
                    href={`/orders/${order.orderID}`}
                    key={order.orderID}
                  >
                    <Td>
                      <Link
                        className="font-bold text-brand-primary hover:underline"
                        href={`/orders/${order.orderID}`}
                      >
                        #{order.orderID}
                      </Link>
                      <span className="block text-xs text-muted">
                        {formatDate(order.createdAt, true)}
                      </span>
                      {order.exchangeOf ? (
                        <Badge className="mt-1" tone="gold">
                          Exchange · #{order.exchangeOf}
                        </Badge>
                      ) : (
                        order.source === "admin" && (
                          <Badge className="mt-1" tone="gold">
                            Manual{order.channel ? ` · ${order.channel}` : ""}
                          </Badge>
                        )
                      )}
                    </Td>
                    <Td>
                      <span className="block font-semibold">
                        {order.customer.name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted">
                        {order.customer.phone}
                        {!order.user && order.source !== "admin" && " · guest"}
                        <CustomerRecordButton
                          compact
                          phone={order.customer.phone}
                        />
                      </span>
                    </Td>
                    <Td className="max-w-56">
                      <span className="block truncate">
                        {order.items.map((item) => item.name).join(", ")}
                      </span>
                      <span className="text-xs text-muted">
                        {units} unit{units === 1 ? "" : "s"} ·{" "}
                        {order.shippingLabel ?? order.shippingOption}
                      </span>
                    </Td>
                    <Td className="text-right font-semibold tabular-nums">
                      {formatTaka(order.total)}
                      {(order.advancePaid ?? 0) > 0 && order.paymentStatus !== "paid" && (
                        <span className="block text-xs font-normal text-muted">
                          {formatTaka(order.advancePaid ?? 0)} advance
                        </span>
                      )}
                    </Td>
                    <Td>
                      <PaymentBadge status={order.paymentStatus} />
                    </Td>
                    <Td>
                      <OrderStatusBadge status={order.status} />
                      {order.courier?.provider && (
                        <span className="mt-1 block text-[11px] text-muted">
                          {order.courier.name} · {order.courier.trackingNumber}
                        </span>
                      )}
                    </Td>
                  </ClickableRow>
                );
              })}
            </tbody>
          </Table>
        )}
        <Pagination
          hrefFor={(next) => href({ page: next })}
          page={page}
          pageSize={PAGE_SIZE}
          total={total}
          totalPages={Math.ceil(total / PAGE_SIZE)}
        />
      </Card>
    </>
  );
}
