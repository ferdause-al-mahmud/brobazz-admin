"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Minus, Plus, Repeat } from "lucide-react";
import { toast } from "sonner";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, PrefixInput, Select, Textarea } from "@/components/ui/Field";
import { createExchangeOrder } from "@/lib/actions/exchanges";
import { formatTaka } from "@/lib/format";
import type { PickerProduct } from "@/lib/manual-order";
import { ProductLinesEditor, type ProductLine } from "./ProductLinesEditor";

type OriginalItem = {
  index: number;
  productId: string;
  variantId: string | null;
  name: string;
  variantLabel: string;
  image: string | null;
  price: number;
  quantity: number;
  /** Units not already in another exchange. */
  available: number;
};
type ShippingChoice = { value: string; label: string; cost: number };

const PICKUP = "pickup";

export function ExchangeForm({
  orderID,
  items,
  products,
  shippingOptions,
  defaultShipping,
}: {
  orderID: number;
  items: OriginalItem[];
  products: PickerProduct[];
  shippingOptions: ShippingChoice[];
  defaultShipping: string;
}) {
  const router = useRouter();
  const initialShipping = shippingOptions.find((option) => option.value === defaultShipping) ?? shippingOptions[0];
  const [returning, setReturning] = useState<Record<number, number>>({});
  const [lines, setLines] = useState<ProductLine[]>([]);
  const [shippingOption, setShippingOption] = useState(initialShipping?.value ?? "custom");
  const [shippingCost, setShippingCost] = useState(initialShipping?.cost ?? 0);
  const [adminNote, setAdminNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, startSaving] = useTransition();

  const returnedValue = items.reduce((sum, item) => sum + item.price * (returning[item.index] ?? 0), 0);
  const subtotal = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const credit = Math.min(returnedValue, subtotal);
  const collect = subtotal - credit + shippingCost;
  const unusedCredit = lines.length > 0 ? returnedValue - credit : 0;

  /** Adds the same product as a replacement line, so staff only pick the new size or colour. */
  const replaceWithSame = (item: OriginalItem) => {
    const product = products.find((entry) => entry.id === item.productId);
    if (!product) {
      toast.error(`${item.name} is no longer for sale`);
      return;
    }
    const variant =
      product.variants.find((entry) => entry.id !== item.variantId && entry.stock > 0) ??
      product.variants.find((entry) => entry.stock > 0) ??
      null;
    if (product.variants.length ? !variant : product.stock < 1) {
      toast.error(`${item.name} is out of stock`);
      return;
    }
    setLines((current) => [
      ...current,
      {
        key: `${product.id}-${Date.now()}`,
        productId: product.id,
        variantId: variant?.id ?? null,
        quantity: Math.max(1, returning[item.index] ?? 1),
        // Same product: keep the price the customer paid, so a size swap costs nothing extra.
        price: item.price,
      },
    ]);
  };

  const submit = () =>
    startSaving(async () => {
      const result = await createExchangeOrder(orderID, {
        returns: Object.entries(returning).map(([itemIndex, quantity]) => ({ itemIndex: Number(itemIndex), quantity })),
        items: lines.map(({ productId, variantId, quantity, price }) => ({ productId, variantId, quantity, price })),
        shippingOption,
        shippingCost,
        adminNote,
      });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      toast.success(`Exchange order #${result.data} created`);
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
          <CardHeader description={`From order #${orderID}. These come back into stock when the exchange is delivered, if they're resellable.`} title="1. What the customer sends back" />
          <CardBody className="grid gap-3">
            {errors.returns && <p className="text-xs text-bad">{errors.returns}</p>}
            <ul className="divide-y divide-line rounded-xl border border-line">
              {items.map((item) => {
                const count = returning[item.index] ?? 0;
                const set = (value: number) => setReturning((current) => ({ ...current, [item.index]: value }));
                return (
                  <li className="grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center" key={item.index}>
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="relative size-11 shrink-0 overflow-hidden rounded-lg border border-line bg-surface-muted">
                        {item.image && <Image alt="" className="object-cover" fill sizes="44px" src={item.image} />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-muted">
                          {[item.variantLabel, `${formatTaka(item.price)} × ${item.quantity}`].filter(Boolean).join(" · ")}
                          {item.available < item.quantity && ` · ${item.quantity - item.available} already exchanged`}
                        </p>
                      </div>
                    </div>
                    {item.available > 0 ? (
                      <div className="flex h-8 items-center rounded-md border border-line-strong">
                        <button aria-label="One less" className="grid size-8 place-items-center disabled:opacity-40" disabled={count <= 0} onClick={() => set(count - 1)} type="button">
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-7 text-center text-sm font-semibold tabular-nums">{count}</span>
                        <button aria-label="One more" className="grid size-8 place-items-center disabled:opacity-40" disabled={count >= item.available} onClick={() => set(count + 1)} type="button">
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-muted">Already exchanged</span>
                    )}
                    <Button disabled={count < 1} onClick={() => replaceWithSame(item)} size="sm" variant="secondary">
                      <Repeat /> Same product
                    </Button>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>

        <Card>
          <CardHeader description="Stock is taken when the exchange is created. Use “Same product” above for a size or colour swap." title="2. What the customer gets" />
          <CardBody>
            <ProductLinesEditor
              emptyText="Search above, or use “Same product” for a size or colour swap."
              error={errors.items}
              lineErrors={errors}
              lines={lines}
              onChange={setLines}
              products={products}
            />
          </CardBody>
        </Card>
      </div>

      <aside className="grid gap-6 xl:sticky xl:top-6">
        <Card>
          <CardHeader title="Exchange" />
          <CardBody className="grid gap-4">
            <Field hint="The customer pays delivery for exchanges, unless they swap at the shop." htmlFor="ex-shipping" label="Delivery">
              <Select
                id="ex-shipping"
                onChange={(event) => {
                  const value = event.target.value;
                  setShippingOption(value);
                  if (value === PICKUP) setShippingCost(0);
                  const option = shippingOptions.find((item) => item.value === value);
                  if (option) setShippingCost(option.cost);
                }}
                value={shippingOption}
              >
                {shippingOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label} — {formatTaka(option.cost)}
                  </option>
                ))}
                <option value={PICKUP}>Shop pickup — {formatTaka(0)}</option>
                <option value="custom">Custom</option>
              </Select>
            </Field>
            <Field error={errors.shippingCost} htmlFor="ex-shipcost" label="Delivery charge">
              <PrefixInput id="ex-shipcost" min={0} onChange={(event) => setShippingCost(Number(event.target.value))} prefix="৳" type="number" value={shippingCost} />
            </Field>
            <Field htmlFor="ex-note" label="Internal note" optional>
              <Textarea className="min-h-16" id="ex-note" onChange={(event) => setAdminNote(event.target.value)} placeholder="e.g. Wrong size, wants 42" value={adminNote} />
            </Field>

            <dl className="grid gap-1.5 border-t border-line pt-4 text-sm">
              <div className="flex justify-between text-muted">
                <dt>Replacement</dt>
                <dd className="tabular-nums text-brand-ink">{formatTaka(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Credit for returned items</dt>
                <dd className="tabular-nums text-good">−{formatTaka(credit)}</dd>
              </div>
              <div className="flex justify-between text-muted">
                <dt>Delivery</dt>
                <dd className="tabular-nums text-brand-ink">{shippingCost ? formatTaka(shippingCost) : "Free"}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold text-brand-ink">
                <dt>Courier collects</dt>
                <dd className="tabular-nums">{formatTaka(collect)}</dd>
              </div>
            </dl>
            {unusedCredit > 0 && (
              <p className="rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">
                The replacement is {formatTaka(unusedCredit)} cheaper than what&apos;s coming back. That difference isn&apos;t refunded here.
              </p>
            )}
          </CardBody>
        </Card>
        <div className="flex justify-end gap-2">
          <ButtonLink href={`/orders/${orderID}`} variant="secondary">
            Cancel
          </ButtonLink>
          <Button disabled={!lines.length || returnedValue === 0} loading={saving} type="submit">
            Create exchange
          </Button>
        </div>
      </aside>
    </form>
  );
}
