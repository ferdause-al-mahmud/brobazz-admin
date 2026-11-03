"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { Copy, Plus, Sparkles, Trash2, Wand2, X } from "lucide-react";
import { toast } from "sonner";
import {
  SingleImagePicker,
  GalleryPicker,
} from "@/components/media/ImagePicker";
import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import {
  Field,
  Input,
  PrefixInput,
  Select,
  Switch,
  Textarea,
} from "@/components/ui/Field";
import { saveProduct } from "@/lib/actions/products";
import { cn } from "@/lib/cn";
import { formatTaka } from "@/lib/format";
import {
  buildVariantMatrix,
  MAX_OPTIONS,
  OPTION_SUGGESTIONS,
  SPEC_SUGGESTIONS,
  suggestSku,
  type ProductInput,
  type VariantInput,
} from "@/lib/product-input";
import { slugify } from "@/lib/slug";
import {
  PRODUCT_TYPES,
  productTypeLabels,
  type ProductType,
} from "@/lib/store-definitions";

export type CategoryOption = {
  name: string;
  productType: ProductType | null;
  subCategories: string[];
};

export type AttributePreset = {
  id: string;
  name: string;
  values: string[];
  productTypes: string[];
};

/** A number input whose empty state is null rather than 0. */
function NumberField({
  value,
  onChange,
  prefix,
  ...props
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  prefix?: string;
  placeholder?: string;
  id?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  className?: string;
}) {
  const shared = {
    inputMode: "numeric" as const,
    min: 0,
    onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
      onChange(event.target.value === "" ? null : Number(event.target.value)),
    type: "number",
    value: value ?? "",
    ...props,
  };
  return prefix ? (
    <PrefixInput prefix={prefix} {...shared} />
  ) : (
    <Input {...shared} />
  );
}

/** Comma/Enter separated chips, e.g. tags or option values. */
function ChipInput({
  values,
  onChange,
  placeholder,
  suggestions = [],
}: {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  suggestions?: string[];
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const next = raw
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value && !values.includes(value));
    if (next.length) onChange([...values, ...next]);
    setDraft("");
  };
  const unused = suggestions.filter((value) => !values.includes(value));

  return (
    <div>
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-2 py-1.5 focus-within:border-brand-primary focus-within:ring-3 focus-within:ring-brand-primary/12">
        {values.map((value) => (
          <span
            className="inline-flex items-center gap-1 rounded-md bg-brand-primary/8 py-0.5 pl-2 pr-1 text-xs font-semibold text-brand-ink"
            key={value}
          >
            {value}
            <button
              aria-label={`Remove ${value}`}
              className="grid size-4 place-items-center rounded text-muted hover:bg-bad-soft hover:text-bad"
              onClick={() => onChange(values.filter((item) => item !== value))}
              type="button"
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          className="h-7 min-w-24 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-subtle"
          onBlur={() => draft && add(draft)}
          onChange={(event) => {
            if (event.target.value.includes(",")) add(event.target.value);
            else setDraft(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              add(draft);
            } else if (event.key === "Backspace" && !draft && values.length) {
              onChange(values.slice(0, -1));
            }
          }}
          placeholder={values.length ? "" : placeholder}
          value={draft}
        />
      </div>
      {unused.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {unused.slice(0, 14).map((value) => (
            <button
              className="rounded-md border border-dashed border-line-strong px-1.5 py-0.5 text-[11px] font-medium text-muted hover:border-brand-primary hover:text-brand-primary"
              key={value}
              onClick={() => onChange([...values, value])}
              type="button"
            >
              + {value}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <CardHeader actions={actions} description={description} title={title} />
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function ProductForm({
  initial,
  originalId,
  categories,
  presets,
}: {
  initial: ProductInput;
  /** The code of the product being edited; null when creating one. */
  originalId: string | null;
  categories: CategoryOption[];
  presets: AttributePreset[];
}) {
  const router = useRouter();
  const [product, setProduct] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slugTouched, setSlugTouched] = useState(Boolean(originalId));
  const [saving, startSaving] = useTransition();
  const [dirty, setDirty] = useState(false);

  const update = (patch: Partial<ProductInput>) => {
    setProduct((current) => ({ ...current, ...patch }));
    setDirty(true);
  };

  const category = categories.find((item) => item.name === product.category);
  const hasVariants = product.options.some(
    (option) => option.name.trim() && option.values.length,
  );
  const typePresets = presets.filter(
    (preset) =>
      !preset.productTypes.length ||
      preset.productTypes.includes(product.productType),
  );
  const optionNameSuggestions = [
    ...new Set([
      ...typePresets.map((preset) => preset.name),
      ...OPTION_SUGGESTIONS[product.productType],
    ]),
  ].filter(
    (name) =>
      !product.options.some(
        (option) => option.name.toLowerCase() === name.toLowerCase(),
      ),
  );

  const setOptions = (options: ProductInput["options"]) =>
    update({
      options,
      variants: buildVariantMatrix(options, product.variants, product.id),
    });

  // Functional update: bulk actions call this once per variant in a loop.
  const updateVariant = (index: number, patch: Partial<VariantInput>) => {
    setProduct((current) => ({
      ...current,
      variants: current.variants.map((variant, i) =>
        i === index ? { ...variant, ...patch } : variant,
      ),
    }));
    setDirty(true);
  };

  const totalStock = hasVariants
    ? product.variants
        .filter((variant) => variant.isActive)
        .reduce((sum, variant) => sum + (variant.stock || 0), 0)
    : product.stock;
  const sellingPrice =
    product.salePrice !== null && product.salePrice < product.price
      ? product.salePrice
      : product.price;
  const margin =
    product.costPrice !== null && sellingPrice > 0
      ? ((sellingPrice - product.costPrice) / sellingPrice) * 100
      : null;

  const save = () =>
    startSaving(async () => {
      const result = await saveProduct(product, originalId);
      if (!result.ok) {
        setErrors(result.fieldErrors ?? {});
        toast.error(result.error);
        return;
      }
      setErrors({});
      setDirty(false);
      toast.success(result.message);
      if (!originalId)
        router.push(`/products/${encodeURIComponent(result.data)}`);
      else router.refresh();
    });

  return (
    <form
      className="grid gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
    >
      <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-line bg-background/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:top-0 lg:-mx-8 lg:px-8">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Badge dot tone={product.isActive ? "good" : "neutral"}>
            {product.isActive ? "Visible" : "Hidden"}
          </Badge>
          <Badge tone="brand">{productTypeLabels[product.productType]}</Badge>
          {dirty && <span className="text-xs text-muted">Unsaved changes</span>}
        </div>
        <div className="flex gap-2">
          <ButtonLink href="/products" variant="secondary">
            Cancel
          </ButtonLink>
          <Button loading={saving} type="submit">
            {originalId ? "Save changes" : "Create product"}
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 gap-6">
          <Section title="Basics">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                className="sm:col-span-2"
                error={errors.name}
                htmlFor="name"
                label="Product name"
              >
                <Input
                  aria-invalid={Boolean(errors.name)}
                  id="name"
                  onChange={(event) =>
                    update({
                      name: event.target.value,
                      ...(slugTouched
                        ? {}
                        : { slug: slugify(event.target.value) }),
                    })
                  }
                  placeholder="Classic Bifold Wallet"
                  value={product.name}
                />
              </Field>
              <Field
                error={errors.id}
                hint={
                  originalId
                    ? "Carts and orders refer to this code, so it can't change."
                    : "Short and unique, e.g. BIF-001 or TSH-014."
                }
                htmlFor="code"
                label="Product code"
              >
                <Input
                  aria-invalid={Boolean(errors.id)}
                  className="uppercase"
                  disabled={Boolean(originalId)}
                  id="code"
                  onChange={(event) =>
                    update({
                      id: event.target.value.toUpperCase().replace(/\s+/g, "-"),
                    })
                  }
                  placeholder="BIF-001"
                  value={product.id}
                />
              </Field>
              <Field
                error={errors.slug}
                hint={`/product/${product.slug || "…"}`}
                htmlFor="slug"
                label="URL slug"
              >
                <Input
                  aria-invalid={Boolean(errors.slug)}
                  id="slug"
                  onChange={(event) => {
                    setSlugTouched(true);
                    update({ slug: slugify(event.target.value) });
                  }}
                  value={product.slug}
                />
              </Field>
              <Field
                className="sm:col-span-2"
                htmlFor="description"
                label="Description"
              >
                <Textarea
                  className="min-h-32"
                  id="description"
                  onChange={(event) =>
                    update({ description: event.target.value })
                  }
                  placeholder="What makes it special, how it's made, what it fits…"
                  value={product.description}
                />
              </Field>
            </div>
          </Section>

          <Section
            description="The first image is the cover shown on product cards."
            title="Images"
          >
            <GalleryPicker
              onChange={(images) => update({ images })}
              value={product.images}
            />
          </Section>

          <Section title="Pricing">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field error={errors.price} htmlFor="price" label="Price">
                <NumberField
                  aria-invalid={Boolean(errors.price)}
                  id="price"
                  onChange={(value) => update({ price: value ?? 0 })}
                  prefix="৳"
                  value={product.price}
                />
              </Field>
              <Field
                error={errors.salePrice}
                hint="Leave empty when not on sale."
                htmlFor="salePrice"
                label="Sale price"
                optional
              >
                <NumberField
                  aria-invalid={Boolean(errors.salePrice)}
                  id="salePrice"
                  onChange={(value) => update({ salePrice: value })}
                  prefix="৳"
                  value={product.salePrice}
                />
              </Field>
              <Field
                hint={
                  margin !== null
                    ? `Margin ${margin.toFixed(0)}% · profit ${formatTaka(sellingPrice - (product.costPrice ?? 0))}`
                    : "Only staff see this."
                }
                htmlFor="costPrice"
                label="Cost per item"
                optional
              >
                <NumberField
                  id="costPrice"
                  onChange={(value) => update({ costPrice: value })}
                  prefix="৳"
                  value={product.costPrice}
                />
              </Field>
            </div>
            {hasVariants && (
              <p className="mt-3 text-xs text-muted">
                Variants use this price unless you set their own below.
              </p>
            )}
          </Section>

          <Section
            description={
              product.productType === "clothing"
                ? "Sizes and colours customers choose from. Each combination is a variant with its own stock."
                : "Options such as colour or belt size. Leave empty for a single item."
            }
            title="Variations"
          >
            <VariationsEditor
              errors={errors}
              nameSuggestions={optionNameSuggestions}
              onOptionsChange={setOptions}
              onVariantChange={updateVariant}
              presets={typePresets}
              product={product}
            />
          </Section>

          {!hasVariants && (
            <Section title="Inventory">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  error={errors.stock}
                  htmlFor="stock"
                  label="Units in stock"
                >
                  <NumberField
                    aria-invalid={Boolean(errors.stock)}
                    id="stock"
                    onChange={(value) => update({ stock: value ?? 0 })}
                    value={product.stock}
                  />
                </Field>
                <Field
                  hint="Flagged as low stock at or below this."
                  htmlFor="low"
                  label="Low-stock alert"
                >
                  <NumberField
                    id="low"
                    onChange={(value) =>
                      update({ lowStockThreshold: value ?? 0 })
                    }
                    value={product.lowStockThreshold}
                  />
                </Field>
              </div>
            </Section>
          )}

          <Section
            description={
              product.productType === "clothing"
                ? "Fabric, fit and care for clothing."
                : "Leather, size and construction details."
            }
            title="Product details"
          >
            <div className="grid gap-5">
              <Field
                hint="Short selling points shown as a checklist."
                label="Highlights"
              >
                <ChipInput
                  onChange={(highlights) => update({ highlights })}
                  placeholder="Six card slots, Genuine leather…"
                  values={product.highlights}
                />
              </Field>
              <Field
                htmlFor="materials"
                label={
                  product.productType === "clothing"
                    ? "Fabric & materials"
                    : "Materials"
                }
              >
                <Textarea
                  className="min-h-20"
                  id="materials"
                  onChange={(event) =>
                    update({ materials: event.target.value })
                  }
                  value={product.materials}
                />
              </Field>
              <SpecsEditor
                onChange={(specs) => update({ specs })}
                specs={product.specs}
                suggestions={SPEC_SUGGESTIONS[product.productType]}
              />
              {product.productType === "clothing" && (
                <Field
                  hint="Shown in a size guide next to the size picker."
                  label="Size chart"
                >
                  <div className="max-w-xs">
                    <SingleImagePicker
                      aspect="aspect-[4/3]"
                      label="Add size chart"
                      onChange={(sizeChart) => update({ sizeChart })}
                      value={product.sizeChart}
                    />
                  </div>
                </Field>
              )}
            </div>
          </Section>

          <Section
            description="How the product appears in search results and link previews."
            title="Search engine listing"
          >
            <div className="grid gap-4">
              <Field
                hint={`${product.seo.title.length}/70`}
                htmlFor="seoTitle"
                label="Page title"
                optional
              >
                <Input
                  id="seoTitle"
                  maxLength={70}
                  onChange={(event) =>
                    update({
                      seo: { ...product.seo, title: event.target.value },
                    })
                  }
                  placeholder={product.name}
                  value={product.seo.title}
                />
              </Field>
              <Field
                hint={`${product.seo.description.length}/160`}
                htmlFor="seoDescription"
                label="Meta description"
                optional
              >
                <Textarea
                  className="min-h-20"
                  id="seoDescription"
                  maxLength={160}
                  onChange={(event) =>
                    update({
                      seo: { ...product.seo, description: event.target.value },
                    })
                  }
                  value={product.seo.description}
                />
              </Field>
            </div>
          </Section>
        </div>

        <aside className="grid gap-6 xl:sticky xl:top-20">
          <Section title="Visibility">
            <div className="grid gap-4">
              <Switch
                checked={product.isActive}
                description="Hidden products stay in past orders."
                label="Visible in store"
                onChange={(event) => update({ isActive: event.target.checked })}
              />
              <Switch
                checked={product.isFeatured}
                description="Can be used by collection rules."
                label="Featured"
                onChange={(event) =>
                  update({ isFeatured: event.target.checked })
                }
              />
            </div>
          </Section>

          <Section title="Organisation">
            <div className="grid gap-4">
              <Field
                error={errors.productType}
                hint="Decides which details and options are suggested."
                label="Product type"
              >
                <div className="grid grid-cols-2 gap-2">
                  {PRODUCT_TYPES.map((type) => (
                    <button
                      aria-pressed={product.productType === type}
                      className={cn(
                        "h-10 rounded-lg border text-sm font-semibold transition-colors",
                        product.productType === type
                          ? "border-brand-primary bg-brand-primary text-white"
                          : "border-line-strong text-brand-ink hover:border-brand-primary/50",
                      )}
                      key={type}
                      onClick={() => update({ productType: type })}
                      type="button"
                    >
                      {productTypeLabels[type]}
                    </button>
                  ))}
                </div>
              </Field>
              <Field
                error={errors.category}
                htmlFor="category"
                label="Category"
              >
                <Select
                  aria-invalid={Boolean(errors.category)}
                  id="category"
                  onChange={(event) => {
                    const next = categories.find(
                      (item) => item.name === event.target.value,
                    );
                    update({
                      category: event.target.value,
                      subCategory: "",
                      ...(next?.productType && !originalId
                        ? { productType: next.productType }
                        : {}),
                    });
                  }}
                  value={product.category}
                >
                  <option value="">Choose a category</option>
                  {categories.map((item) => (
                    <option key={item.name} value={item.name}>
                      {item.name}
                    </option>
                  ))}
                  {product.category && !category && (
                    <option value={product.category}>
                      {product.category} (not set up)
                    </option>
                  )}
                </Select>
              </Field>
              {(category?.subCategories.length ?? 0) > 0 && (
                <Field htmlFor="subCategory" label="Sub-category" optional>
                  <Select
                    id="subCategory"
                    onChange={(event) =>
                      update({ subCategory: event.target.value })
                    }
                    value={product.subCategory}
                  >
                    <option value="">None</option>
                    {category!.subCategories.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
              <Field
                hint="Used by search and collection rules."
                label="Tags"
                optional
              >
                <ChipInput
                  onChange={(tags) => update({ tags })}
                  placeholder="eid, gift, slim…"
                  values={product.tags}
                />
              </Field>
            </div>
          </Section>

          <Card className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              Summary
            </p>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">Selling price</dt>
                <dd className="font-semibold text-brand-ink">
                  {formatTaka(sellingPrice)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Variants</dt>
                <dd className="font-semibold text-brand-ink">
                  {hasVariants ? product.variants.length : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Total stock</dt>
                <dd className="font-semibold text-brand-ink">{totalStock}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Images</dt>
                <dd className="font-semibold text-brand-ink">
                  {product.images.length}
                </dd>
              </div>
            </dl>
          </Card>
        </aside>
      </div>
    </form>
  );
}

function SpecsEditor({
  specs,
  onChange,
  suggestions,
}: {
  specs: ProductInput["specs"];
  onChange: (specs: ProductInput["specs"]) => void;
  suggestions: string[];
}) {
  const unused = suggestions.filter(
    (label) => !specs.some((spec) => spec.label === label),
  );
  return (
    <div className="grid gap-2">
      <p className="text-xs font-semibold text-brand-ink">Specifications</p>
      {specs.map((spec, index) => (
        <div
          className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] gap-2"
          key={index}
        >
          <Input
            aria-label="Label"
            onChange={(event) =>
              onChange(
                specs.map((item, i) =>
                  i === index ? { ...item, label: event.target.value } : item,
                ),
              )
            }
            placeholder="Label"
            value={spec.label}
          />
          <Input
            aria-label={`${spec.label || "Specification"} value`}
            onChange={(event) =>
              onChange(
                specs.map((item, i) =>
                  i === index ? { ...item, value: event.target.value } : item,
                ),
              )
            }
            placeholder="Value"
            value={spec.value}
          />
          <Button
            aria-label="Remove row"
            onClick={() => onChange(specs.filter((_, i) => i !== index))}
            size="icon"
            variant="danger-ghost"
          >
            <Trash2 />
          </Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-1.5">
        <Button
          onClick={() => onChange([...specs, { label: "", value: "" }])}
          size="xs"
          variant="secondary"
        >
          <Plus /> Add row
        </Button>
        {unused.map((label) => (
          <button
            className="rounded-md border border-dashed border-line-strong px-2 text-[11px] font-medium text-muted hover:border-brand-primary hover:text-brand-primary"
            key={label}
            onClick={() => onChange([...specs, { label, value: "" }])}
            type="button"
          >
            + {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function VariationsEditor({
  product,
  presets,
  nameSuggestions,
  errors,
  onOptionsChange,
  onVariantChange,
}: {
  product: ProductInput;
  presets: AttributePreset[];
  nameSuggestions: string[];
  errors: Record<string, string>;
  onOptionsChange: (options: ProductInput["options"]) => void;
  onVariantChange: (index: number, patch: Partial<VariantInput>) => void;
}) {
  const [bulkStock, setBulkStock] = useState<number | null>(null);
  const options = product.options;
  const presetFor = (name: string) =>
    presets.find(
      (preset) => preset.name.toLowerCase() === name.trim().toLowerCase(),
    );

  const addOption = (name = "", values: string[] = []) =>
    onOptionsChange([...options, { name, values }]);

  // A picture shows a colour, so give it to every variant of that colour (all its sizes) at once.
  const setVariantImage = (index: number, image: string | null) => {
    const colour = product.variants[index].options.find((option) =>
      /colou?r/i.test(option.name),
    );
    product.variants.forEach((variant, i) => {
      const sameColour =
        colour &&
        variant.options.some(
          (option) =>
            option.name === colour.name && option.value === colour.value,
        );
      if (i === index || sameColour) onVariantChange(i, { image });
    });
  };

  return (
    <div className="grid gap-5">
      {errors.options && <p className="text-xs text-bad">{errors.options}</p>}

      {options.map((option, index) => {
        const preset = presetFor(option.name);
        return (
          <div
            className="rounded-xl border border-line bg-surface-muted/60 p-4"
            key={index}
          >
            <div className="grid gap-3 sm:grid-cols-[200px_minmax(0,1fr)_auto]">
              <Field label="Option name">
                <Input
                  list="option-names"
                  onChange={(event) =>
                    onOptionsChange(
                      options.map((item, i) =>
                        i === index
                          ? { ...item, name: event.target.value }
                          : item,
                      ),
                    )
                  }
                  placeholder="Size"
                  value={option.name}
                />
              </Field>
              <Field label="Values">
                <ChipInput
                  onChange={(values) =>
                    onOptionsChange(
                      options.map((item, i) =>
                        i === index ? { ...item, values } : item,
                      ),
                    )
                  }
                  placeholder="Type a value and press Enter"
                  suggestions={preset?.values ?? []}
                  values={option.values}
                />
              </Field>
              <div className="flex items-start pt-6">
                <Button
                  aria-label={`Remove ${option.name || "option"}`}
                  onClick={() =>
                    onOptionsChange(options.filter((_, i) => i !== index))
                  }
                  size="icon"
                  variant="danger-ghost"
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
      <datalist id="option-names">
        {nameSuggestions.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {options.length < MAX_OPTIONS && (
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => addOption()} size="sm" variant="secondary">
            <Plus /> Add option
          </Button>
          {presets
            .filter(
              (preset) =>
                !options.some(
                  (option) =>
                    option.name.toLowerCase() === preset.name.toLowerCase(),
                ),
            )
            .map((preset) => (
              <Button
                key={preset.id}
                onClick={() => addOption(preset.name, preset.values)}
                size="sm"
                variant="ghost"
              >
                <Sparkles /> {preset.name}
              </Button>
            ))}
        </div>
      )}

      {errors.variants && <p className="text-xs text-bad">{errors.variants}</p>}

      {product.variants.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted px-3 py-2">
            <p className="text-xs font-semibold text-brand-ink">
              {product.variants.length} variant
              {product.variants.length === 1 ? "" : "s"}
            </p>
            <div className="flex items-center gap-1.5">
              <input
                aria-label="Stock for all variants"
                className="h-7 w-20 rounded-md border border-line-strong px-2 text-xs outline-none focus:border-brand-primary"
                min={0}
                onChange={(event) =>
                  setBulkStock(
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
                placeholder="Stock"
                type="number"
                value={bulkStock ?? ""}
              />
              <Button
                disabled={bulkStock === null}
                onClick={() =>
                  product.variants.forEach((_, index) =>
                    onVariantChange(index, { stock: bulkStock ?? 0 }),
                  )
                }
                size="xs"
                variant="secondary"
              >
                <Copy /> Apply to all
              </Button>
              <Button
                onClick={() =>
                  product.variants.forEach((variant, index) =>
                    onVariantChange(index, {
                      sku: suggestSku(product.id, variant.options),
                    }),
                  )
                }
                size="xs"
                title="Generate SKUs from the product code"
                variant="ghost"
              >
                <Wand2 /> SKUs
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-180 text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-[0.06em] text-muted">
                  <th className="px-3 py-2">Variant</th>
                  <th className="px-2 py-2">SKU</th>
                  <th className="px-2 py-2">Price</th>
                  <th className="px-2 py-2">Sale</th>
                  <th className="px-2 py-2">Stock</th>
                  <th className="px-2 py-2">Image</th>
                  <th className="px-3 py-2 text-right">On sale</th>
                </tr>
              </thead>
              <tbody>
                {product.variants.map((variant, index) => (
                  <tr
                    className={cn(
                      "border-t border-line",
                      !variant.isActive && "bg-surface-muted/60 text-muted",
                    )}
                    key={variant.options.map((o) => o.value).join("/")}
                  >
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {variant.options.map((option) => (
                          <Badge key={option.name} tone="neutral">
                            {option.value}
                          </Badge>
                        ))}
                      </div>
                      {errors[`variants.${index}`] && (
                        <p className="mt-1 text-[11px] text-bad">
                          {errors[`variants.${index}`]}
                        </p>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      <input
                        aria-label="SKU"
                        className="h-8 w-36 rounded-md border border-line-strong bg-surface px-2 text-xs uppercase outline-none focus:border-brand-primary"
                        onChange={(event) =>
                          onVariantChange(index, {
                            sku: event.target.value.toUpperCase(),
                          })
                        }
                        value={variant.sku}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CompactNumber
                        label="Price"
                        onChange={(price) => onVariantChange(index, { price })}
                        placeholder={String(product.price)}
                        value={variant.price}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CompactNumber
                        disabled={variant.price === null}
                        error={errors[`variants.${index}.salePrice`]}
                        label="Sale price"
                        onChange={(salePrice) =>
                          onVariantChange(index, { salePrice })
                        }
                        placeholder={
                          variant.price === null
                            ? String(product.salePrice ?? "—")
                            : ""
                        }
                        value={variant.salePrice}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <CompactNumber
                        error={errors[`variants.${index}.stock`]}
                        label="Stock"
                        onChange={(stock) =>
                          onVariantChange(index, { stock: stock ?? 0 })
                        }
                        value={variant.stock}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <VariantImage
                        images={product.images}
                        onChange={(image) => setVariantImage(index, image)}
                        value={variant.image}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        aria-label="Available for sale"
                        checked={variant.isActive}
                        className="size-4 accent-brand-primary"
                        onChange={(event) =>
                          onVariantChange(index, {
                            isActive: event.target.checked,
                          })
                        }
                        type="checkbox"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-line bg-surface-muted px-3 py-2 text-[11px] text-muted">
            Leave price empty to use the product price. Untick a combination you
            don&apos;t make; it won&apos;t be offered.
          </p>
        </div>
      )}
    </div>
  );
}

function CompactNumber({
  value,
  onChange,
  label,
  placeholder,
  disabled,
  error,
}: {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}) {
  return (
    <input
      aria-invalid={Boolean(error)}
      aria-label={label}
      className="h-8 w-24 rounded-md border border-line-strong bg-surface px-2 text-xs outline-none focus:border-brand-primary disabled:bg-surface-muted aria-invalid:border-bad"
      disabled={disabled}
      min={0}
      onChange={(event) =>
        onChange(event.target.value === "" ? null : Number(event.target.value))
      }
      placeholder={placeholder}
      title={error}
      type="number"
      value={value ?? ""}
    />
  );
}

/** Picks one of the product's gallery images for a variant (e.g. the black one). */
function VariantImage({
  images,
  value,
  onChange,
}: {
  images: string[];
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  if (!images.length)
    return <span className="text-[11px] text-subtle">Add images first</span>;

  return (
    <div className="relative">
      <button
        aria-label="Choose variant image"
        className="relative grid size-8 place-items-center overflow-hidden rounded-md border border-line-strong bg-surface-muted text-subtle hover:border-brand-primary"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {value ? (
          <Image
            alt=""
            className="object-cover"
            fill
            sizes="32px"
            src={value}
          />
        ) : (
          <Plus className="size-3.5" />
        )}
      </button>
      {open && (
        <div className="absolute left-0 top-9 z-10 grid w-52 grid-cols-4 gap-1.5 rounded-lg border border-line bg-surface p-2 shadow-pop">
          <button
            className="grid aspect-square place-items-center rounded-md border border-dashed border-line-strong text-[10px] text-muted"
            onClick={() => (onChange(null), setOpen(false))}
            type="button"
          >
            None
          </button>
          {images.map((url) => (
            <button
              className={cn(
                "relative aspect-square overflow-hidden rounded-md border-2",
                url === value ? "border-brand-primary" : "border-transparent",
              )}
              key={url}
              onClick={() => (onChange(url), setOpen(false))}
              type="button"
            >
              <Image
                alt=""
                className="object-cover"
                fill
                sizes="48px"
                src={url}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
