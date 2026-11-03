import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Boxes, MessageSquareText, ShieldAlert, ShoppingBag } from "lucide-react";
import { RevenueChart } from "@/components/dashboard/RevenueChart";
import { OrderStatusBadge, StockBadge, orderStatusMeta } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ParamSelect } from "@/components/ui/client";
import { EmptyState, PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { DASHBOARD_RANGES, getDashboard, type DashboardRange } from "@/lib/data/dashboard";
import { formatDate, formatTaka } from "@/lib/format";
import { ORDER_STATUSES, PRODUCT_TYPES, productTypeLabels } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "Dashboard" };

function Delta({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (!previous) return <span className="text-xs text-muted">No data for the {label}</span>;
  const change = ((current - previous) / previous) * 100;
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-1 text-xs">
      <span className={cn("inline-flex items-center gap-0.5 font-semibold", up ? "text-good" : "text-bad")}>
        <Icon aria-hidden="true" className="size-3.5" />
        {up ? "+" : "−"}
        {Math.abs(change).toFixed(change > -10 && change < 10 ? 1 : 0)}%
      </span>
      <span className="text-muted">vs {label}</span>
    </span>
  );
}

function StatTile({
  label,
  value,
  current,
  previous,
  periodLabel,
}: {
  label: string;
  value: string;
  current: number;
  previous: number;
  periodLabel: string;
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-muted">{label}</p>
      <p className="mt-1.5 text-2xl font-bold tracking-[-0.02em] text-brand-ink tabular-nums">{value}</p>
      <div className="mt-2">
        <Delta current={current} label={periodLabel} previous={previous} />
      </div>
    </Card>
  );
}

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireStaffPage();
  const params = await searchParams;
  const range: DashboardRange = typeof params.range === "string" && params.range in DASHBOARD_RANGES ? (params.range as DashboardRange) : "30d";
  const data = await getDashboard(range);
  const period = `previous ${DASHBOARD_RANGES[range].label.replace("Last ", "")}`;
  const statusTotal = Object.values(data.byStatus).reduce((sum, count) => sum + (count ?? 0), 0);
  const maxStatus = Math.max(1, ...Object.values(data.byStatus).map((count) => count ?? 0));
  const typeTotal = PRODUCT_TYPES.reduce((sum, type) => sum + (data.byType[type] ?? 0), 0);
  const hour = Number(new Date().toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "Asia/Dhaka" }));
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <>
      {params.denied && (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn" role="status">
          <ShieldAlert className="size-4" /> That page is only available to admins.
        </p>
      )}
      <PageHeader
        actions={
          <ParamSelect
            label="Date range"
            options={Object.entries(DASHBOARD_RANGES).map(([value, { label }]) => ({ value: value === "30d" ? "" : value, label }))}
            param="range"
          />
        }
        description="Revenue counts delivered orders only, on the day they were delivered."
        title={`${greeting}, ${user.name.split(" ")[0]}`}
      />

      {(data.pendingOrders > 0 || data.pendingReviews > 0 || data.lowStock.length > 0) && (
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          {[
            { show: data.pendingOrders > 0, href: "/orders?status=pending", icon: ShoppingBag, text: `${data.pendingOrders} order${data.pendingOrders === 1 ? "" : "s"} to confirm` },
            { show: data.pendingReviews > 0, href: "/reviews?status=pending", icon: MessageSquareText, text: `${data.pendingReviews} review${data.pendingReviews === 1 ? "" : "s"} to moderate` },
            { show: data.lowStock.length > 0, href: "/products/stock?view=low", icon: Boxes, text: "Products running low on stock" },
          ]
            .filter((item) => item.show)
            .map(({ href, icon: Icon, text }) => (
              <Link
                className="group flex items-center gap-3 rounded-xl border border-brand-secondary/40 bg-brand-secondary/10 px-4 py-3 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand-secondary/20"
                href={href}
                key={href}
              >
                <Icon aria-hidden="true" className="size-4 text-[#8a6a1f]" />
                <span className="flex-1">{text}</span>
                <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile current={data.current.revenue} label="Revenue" periodLabel={period} previous={data.previous.revenue} value={formatTaka(data.current.revenue)} />
        <StatTile current={data.current.orders} label="Delivered orders" periodLabel={period} previous={data.previous.orders} value={data.current.orders.toLocaleString()} />
        <StatTile current={data.current.aov} label="Average delivered order" periodLabel={period} previous={data.previous.aov} value={formatTaka(data.current.aov)} />
        <StatTile current={data.current.customers} label="New customer accounts" periodLabel={period} previous={data.previous.customers} value={data.current.customers.toLocaleString()} />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader description={`${DASHBOARD_RANGES[range].label}, ${data.bucket === "day" ? "per day" : data.bucket === "week" ? "per week" : "per month"}`} title="Revenue" />
          <CardBody className="pt-2">
            <RevenueChart bucket={data.bucket} data={data.trend} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader description={`${statusTotal} order${statusTotal === 1 ? "" : "s"} placed in this period`} title="Orders by status" />
          <CardBody>
            <ul className="grid gap-3">
              {ORDER_STATUSES.map((status) => {
                const count = data.byStatus[status] ?? 0;
                return (
                  <li key={status}>
                    <Link className="group grid grid-cols-[96px_minmax(0,1fr)_36px] items-center gap-3 text-sm" href={`/orders?status=${status}`}>
                      <span className="text-muted group-hover:text-brand-ink">{orderStatusMeta[status].label}</span>
                      <span className="h-2 rounded-full bg-surface-muted">
                        <span
                          className="block h-2 rounded-full bg-brand-primary transition-[width]"
                          style={{ width: count ? `${Math.max(4, (count / maxStatus) * 100)}%` : 0 }}
                        />
                      </span>
                      <span className="text-right font-semibold tabular-nums text-brand-ink">{count}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
            {typeTotal > 0 && (
              <div className="mt-6 border-t border-line pt-4">
                <p className="text-xs font-semibold text-muted">Sales by product type</p>
                <dl className="mt-2 grid grid-cols-2 gap-3">
                  {PRODUCT_TYPES.map((type) => (
                    <div key={type}>
                      <dt className="text-xs text-muted">{productTypeLabels[type]}</dt>
                      <dd className="text-lg font-bold tabular-nums text-brand-ink">
                        {formatTaka(data.byType[type] ?? 0)}
                        <span className="ml-1.5 text-xs font-semibold text-muted">{Math.round(((data.byType[type] ?? 0) / typeTotal) * 100)}%</span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader actions={<ButtonLink href="/products?sort=best-selling" size="xs" variant="ghost">All</ButtonLink>} description="By delivered revenue in this period" title="Top products" />
          {data.topProducts.length === 0 ? (
            <EmptyState className="py-10" icon={<ShoppingBag />} title="No sales yet" />
          ) : (
            <ol className="divide-y divide-line">
              {data.topProducts.map((product, index) => (
                <li className="flex items-center gap-3 px-5 py-2.5" key={product._id}>
                  <span className="w-4 text-xs font-bold text-subtle">{index + 1}</span>
                  <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
                    {product.image && <Image alt="" className="object-cover" fill sizes="36px" src={product.image} />}
                  </span>
                  <Link className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-brand-primary" href={`/products/${encodeURIComponent(product._id)}`}>
                    {product.name}
                  </Link>
                  <span className="text-right text-xs">
                    <span className="block font-semibold tabular-nums text-brand-ink">{formatTaka(product.revenue)}</span>
                    <span className="text-muted">{product.units} sold</span>
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <Card>
          <CardHeader actions={<ButtonLink href="/orders" size="xs" variant="ghost">All</ButtonLink>} title="Recent orders" />
          {data.recentOrders.length === 0 ? (
            <EmptyState className="py-10" icon={<ShoppingBag />} title="No orders yet" />
          ) : (
            <ul className="divide-y divide-line">
              {data.recentOrders.map((order) => (
                <li key={order.orderID}>
                  <Link className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-muted/70" href={`/orders/${order.orderID}`}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">
                        #{order.orderID} · {order.name}
                      </span>
                      <span className="text-xs text-muted">{formatDate(order.createdAt, true)}</span>
                    </span>
                    <span className="grid justify-items-end gap-1">
                      <span className="text-sm font-semibold tabular-nums">{formatTaka(order.total)}</span>
                      <OrderStatusBadge status={order.status} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader actions={<ButtonLink href="/products/stock?view=low" size="xs" variant="ghost">Stock</ButtonLink>} title="Low stock" />
          {data.lowStock.length === 0 ? (
            <EmptyState className="py-10" description="Every product is above its alert level." icon={<Boxes />} title="All stocked up" />
          ) : (
            <ul className="divide-y divide-line">
              {data.lowStock.map((product) => (
                <li key={product.id}>
                  <Link className="flex items-center gap-3 px-5 py-2.5 hover:bg-surface-muted/70" href={`/products/${encodeURIComponent(product.id)}`}>
                    <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
                      {product.image && <Image alt="" className="object-cover" fill sizes="36px" src={product.image} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{product.name}</span>
                    <StockBadge stock={product.stock} threshold={product.threshold} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
