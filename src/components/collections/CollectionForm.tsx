"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, CalendarRange, ListChecks, Search, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import { SingleImagePicker } from "@/components/media/ImagePicker";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Checkbox, Field, Input, PrefixInput, Select, Switch, Textarea } from "@/components/ui/Field";
import { saveCollection } from "@/lib/actions/collections";
import { cn } from "@/lib/cn";
import {
  collectionKindLabels,
  collectionSortLabels,
  resolveCollection,
  type CollectionInput,
  type RuleProduct,
} from "@/lib/collection-rules";
import { formatTaka } from "@/lib/format";
import { slugify } from "@/lib/slug";
import { COLLECTION_KINDS, COLLECTION_SORTS, PRODUCT_TYPES, productTypeLabels } from "@/lib/store-definitions";

/** ISO → value for <input type="datetime-local"> in the browser's time zone. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

function numberOrNull(value: string) {
  return value === "" ? null : Number(value);
}

export function CollectionForm({
  initial,
  id,
  products,
  categories,
}: {
  initial: CollectionInput;
  id: string | null;
  products: RuleProduct[];
  categories: { slug: string; label: string }[];
}) {
  const router = useRouter();
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(id));
  const [saving, startSaving] = useTransition();
  const update = (patch: Partial<CollectionInput>) => setInput((current) => ({ ...current, ...patch }));
  const updateRules = (patch: Partial<CollectionInput["rules"]>) =>
    setInput((current) => ({ ...current, rules: { ...current.rules, ...patch } }));

  const matched = useMemo(() => resolveCollection(input, products), [input, products]);
  const tagOptions = useMemo(() => [...new Set(products.flatMap((product) => product.tags))].sort(), [products]);

  const save = () =>
    startSaving(async () => {
      const result = await saveCollection(input, id);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      toast.success(result.message);
      if (!id) router.push(`/collections/${result.data}`);
      else router.refresh();
    });

  return (
    <form
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_380px]"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="grid min-w-0 gap-6">
        <Card>
          <CardHeader title="Details" />
          <CardBody className="grid gap-4 sm:grid-cols-2">
            <Field className="sm:col-span-2" error={errors.name} htmlFor="col-name" label="Name">
              <Input
                id="col-name"
                onChange={(event) => update({ name: event.target.value, ...(slugTouched ? {} : { slug: slugify(event.target.value) }) })}
                placeholder="Eid Collection"
                value={input.name}
              />
            </Field>
            <Field error={errors.slug} hint={`/collections/${input.slug || "…"}`} htmlFor="col-slug" label="URL">
              <Input
                id="col-slug"
                onChange={(event) => {
                  setSlugTouched(true);
                  update({ slug: slugify(event.target.value) });
                }}
                value={input.slug}
              />
            </Field>
            <Field error={errors.kind} label="Type">
              <div className="grid grid-cols-3 gap-1.5">
                {COLLECTION_KINDS.map((kind) => (
                  <button
                    aria-pressed={input.kind === kind}
                    className={cn(
                      "h-10 rounded-lg border text-xs font-semibold transition-colors",
                      input.kind === kind ? "border-brand-primary bg-brand-primary text-white" : "border-line-strong text-brand-ink hover:border-brand-primary/50",
                    )}
                    key={kind}
                    onClick={() => update({ kind })}
                    type="button"
                  >
                    {collectionKindLabels[kind]}
                  </button>
                ))}
              </div>
            </Field>
            <Field hint="Small label above the title, e.g. “Limited time”." htmlFor="col-eyebrow" label="Eyebrow" optional>
              <Input id="col-eyebrow" onChange={(event) => update({ eyebrow: event.target.value })} value={input.eyebrow} />
            </Field>
            <Field className="sm:col-span-2" htmlFor="col-description" label="Description" optional>
              <Textarea id="col-description" onChange={(event) => update({ description: event.target.value })} value={input.description} />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardHeader
            description={input.mode === "smart" ? "Products that match the conditions are added automatically, now and in future." : "Pick exactly which products to include."}
            title="Products"
          />
          <CardBody className="grid gap-5">
            <div className="grid grid-cols-2 gap-2 sm:max-w-md">
              {(
                [
                  { mode: "smart", label: "Automatic", icon: Wand2 },
                  { mode: "manual", label: "Hand-picked", icon: ListChecks },
                ] as const
              ).map(({ mode, label, icon: Icon }) => (
                <button
                  aria-pressed={input.mode === mode}
                  className={cn(
                    "flex h-11 items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-colors",
                    input.mode === mode ? "border-brand-primary bg-brand-primary/8 text-brand-primary" : "border-line-strong text-brand-ink hover:border-brand-primary/50",
                  )}
                  key={mode}
                  onClick={() => update({ mode, sort: mode === "smart" && input.sort === "manual" ? "new" : input.sort })}
                  type="button"
                >
                  <Icon className="size-4" /> {label}
                </button>
              ))}
            </div>

            {input.mode === "smart" ? (
              <RulesEditor categories={categories} input={input} tagOptions={tagOptions} updateRules={updateRules} errors={errors} />
            ) : (
              <ManualPicker error={errors.productIds} onChange={(productIds) => update({ productIds })} products={products} selected={input.productIds} />
            )}

            <Field error={errors.sort} htmlFor="col-sort" label="Order products by">
              <Select id="col-sort" onChange={(event) => update({ sort: event.target.value as CollectionInput["sort"] })} value={input.sort}>
                {COLLECTION_SORTS.filter((sort) => sort !== "manual" || input.mode === "manual").map((sort) => (
                  <option key={sort} value={sort}>
                    {collectionSortLabels[sort]}
                  </option>
                ))}
              </Select>
            </Field>
          </CardBody>
        </Card>
      </div>

      <aside className="grid gap-6 xl:sticky xl:top-6">
        <Card>
          <CardHeader title="Visibility" />
          <CardBody className="grid gap-4">
            <Switch checked={input.isActive} label="Active" onChange={(event) => update({ isActive: event.target.checked })} />
            <Switch checked={input.showOnHome} description="As a product row, in collection order." label="Show on homepage" onChange={(event) => update({ showOnHome: event.target.checked })} />
            {input.showOnHome && (
              <Field hint="How many products the homepage row shows." htmlFor="col-limit" label="Products on homepage">
                <Input id="col-limit" max={24} min={1} onChange={(event) => update({ homeLimit: Number(event.target.value) })} type="number" value={input.homeLimit} />
              </Field>
            )}
            <div className="rounded-lg border border-line bg-surface-muted p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-brand-ink">
                <CalendarRange className="size-3.5" /> Schedule {input.kind === "collection" && <span className="font-normal text-muted">(optional)</span>}
              </p>
              <p className="mt-0.5 text-[11px] text-muted">Outside these dates the collection is hidden — handy for seasons and campaigns.</p>
              <div className="mt-3 grid gap-3">
                <Field htmlFor="col-start" label="Starts">
                  <Input id="col-start" onChange={(event) => update({ startsAt: fromLocalInput(event.target.value) })} type="datetime-local" value={toLocalInput(input.startsAt)} />
                </Field>
                <Field error={errors.endsAt} htmlFor="col-end" label="Ends">
                  <Input id="col-end" onChange={(event) => update({ endsAt: fromLocalInput(event.target.value) })} type="datetime-local" value={toLocalInput(input.endsAt)} />
                </Field>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Banner image" />
          <CardBody>
            <SingleImagePicker aspect="aspect-[16/7]" onChange={(image) => update({ image })} value={input.image} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader description="What the storefront will show right now." title={`${matched.length} product${matched.length === 1 ? "" : "s"}`} />
          <ul className="max-h-80 divide-y divide-line overflow-y-auto">
            {matched.slice(0, 30).map((product) => (
              <li className="flex items-center gap-3 px-5 py-2" key={product.id}>
                <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
                  {product.image && <Image alt="" className="object-cover" fill sizes="36px" src={product.image} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{product.name}</span>
                <span className="text-xs tabular-nums text-muted">{formatTaka(product.finalPrice)}</span>
              </li>
            ))}
            {matched.length === 0 && <li className="px-5 py-6 text-center text-xs text-muted">No products match yet.</li>}
          </ul>
        </Card>

        <div className="flex justify-end gap-2">
          <ButtonLink href="/collections" variant="secondary">
            Cancel
          </ButtonLink>
          <Button loading={saving} type="submit">
            {id ? "Save collection" : "Create collection"}
          </Button>
        </div>
      </aside>
    </form>
  );
}

function RulesEditor({
  input,
  updateRules,
  categories,
  tagOptions,
  errors,
}: {
  input: CollectionInput;
  updateRules: (patch: Partial<CollectionInput["rules"]>) => void;
  categories: { slug: string; label: string }[];
  tagOptions: string[];
  errors: Record<string, string>;
}) {
  const rules = input.rules;
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);

  return (
    <div className="grid gap-5 rounded-xl border border-line bg-surface-muted/50 p-4">
      <Field hint="Leave empty for all categories." label="Categories">
        <div className="flex flex-wrap gap-1.5">
          {categories.map((category) => (
            <button
              aria-pressed={rules.categories.includes(category.slug)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                rules.categories.includes(category.slug) ? "border-brand-primary bg-brand-primary text-white" : "border-line-strong bg-surface text-brand-ink hover:border-brand-primary/50",
              )}
              key={category.slug}
              onClick={() => updateRules({ categories: toggle(rules.categories, category.slug) })}
              type="button"
            >
              {category.label}
            </button>
          ))}
          {categories.length === 0 && <span className="text-xs text-muted">Create categories first.</span>}
        </div>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product types">
          <div className="flex gap-4">
            {PRODUCT_TYPES.map((type) => (
              <Checkbox checked={rules.productTypes.includes(type)} key={type} label={productTypeLabels[type]} onChange={() => updateRules({ productTypes: toggle(rules.productTypes, type) })} />
            ))}
          </div>
        </Field>
        <Field hint="Products with any of these tags." label="Tags">
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map((tag) => (
              <button
                aria-pressed={rules.tags.includes(tag)}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs font-medium",
                  rules.tags.includes(tag) ? "border-brand-primary bg-brand-primary/10 text-brand-primary" : "border-line-strong bg-surface text-muted",
                )}
                key={tag}
                onClick={() => updateRules({ tags: toggle(rules.tags, tag) })}
                type="button"
              >
                #{tag}
              </button>
            ))}
            {tagOptions.length === 0 && <span className="text-xs text-muted">No product tags yet.</span>}
          </div>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field htmlFor="rule-min" label="Min price" optional>
          <PrefixInput id="rule-min" min={0} onChange={(event) => updateRules({ minPrice: numberOrNull(event.target.value) })} prefix="৳" type="number" value={rules.minPrice ?? ""} />
        </Field>
        <Field error={errors.maxPrice} htmlFor="rule-max" label="Max price" optional>
          <PrefixInput id="rule-max" min={0} onChange={(event) => updateRules({ maxPrice: numberOrNull(event.target.value) })} prefix="৳" type="number" value={rules.maxPrice ?? ""} />
        </Field>
        <Field hint="e.g. 30 for “New arrivals”." htmlFor="rule-new" label="Added in the last … days" optional>
          <Input id="rule-new" min={1} onChange={(event) => updateRules({ newWithinDays: numberOrNull(event.target.value) })} type="number" value={rules.newWithinDays ?? ""} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <Checkbox checked={rules.onSale} label="On sale only" onChange={(event) => updateRules({ onSale: event.target.checked })} />
        <Checkbox checked={rules.featuredOnly} label="Featured only" onChange={(event) => updateRules({ featuredOnly: event.target.checked })} />
        <Checkbox checked={rules.inStockOnly} label="In stock only" onChange={(event) => updateRules({ inStockOnly: event.target.checked })} />
      </div>
    </div>
  );
}

function ManualPicker({
  products,
  selected,
  onChange,
  error,
}: {
  products: RuleProduct[];
  selected: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}) {
  const [query, setQuery] = useState("");
  const byId = new Map(products.map((product) => [product.id, product]));
  const results = query.trim()
    ? products
        .filter((product) => !selected.includes(product.id) && `${product.name} ${product.id}`.toLowerCase().includes(query.trim().toLowerCase()))
        .slice(0, 8)
    : [];

  const move = (index: number, by: number) => {
    const next = [...selected];
    const [item] = next.splice(index, 1);
    next.splice(index + by, 0, item);
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      <div className="relative">
        <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subtle" />
        <Input aria-label="Find products to add" className="pl-9" onChange={(event) => setQuery(event.target.value)} placeholder="Search products to add" value={query} />
        {results.length > 0 && (
          <ul className="absolute inset-x-0 top-11 z-10 overflow-hidden rounded-lg border border-line bg-surface shadow-pop">
            {results.map((product) => (
              <li key={product.id}>
                <button
                  className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface-muted"
                  onClick={() => {
                    onChange([...selected, product.id]);
                    setQuery("");
                  }}
                  type="button"
                >
                  <span className="relative size-8 shrink-0 overflow-hidden rounded border border-line bg-surface-muted">
                    {product.image && <Image alt="" className="object-cover" fill sizes="32px" src={product.image} />}
                  </span>
                  <span className="flex-1 truncate">{product.name}</span>
                  {!product.isActive && <Badge>Hidden</Badge>}
                  <span className="text-xs text-muted">{product.id}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-bad">{error}</p>}
      {selected.length > 0 && (
        <ol className="divide-y divide-line rounded-xl border border-line">
          {selected.map((id, index) => {
            const product = byId.get(id);
            return (
              <li className="flex items-center gap-3 px-3 py-2" key={id}>
                <span className="w-5 text-right text-xs tabular-nums text-subtle">{index + 1}</span>
                <span className="relative size-9 shrink-0 overflow-hidden rounded-md border border-line bg-surface-muted">
                  {product?.image && <Image alt="" className="object-cover" fill sizes="36px" src={product.image} />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{product?.name ?? `${id} (deleted)`}</span>
                {product && !product.isActive && <Badge>Hidden</Badge>}
                <Button aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)} size="icon" variant="ghost">
                  <ArrowUp />
                </Button>
                <Button aria-label="Move down" disabled={index === selected.length - 1} onClick={() => move(index, 1)} size="icon" variant="ghost">
                  <ArrowDown />
                </Button>
                <Button aria-label="Remove" onClick={() => onChange(selected.filter((item) => item !== id))} size="icon" variant="danger-ghost">
                  <X />
                </Button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
