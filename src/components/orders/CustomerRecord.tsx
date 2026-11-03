"use client";

import { useState, useTransition } from "react";
import { Gauge, LoaderCircle, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/client";
import { checkCustomerRecord, type CustomerRecord } from "@/lib/actions/couriers";
import { cn } from "@/lib/cn";

// Status colours with text labels (never colour alone): ≥80% good, ≥60% caution, below that risky.
function tone(rate: number | null) {
  if (rate === null) return { text: "text-muted", bar: "bg-line-strong", label: "No history" };
  if (rate >= 80) return { text: "text-good", bar: "bg-good", label: "Reliable" };
  if (rate >= 60) return { text: "text-warn", bar: "bg-warn", label: "Some returns" };
  return { text: "text-bad", bar: "bg-bad", label: "High return risk" };
}

function RateBlock({
  title,
  rate,
  stats,
  footnote,
}: {
  title: string;
  rate: number | null;
  stats: { label: string; value: number | string }[];
  footnote?: string;
}) {
  const t = tone(rate);
  return (
    <section className="rounded-xl border border-line p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-bold text-brand-ink">{title}</h3>
        <span className={cn("text-xs font-semibold", t.text)}>{t.label}</span>
      </div>
      <p className={cn("mt-2 text-3xl font-bold tabular-nums", t.text)}>{rate === null ? "—" : `${rate.toFixed(0)}%`}</p>
      <p className="text-xs text-muted">delivered successfully</p>
      <div className="mt-2 h-2 rounded-full bg-surface-muted">
        <div className={cn("h-2 rounded-full", t.bar)} style={{ width: `${rate === null ? 0 : Math.max(2, Math.min(100, rate))}%` }} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
        {stats.map((stat) => (
          <div className="rounded-lg bg-surface-muted py-1.5" key={stat.label}>
            <dd className="text-sm font-bold tabular-nums text-brand-ink">{stat.value}</dd>
            <dt className="text-[11px] text-muted">{stat.label}</dt>
          </div>
        ))}
      </dl>
      {footnote && <p className="mt-2 text-[11px] text-muted">{footnote}</p>}
    </section>
  );
}

function Unavailable({ title, error }: { title: string; error: string }) {
  return (
    <section className="rounded-xl border border-dashed border-line-strong p-4">
      <h3 className="text-sm font-bold text-brand-ink">{title}</h3>
      <p className="mt-1 text-xs text-muted">{error}</p>
    </section>
  );
}

const ratingLabels: Record<string, string> = {
  excellent_customer: "Excellent customer",
  good_customer: "Good customer",
  new_customer: "New customer",
  risky_customer: "Risky customer",
};

/** "Success rate" button: this phone's delivery record here, on Pathao and on Steadfast. */
export function CustomerRecordButton({ phone, compact }: { phone: string; compact?: boolean }) {
  const [record, setRecord] = useState<CustomerRecord | null>(null);
  const [loading, startLoading] = useTransition();

  const check = () =>
    startLoading(async () => {
      const result = await checkCustomerRecord(phone);
      if (!result.ok) toast.error(result.error);
      else setRecord(result.data);
    });

  const storeFinished = record ? record.store.delivered + record.store.returned : 0;

  return (
    <>
      <Button
        aria-label={`Check delivery record for ${phone}`}
        disabled={loading}
        onClick={check}
        size={compact ? "xs" : "sm"}
        title="Delivery success rate"
        variant={compact ? "ghost" : "secondary"}
      >
        {loading ? <LoaderCircle className="animate-spin" /> : <Gauge />}
        {compact ? "Rate" : "Check success rate"}
      </Button>
      <Modal
        description={`How orders to ${record?.phone ?? phone} have gone, here and across couriers.`}
        onClose={() => setRecord(null)}
        open={record !== null}
        size="lg"
        title="Customer delivery record"
      >
        {record && (
          <div className="grid gap-4 md:grid-cols-3">
            <RateBlock
              footnote={record.store.cancelled ? `${record.store.cancelled} cancelled before shipping` : undefined}
              rate={storeFinished ? (record.store.delivered / storeFinished) * 100 : null}
              stats={[
                { label: "Orders", value: record.store.total },
                { label: "Delivered", value: record.store.delivered },
                { label: "Returned", value: record.store.returned },
              ]}
              title="This store"
            />

            {!record.pathao.ok ? (
              <Unavailable error={record.pathao.error} title="Pathao" />
            ) : record.pathao.kind === "count" ? (
              <RateBlock
                rate={record.pathao.total ? record.pathao.successRate : null}
                stats={[
                  { label: "Parcels", value: record.pathao.total },
                  { label: "Delivered", value: record.pathao.delivered },
                  { label: "Returned", value: record.pathao.returned },
                ]}
                title="Pathao"
              />
            ) : (
              <section className="rounded-xl border border-line p-4">
                <h3 className="text-sm font-bold text-brand-ink">Pathao</h3>
                <p className="mt-3 text-xl font-bold text-brand-ink">
                  {ratingLabels[record.pathao.rating] ?? record.pathao.rating.replaceAll("_", " ")}
                </p>
                <p className="text-xs text-muted">Pathao shares a rating instead of counts for this number.</p>
              </section>
            )}

            {!record.steadfast.ok ? (
              <Unavailable error={record.steadfast.error} title="Steadfast" />
            ) : (
              <section>
                <RateBlock
                  footnote="Shared history across Steadfast merchants; finished parcels only."
                  rate={record.steadfast.deliveryRatio}
                  stats={[
                    { label: "Cancelled", value: record.steadfast.cancellationRatio === null ? "—" : `${record.steadfast.cancellationRatio}%` },
                    { label: "Volume", value: record.steadfast.volumeBand?.replaceAll("_", " ") ?? "—" },
                    { label: "Reports", value: record.steadfast.totalReports ?? 0 },
                  ]}
                  title="Steadfast"
                />
                {record.steadfast.fraudCategories.length > 0 && (
                  <div className="mt-2 rounded-lg bg-bad-soft p-3 text-xs text-bad">
                    <p className="flex items-center gap-1.5 font-semibold">
                      <ShieldAlert className="size-3.5" /> Reported by merchants
                    </p>
                    <ul className="mt-1 grid gap-0.5">
                      {record.steadfast.fraudCategories.map(([category, count]) => (
                        <li key={category}>
                          {category.replaceAll("_", " ")}: {count}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
