"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Minus, PackagePlus, Plus, Search, Trash2, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, PrefixInput, Select, Textarea } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Page";
import { createManualOrder, findCustomerByPhone } from "@/lib/actions/manual-orders";
import { cn } from "@/lib/cn";
import { formatTaka } from "@/lib/format";
import { ORDER_CHANNELS, type ManualOrderInput, type PickerProduct } from "@/lib/manual-order";
import { CustomerRecordButton } from "./CustomerRecord";

type Line = { key: string; productId: string; variantId: string | null; quantity: number; price: number };
type ShippingChoice = { value: string; label: string; cost: number };

export function ManualOrderForm({ products, shippingOptions }: { products: PickerProduct[]; shippingOptions: ShippingChoice[] }) {
  const router = useRouter();
  const [customer, setCustomer] = useState({ name: "", phone: "", email: "", address: "", notes: "" });
  const [returning, setReturning] = useState<{ orders: number; hasAccount: boolean } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [query, setQuery] = useState("");
  const [shippingOption, setShippingOption] = useState(shippingOptions[0]?.value ?? "custom");
  const [shippingCost, setShippingCost] = useState(shippingOptions[0]?.cost ?? 0);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState<ManualOrderInput["status"]>("confirmed");
  const [paymentStatus, setPaymentStatus] = useState<ManualOrderInput["paymentStatus"]>("unpaid");
  const [channel, setChannel] = useState<string>("Phone");
  const [adminNote, setAdminNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();
  const [, startLookup] = useTransition();

  const byId = new Map(products.map((product) => [product.id, product]));
  const results = query.trim()
    ? products.filter((product) => `${product.name} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

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

  const addProduct = (product: PickerProduct) => {
    const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0] ?? null;
    setLines((current) => [
      ...current,
      { key: `${product.id}-${Date.now()}`, productId: product.id, variantId: variant?.id ?? null, quantity: 1, price: variant?.price ?? product.price },
    ]);
    setQuery("");
  };

  const updateLine = (key: string, patch: Partial<Line>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const total = Math.max(0, subtotal - Math.min(discount, subtotal) + shippingCost);

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
          <CardBody className="grid gap-4">
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input aria-label="Search products" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or code to add" value={query} />
              {results.length > 0 && (
                <ul className="absolute inset-x-0 top-11 z-10 max-h-80 overflow-y-auto rounded-lg border border-line bg-surface shadow-pop">
                  {results.map((product) => (
                    <li key={product.id}>
                      <button
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                        disabled={product.stock < 1}
                        onClick={() => addProduct(product)}
                        type="button"
                      >
                        <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
                          {product.image && <Image alt="" className="object-cover" fill sizes="36px" src={product.image} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{product.name}</span>
                          <span className="text-xs text-muted">
                            {product.id} · {product.variants.length ? `${product.variants.length} options` : "single item"}
                          </span>
                        </span>
                        <span className="text-right text-xs">
                          <span className="block font-semibold">{formatTaka(product.price)}</span>
                          <span className={product.stock < 1 ? "text-bad" : "text-muted"}>{product.stock < 1 ? "Out of stock" : `${product.stock} in stock`}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {errors.items && <p className="text-xs text-bad">{errors.items}</p>}

            {lines.length === 0 ? (
              <EmptyState className="py-8" icon={<PackagePlus />} title="No products yet" description="Search above to add what the customer ordered." />
            ) : (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {lines.map((line, index) => {
                  const product = byId.get(line.productId);
                  if (!product) return null;
                  const variant = product.variants.find((item) => item.id === line.variantId) ?? null;
                  const stock = variant?.stock ?? product.stock;
                  const image = variant?.image ?? product.image;
                  return (
                    <li className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto_auto] sm:items-center" key={line.key}>
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                          {image && <Image alt="" className="object-cover" fill sizes="44px" src={image} />}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{product.name}</p>
                          {product.variants.length > 0 ? (
                            <select
                              aria-label={`Option for ${product.name}`}
                              className="mt-1 h-7 max-w-full rounded-md border border-line-strong bg-surface px-1.5 text-xs"
                              onChange={(event) => {
                                const next = product.variants.find((item) => item.id === event.target.value);
                                updateLine(line.key, { variantId: event.target.value, price: next?.price ?? line.price });
                              }}
                              value={line.variantId ?? ""}
                            >
                              {product.variants.map((item) => (
                                <option disabled={item.stock < 1} key={item.id} value={item.id}>
                                  {item.label} — {item.stock < 1 ? "out of stock" : `${item.stock} left`}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <p className="text-xs text-muted">{stock} in stock</p>
                          )}
                          {errors[`items.${index}`] && <p className="text-[11px] text-bad">{errors[`items.${index}`]}</p>}
                        </div>
                      </div>
                      <div className="flex h-8 items-center rounded-md border border-line-strong">
                        <button aria-label="One less" className="grid size-8 place-items-center disabled:opacity-40" disabled={line.quantity <= 1} onClick={() => updateLine(line.key, { quantity: line.quantity - 1 })} type="button">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                        <button aria-label="One more" className="grid size-8 place-items-center disabled:opacity-40" disabled={line.quantity >= stock} onClick={() => updateLine(line.key, { quantity: line.quantity + 1 })} type="button">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <label className="flex items-center gap-1 text-xs text-muted">
                        ৳
                        <input
                          aria-label="Unit price"
                          className="h-8 w-24 rounded-md border border-line-strong bg-surface px-2 text-sm text-brand-ink"
                          min={0}
                          onChange={(event) => updateLine(line.key, { price: Number(event.target.value) })}
                          type="number"
                          value={line.price}
                        />
                      </label>
                      <div className="flex items-center justify-between gap-2 sm:justify-end">
                        <span className="w-20 text-right text-sm font-semibold tabular-nums">{formatTaka(line.price * line.quantity)}</span>
                        <Button aria-label={`Remove ${product.name}`} onClick={() => setLines((current) => current.filter((item) => item.key !== line.key))} size="icon" variant="danger-ghost">
                          <Trash2 />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
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
                  <option value="paid">Paid in advance</option>
                </Select>
              </Field>
            </div>
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
              <div className={cn("flex justify-between border-t border-line pt-2 text-base font-bold text-brand-ink")}>
                <dt>{paymentStatus === "paid" ? "Total paid" : "To collect"}</dt>
                <dd className="tabular-nums">{formatTaka(total)}</dd>
              </div>
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
