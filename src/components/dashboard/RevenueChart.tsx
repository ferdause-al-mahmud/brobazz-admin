"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Table2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCompact, formatTaka } from "@/lib/format";

type Point = { key: string; revenue: number; orders: number };

// One series, so no legend: the card title names it. Brand navy line (2px) over a 10% wash,
// hairline grid, crosshair tooltip, and a table view for exact numbers.
const SERIES = "var(--brand-primary)";

function label(key: string, bucket: "day" | "week" | "month", long = false) {
  const date = new Date(bucket === "month" ? `${key}-01T00:00:00` : `${key}T00:00:00`);
  if (bucket === "month") return date.toLocaleDateString("en-GB", { month: long ? "long" : "short", year: long ? "numeric" : "2-digit" });
  const text = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return bucket === "week" && long ? `Week of ${text}` : text;
}

export function RevenueChart({ data, bucket }: { data: Point[]; bucket: "day" | "week" | "month" }) {
  const [showTable, setShowTable] = useState(false);
  const hasSales = data.some((point) => point.revenue > 0);

  return (
    <div>
      <div className="mb-3 flex justify-end">
        <Button aria-pressed={showTable} onClick={() => setShowTable((value) => !value)} size="xs" variant="ghost">
          {showTable ? <TrendingUp /> : <Table2 />} {showTable ? "Chart" : "Table"}
        </Button>
      </div>
      {showTable ? (
        <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface-muted text-left text-[11px] uppercase tracking-[0.06em] text-muted">
              <tr>
                <th className="px-3 py-2">{bucket === "month" ? "Month" : bucket === "week" ? "Week" : "Day"}</th>
                <th className="px-3 py-2 text-right">Orders</th>
                <th className="px-3 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...data].reverse().map((point) => (
                <tr className="border-t border-line" key={point.key}>
                  <td className="px-3 py-1.5">{label(point.key, bucket, true)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{point.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{formatTaka(point.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="relative h-72" role="img" aria-label="Revenue over time">
          {!hasSales && (
            <p className="absolute inset-0 z-10 grid place-items-center text-sm text-muted">No sales in this period yet.</p>
          )}
          <ResponsiveContainer height="100%" width="100%">
            <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--line)" strokeDasharray="0" vertical={false} />
              <XAxis
                axisLine={false}
                dataKey="key"
                interval="preserveStartEnd"
                minTickGap={24}
                stroke="var(--muted)"
                tick={{ fontSize: 11 }}
                tickFormatter={(key: string) => label(key, bucket)}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                axisLine={false}
                stroke="var(--muted)"
                tick={{ fontSize: 11 }}
                tickFormatter={(value: number) => (value >= 10_000 ? formatCompact(value) : value.toLocaleString())}
                tickLine={false}
                width={48}
              />
              <Tooltip
                content={({ active, payload }) => {
                  const point = payload?.[0]?.payload as Point | undefined;
                  if (!active || !point) return null;
                  return (
                    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
                      <p className="font-semibold text-brand-ink">{label(point.key, bucket, true)}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-brand-ink">
                        <span className="h-0.5 w-3 rounded bg-brand-primary" />
                        {formatTaka(point.revenue)}
                      </p>
                      <p className="text-muted">
                        {point.orders} order{point.orders === 1 ? "" : "s"}
                      </p>
                    </div>
                  );
                }}
                cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }}
              />
              <Area
                activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 2, fill: SERIES }}
                dataKey="revenue"
                fill={SERIES}
                fillOpacity={0.1}
                stroke={SERIES}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
