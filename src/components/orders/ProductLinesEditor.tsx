"use client";

import Image from "next/image";
import { useState } from "react";
import { Minus, PackagePlus, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState } from "@/components/ui/Page";
import { formatTaka } from "@/lib/format";
import type { PickerProduct } from "@/lib/manual-order";

export type ProductLine = { key: string; productId: string; variantId: string | null; quantity: number; price: number };

/** Product search plus the chosen lines (option, quantity, unit price). Used by New order and Create exchange. */
export function ProductLinesEditor({
  products,
  lines,
  onChange,
  error,
  lineErrors = {},
  emptyText = "Search above to add what the customer ordered.",
}: {
  products: PickerProduct[];
  lines: ProductLine[];
  onChange: (update: (current: ProductLine[]) => ProductLine[]) => void;
  error?: string;
  /** Keyed `items.<index>`. */
  lineErrors?: Record<string, string>;
  emptyText?: string;
}) {
  const [query, setQuery] = useState("");
  const byId = new Map(products.map((product) => [product.id, product]));
  const results = query.trim()
    ? products.filter((product) => `${product.name} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : [];

  const addProduct = (product: PickerProduct) => {
    const variant = product.variants.find((item) => item.stock > 0) ?? product.variants[0] ?? null;
    onChange((current) => [
      ...current,
      { key: `${product.id}-${Date.now()}`, productId: product.id, variantId: variant?.id ?? null, quantity: 1, price: variant?.price ?? product.price },
    ]);
    setQuery("");
  };

  const updateLine = (key: string, patch: Partial<ProductLine>) =>
    onChange((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  return (
    <div className="grid gap-4">
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
      {error && <p className="text-xs text-bad">{error}</p>}

      {lines.length === 0 ? (
        <EmptyState className="py-8" icon={<PackagePlus />} title="No products yet" description={emptyText} />
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
                    {lineErrors[`items.${index}`] && <p className="text-[11px] text-bad">{lineErrors[`items.${index}`]}</p>}
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
                  <Button aria-label={`Remove ${product.name}`} onClick={() => onChange((current) => current.filter((item) => item.key !== line.key))} size="icon" variant="danger-ghost">
                    <Trash2 />
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
