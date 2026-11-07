"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, PrefixInput, Select, Textarea } from "@/components/ui/Field";
import { createManualOrder, findCustomerByPhone } from "@/lib/actions/manual-orders";
import { cn } from "@/lib/cn";
import { formatTaka } from "@/lib/format";
import { ORDER_CHANNELS, type ManualOrderInput, type PickerProduct } from "@/lib/manual-order";
import { CustomerRecordButton } from "./CustomerRecord";
import { ProductLinesEditor, type ProductLine } from "./ProductLinesEditor";
type ShippingChoice = { value: string; label: string; cost: number };

export function ManualOrderForm({ products, shippingOptions }: { products: PickerProduct[]; shippingOptions: ShippingChoice[] }) {
  const router = useRouter();
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [returning, setReturning] = useState<{ orders: number; hasAccount: boolean } | null>(null);
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [shippingOption, setShippingOption] = useState(shippingOptions[0]?.value ?? "custom");
  const [shippingCost, setShippingCost] = useState(shippingOptions[0]?.cost ?? 0);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<ManualOrderInput["status"]>("confirmed");
  const [paymentStatus, setPaymentStatus] = useState<ManualOrderInput["paymentStatus"]>("unpaid");
  const [advance, setAdvance] = useState(0);
  const [channel, setChannel] = useState<string>("Phone");
  const [adminNote, setAdminNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [, startLookup] = useTransition();

  const setField = (field: keyof typeof customer, value: string) => setCustomer((current) => ({ ...current, [field]: value }));

  const lookUp = (phone: string) => {
    if (phone.replace(/\D/g, "").length < 11) return;
    startLookup(async () => {
      const result = await findCustomerByPhone(phone);
      if (!result.ok || !result.data) {
        setReturning(null);
        return;
      }
      const found = result.data;
      setReturning({ orders: found.orders, hasAccount: found.hasAccount });
      // Fill only what hasn't been typed yet.
      setCustomer((current) => ({
        ...current,
        name: current.name || found.name,
        email: current.email || found.email,
        address: current.address || found.address,
      }));
    });
  };

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = Math.max(0, subtotal - Math.min(discount, subtotal) + shippingCost);
  const advancePaid = paymentStatus === "paid" ? total : Math.min(advance, total);

  const submit = () =>
    startSaving(async () => {
      const result = await createManualOrder({
        customer,
        items: lines.map(({ productId, variantId, quantity, price }) => ({ productId, variantId, quantity, price })),
        shippingOption,
        shippingCost,
        discount,
        status,
        paymentStatus,
        advance: paymentStatus === "paid" ? 0 : advance,
        channel,
        adminNote,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(`Order #${result.data} created`);
      router.push(`/orders/${result.data}`);
    });

  return (
    <form
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className="grid min-w-0 gap-6">
        <Card>
          <CardHeader
            actions={customer.phone.replace(/\D/g, "").length >= 11 ? <CustomerRecordButton phone={customer.phone} /> : undefined}
            description="Start with the phone number; details from earlier orders fill in automatically."
            title="Customer"
          />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field error={errors.phone} htmlFor="mo-phone" label="Phone">
              <Input
                autoFocus
                id="mo-phone"
                inputMode="tel"
                onBlur={(event) => lookUp(event.target.value)}
                onChange={(event) => setField("phone", event.target.value)}
                placeholder="01XXXXXXXXX"
                value={customer.phone}
              />
            </Field>
            <Field error={errors.name} htmlFor="mo-name" label="Name">
              <Input id="mo-name" onChange={(event) => setField("name", event.target.value)} value={customer.name} />
            </Field>
            {returning && (
              <p className="flex items-center gap-2 rounded-lg bg-good-soft px-3 py-2 text-xs font-semibold text-good sm:col-span-2">
                <UserCheck className="size-4" />
                Returning customer · {returning.orders} earlier order{returning.orders === 1 ? "" : "s"}
                {returning.hasAccount && " · has an account (order will be linked)"}
              </p>
            )}
            <Field className="sm:col-span-2" error={errors.address} htmlFor="mo-address" label="Delivery address">
              <Textarea
                className="min-h-20"
                id="mo-address"
                onChange={(event) => setField("address", event.target.value)}
                placeholder="House, road, area, thana, district"
                value={customer.address}
              />
            </Field>
            <Field htmlFor="mo-email" label="Email" optional>
              <Input id="mo-email" onChange={(event) => setField("email", event.target.value)} type="email" value={customer.email} />
            </Field>
            <Field hint="Shown on the invoice and to the courier." htmlFor="mo-notes" label="Customer note" optional>
              <Input id="mo-notes" onChange={(event) => setField("notes", event.target.value)} value={customer.notes} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader description="Stock is taken when the order is created, like a website order." title="Products" />
          <CardBody>
            <ProductLinesEditor error={errors.items} lineErrors={errors} lines={lines} onChange={setLines} products={products} />
          </CardBody>
        </Card>
      </div>

      <aside className="grid gap-6 xl:sticky xl:top-6">
        <Card>
          <CardHeader title="Order" />
          <CardBody className="grid gap-4">
            <Field htmlFor="mo-channel" label="Order came from">
              <Select id="mo-channel" onChange={(event) => setChannel(event.target.value)} value={channel}>
                {ORDER_CHANNELS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field htmlFor="mo-shipping" label="Delivery">
              <Select
                id="mo-shipping"
                onChange={(event) => {
                  setShippingOption(event.target.value);
                  const option = shippingOptions.find((item) => item.value === event.target.value);
                  if (option) setShippingCost(option.cost);
                }}
                value={shippingOption}
              >
                {shippingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {formatTaka(option.cost)}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field error={errors.shippingCost} htmlFor="mo-shipcost" label="Delivery charge">
                <PrefixInput id="mo-shipcost" min={0} onChange={(event) => setShippingCost(Number(event.target.value))} prefix="৳" type="number" value={shippingCost} />
              </Field>
              <Field error={errors.discount} htmlFor="mo-discount" label="Discount">
                <PrefixInput id="mo-discount" min={0} onChange={(event) => setDiscount(Number(event.target.value))} prefix="৳" type="number" value={discount} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field htmlFor="mo-status" label="Status">
                <Select id="mo-status" onChange={(event) => setStatus(event.target.value as ManualOrderInput["status"])} value={status}>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                </Select>
              </Field>
              <Field htmlFor="mo-payment" label="Payment">
                <Select id="mo-payment" onChange={(event) => setPaymentStatus(event.target.value as ManualOrderInput["paymentStatus"])} value={paymentStatus}>
                  <option value="unpaid">Cash on delivery</option>
                  <option value="paid">Paid in full</option>
                </Select>
              </Field>
            </div>
            {paymentStatus === "unpaid" && (
              <Field
                error={errors.advance}
                hint="Received before delivery (bKash, Nagad, bank…). The courier collects the rest. Counted in revenue once delivered."
                htmlFor="mo-advance"
                label="Advance received"
                optional
              >
                <PrefixInput id="mo-advance" max={total} min={0} onChange={(event) => setAdvance(Number(event.target.value))} prefix="৳" type="number" value={advance} />
              </Field>
            )}
            <Field htmlFor="mo-note" label="Internal note" optional>
              <Textarea className="min-h-16" id="mo-note" onChange={(event) => setAdminNote(event.target.value)} value={adminNote} />
            </Field>

            <dl className="grid gap-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <dt>Subtotal</dt>
                <dd className="tabular-nums text-brand-ink">{formatTaka(subtotal)}</dd>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-muted">
                  <dt>Discount</dt>
                  <dd className="tabular-nums text-good">−{formatTaka(Math.min(discount, subtotal))}</dd>
                </div>
              )}
              <div className="flex justify-between text-muted">
                <dt>Delivery</dt>
                <dd className="tabular-nums text-brand-ink">{shippingCost ? formatTaka(shippingCost) : "Free"}</dd>
              </div>
              <div className={cn("flex justify-between border-t border-line pt-2 font-semibold text-brand-ink", advancePaid === 0 && "text-base font-bold")}>
                <dt>{paymentStatus === "paid" ? "Total paid" : advancePaid > 0 ? "Total" : "To collect"}</dt>
                <dd className="tabular-nums">{formatTaka(total)}</dd>
              </div>
              {paymentStatus === "unpaid" && advancePaid > 0 && (
                <>
                  <div className="flex justify-between text-muted">
                    <dt>Advance received</dt>
                    <dd className="tabular-nums text-good">−{formatTaka(advancePaid)}</dd>
                  </div>
                  <div className="flex justify-between text-base font-bold text-brand-ink">
                    <dt>Courier collects</dt>
                    <dd className="tabular-nums">{formatTaka(total - advancePaid)}</dd>
                  </div>
                </>
              )}
            </dl>
            {lines.length > 0 && (
              <p className="text-xs text-muted">
                {lines.reduce((sum, line) => sum + line.quantity, 0)} item(s) · <Badge tone="brand">{channel}</Badge>
              </p>
            )}
          </CardBody>
        </Card>
        <div className="flex justify-end gap-2">
          <ButtonLink href="/orders" variant="secondary">
            Cancel
          </ButtonLink>
          <Button disabled={!lines.length} loading={saving} type="submit">
            Create order
          </Button>
        </div>
      </aside>
    </form>
  );
}
