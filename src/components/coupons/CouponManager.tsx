"use client";

import { useState } from "react";
import { Pencil, Plus, TicketPercent, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field, Input, PrefixInput, Select, Switch } from "@/components/ui/Field";
import { ConfirmButton, Modal, useAction } from "@/components/ui/client";
import { EmptyState } from "@/components/ui/Page";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { deleteCoupon, saveCoupon, setCouponActive, type CouponInput } from "@/lib/actions/coupons";
import { formatDate, formatTaka } from "@/lib/format";

export type CouponRow = CouponInput & { id: string; usedCount: number };

const blank: CouponInput = {
  code: "",
  type: "PERCENTAGE",
  amount: 10,
  maxDiscount: null,
  minSubtotal: null,
  minQuantity: null,
  freeShipping: false,
  description: "",
  startsAt: null,
  endsAt: null,
  usageLimit: null,
  isActive: true,
};

function summary(coupon: CouponInput) {
  const parts = [];
  if (coupon.amount > 0) {
    parts.push(
      coupon.type === "PERCENTAGE"
        ? `${coupon.amount}% off${coupon.maxDiscount ? ` (max ${formatTaka(coupon.maxDiscount)})` : ""}`
        : `${formatTaka(coupon.amount)} off`,
    );
  }
  if (coupon.freeShipping) parts.push("free delivery");
  const conditions = [];
  if (coupon.minSubtotal) conditions.push(`orders over ${formatTaka(coupon.minSubtotal)}`);
  if (coupon.minQuantity) conditions.push(`${coupon.minQuantity}+ items`);
  return `${parts.join(" + ")}${conditions.length ? ` on ${conditions.join(", ")}` : ""}`;
}

function status(coupon: CouponRow, now: number) {
  if (!coupon.isActive) return <Badge dot>Off</Badge>;
  if (coupon.startsAt && Date.parse(coupon.startsAt) > now) return <Badge dot tone="info">Scheduled</Badge>;
  if (coupon.endsAt && Date.parse(coupon.endsAt) < now) return <Badge dot>Expired</Badge>;
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return <Badge dot tone="warn">Used up</Badge>;
  return <Badge dot tone="good">Active</Badge>;
}

const toLocal = (iso: string | null) =>
  iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60_000).toISOString().slice(0, 16) : "";
const fromLocal = (value: string) => (value ? new Date(value).toISOString() : null);
const numberOrNull = (value: string) => (value === "" ? null : Number(value));

export function CouponManager({ coupons, now }: { coupons: CouponRow[]; now: number }) {
  const [editing, setEditing] = useState<{ id: string | null; input: CouponInput } | null>(null);
  const { pending, run } = useAction();

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setEditing({ id: null, input: blank })}>
          <Plus /> New coupon
        </Button>
      </div>
      <Card>
        {coupons.length === 0 ? (
          <EmptyState description="Customers enter the code at checkout." icon={<TicketPercent />} title="No coupons yet" />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Code</Th>
                <Th>Discount</Th>
                <Th>Used</Th>
                <Th>Valid</Th>
                <Th>Status</Th>
                <Th className="w-0" />
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <Tr key={coupon.id}>
                  <Td>
                    <span className="rounded-md bg-brand-ink px-2 py-1 font-mono text-xs font-bold tracking-wider text-white">{coupon.code}</span>
                    {coupon.description && <span className="mt-1 block text-xs text-muted">{coupon.description}</span>}
                  </Td>
                  <Td className="max-w-72">{summary(coupon)}</Td>
                  <Td className="tabular-nums">
                    {coupon.usedCount}
                    {coupon.usageLimit ? <span className="text-muted"> / {coupon.usageLimit}</span> : null}
                  </Td>
                  <Td className="text-xs text-muted">
                    {coupon.startsAt || coupon.endsAt
                      ? `${coupon.startsAt ? formatDate(coupon.startsAt) : "Now"} – ${coupon.endsAt ? formatDate(coupon.endsAt) : "no end"}`
                      : "Always"}
                  </Td>
                  <Td>{status(coupon, now)}</Td>
                  <Td>
                    <div className="flex items-center justify-end gap-1">
                      <label className="mr-1 inline-flex cursor-pointer items-center" title={coupon.isActive ? "Turn off" : "Turn on"}>
                        <input
                          aria-label={`${coupon.code} active`}
                          checked={coupon.isActive}
                          className="size-4 accent-brand-primary"
                          disabled={pending}
                          onChange={(event) => run(() => setCouponActive(coupon.id, event.target.checked))}
                          type="checkbox"
                        />
                      </label>
                      <Button aria-label={`Edit ${coupon.code}`} onClick={() => setEditing({ id: coupon.id, input: coupon })} size="icon" variant="ghost">
                        <Pencil />
                      </Button>
                      <ConfirmButton action={() => deleteCoupon(coupon.id)} aria-label={`Delete ${coupon.code}`} description="Past orders keep the discount they got." size="icon" title={`Delete ${coupon.code}?`}>
                        <Trash2 />
                      </ConfirmButton>
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
      {editing && <CouponDialog editing={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

function CouponDialog({ editing, onClose }: { editing: { id: string | null; input: CouponInput }; onClose: () => void }) {
  const [input, setInput] = useState(editing.input);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { pending, run } = useAction();
  const update = (patch: Partial<CouponInput>) => setInput((current) => ({ ...current, ...patch }));

  return (
    <Modal
      description={summary(input) || "Set a discount"}
      footer={
        <>
          <Button onClick={onClose} variant="secondary">
            Cancel
          </Button>
          <Button
            loading={pending}
            onClick={() =>
              run(
                async () => {
                  const result = await saveCoupon(input, editing.id);
                  if (!result.ok) setErrors(result.fieldErrors ?? {});
                  return result;
                },
                { onSuccess: onClose },
              )
            }
          >
            Save coupon
          </Button>
        </>
      }
      onClose={onClose}
      open
      size="lg"
      title={editing.id ? `Edit ${editing.input.code}` : "New coupon"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field error={errors.code} htmlFor="coupon-code" label="Code">
          <Input autoFocus className="font-mono uppercase" id="coupon-code" onChange={(event) => update({ code: event.target.value.toUpperCase() })} placeholder="EID20" value={input.code} />
        </Field>
        <Field hint="Shown to the customer when the code is applied." htmlFor="coupon-description" label="Description" optional>
          <Input id="coupon-description" onChange={(event) => update({ description: event.target.value })} value={input.description} />
        </Field>
        <Field htmlFor="coupon-type" label="Discount type">
          <Select id="coupon-type" onChange={(event) => update({ type: event.target.value as CouponInput["type"] })} value={input.type}>
            <option value="PERCENTAGE">Percentage of subtotal</option>
            <option value="FLAT">Fixed amount</option>
          </Select>
        </Field>
        <Field error={errors.amount} htmlFor="coupon-amount" label={input.type === "PERCENTAGE" ? "Percent off" : "Amount off"}>
          {input.type === "PERCENTAGE" ? (
            <Input id="coupon-amount" max={100} min={0} onChange={(event) => update({ amount: Number(event.target.value) })} type="number" value={input.amount} />
          ) : (
            <PrefixInput id="coupon-amount" min={0} onChange={(event) => update({ amount: Number(event.target.value) })} prefix="৳" type="number" value={input.amount} />
          )}
        </Field>
        {input.type === "PERCENTAGE" && (
          <Field htmlFor="coupon-max" label="Maximum discount" optional>
            <PrefixInput id="coupon-max" min={0} onChange={(event) => update({ maxDiscount: numberOrNull(event.target.value) })} prefix="৳" type="number" value={input.maxDiscount ?? ""} />
          </Field>
        )}
        <div className="flex items-end sm:col-span-1">
          <Switch checked={input.freeShipping} className="w-full rounded-lg border border-line p-3" label="Free delivery" onChange={(event) => update({ freeShipping: event.target.checked })} />
        </div>
        <Field htmlFor="coupon-min" label="Minimum subtotal" optional>
          <PrefixInput id="coupon-min" min={0} onChange={(event) => update({ minSubtotal: numberOrNull(event.target.value) })} prefix="৳" type="number" value={input.minSubtotal ?? ""} />
        </Field>
        <Field htmlFor="coupon-qty" label="Minimum items" optional>
          <Input id="coupon-qty" min={0} onChange={(event) => update({ minQuantity: numberOrNull(event.target.value) })} type="number" value={input.minQuantity ?? ""} />
        </Field>
        <Field htmlFor="coupon-start" label="Starts" optional>
          <Input id="coupon-start" onChange={(event) => update({ startsAt: fromLocal(event.target.value) })} type="datetime-local" value={toLocal(input.startsAt)} />
        </Field>
        <Field error={errors.endsAt} htmlFor="coupon-end" label="Ends" optional>
          <Input id="coupon-end" onChange={(event) => update({ endsAt: fromLocal(event.target.value) })} type="datetime-local" value={toLocal(input.endsAt)} />
        </Field>
        <Field hint="Total uses across all customers." htmlFor="coupon-limit" label="Usage limit" optional>
          <Input id="coupon-limit" min={0} onChange={(event) => update({ usageLimit: numberOrNull(event.target.value) })} type="number" value={input.usageLimit ?? ""} />
        </Field>
        <div className="flex items-end">
          <Switch checked={input.isActive} className="w-full rounded-lg border border-line p-3" label="Active" onChange={(event) => update({ isActive: event.target.checked })} />
        </div>
      </div>
    </Modal>
  );
}
