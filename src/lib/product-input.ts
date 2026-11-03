// What the product form edits and sends to saveProduct(). Client-safe (no server imports).
import type { OptionValue, ProductType } from "@/lib/store-definitions";

export type VariantInput = {
  /** The stored variant's id; null for a variant that hasn't been saved yet. */
  id: string | null;
  sku: string;
  options: OptionValue[];
  /** null = use the product's price. */
  price: number | null;
  salePrice: number | null;
  stock: number;
  image: string | null;
  isActive: boolean;
};

export type ProductInput = {
  id: string;
  slug: string;
  name: string;
  productType: ProductType;
  category: string;
  subCategory: string;
  tags: string[];
  description: string;
  materials: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  sizeChart: string | null;
  price: number;
  salePrice: number | null;
  costPrice: number | null;
  options: { name: string; values: string[] }[];
  variants: VariantInput[];
  stock: number;
  lowStockThreshold: number;
  images: string[];
  isActive: boolean;
  isFeatured: boolean;
  seo: { title: string; description: string };
};

export const MAX_OPTIONS = 3;

export function emptyProduct(productType: ProductType = "leather"): ProductInput {
  return {
    id: "",
    slug: "",
    name: "",
    productType,
    category: "",
    subCategory: "",
    tags: [],
    description: "",
    materials: "",
    highlights: [],
    specs: [],
    sizeChart: null,
    price: 0,
    salePrice: null,
    costPrice: null,
    options: [],
    variants: [],
    stock: 0,
    lowStockThreshold: 5,
    images: [],
    isActive: true,
    isFeatured: false,
    seo: { title: "", description: "" },
  };
}

/** Detail rows suggested for each product type; the admin can add any others. */
export const SPEC_SUGGESTIONS: Record<ProductType, string[]> = {
  leather: ["Leather type", "Finish", "Dimensions", "Card slots", "Closure", "Lining", "Warranty"],
  clothing: ["Fabric", "Fit", "Sleeve", "Neck", "Care", "Gender", "Model wears"],
};

/** Option names suggested for each product type when no presets exist yet. */
export const OPTION_SUGGESTIONS: Record<ProductType, string[]> = {
  leather: ["Color", "Size"],
  clothing: ["Size", "Color"],
};

export function variantKey(options: OptionValue[]) {
  return options.map((option) => `${option.name}=${option.value}`).join("|");
}

/**
 * Every combination of the option values, reusing what was already entered for combinations
 * that still exist (so editing an option keeps prices and stock of the other variants).
 */
export function buildVariantMatrix(
  options: ProductInput["options"],
  existing: VariantInput[],
  productCode: string,
): VariantInput[] {
  const usable = options.filter((option) => option.name.trim() && option.values.length);
  if (!usable.length) return [];

  let combinations: OptionValue[][] = [[]];
  for (const option of usable) {
    combinations = combinations.flatMap((combo) =>
      option.values.map((value) => [...combo, { name: option.name.trim(), value }]),
    );
  }

  const byKey = new Map(existing.map((variant) => [variantKey(variant.options), variant]));
  return combinations.map((combo) => {
    const previous = byKey.get(variantKey(combo));
    if (previous) return { ...previous, options: combo };
    return {
      id: null,
      sku: suggestSku(productCode, combo),
      options: combo,
      price: null,
      salePrice: null,
      stock: 0,
      image: null,
      isActive: true,
    };
  });
}

/** "BIF-001" + Black / M → "BIF-001-BLK-M" */
export function suggestSku(productCode: string, options: OptionValue[]) {
  const parts = options.map(({ value }) => {
    const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return /^\d+$/.test(clean) || clean.length <= 3 ? clean : clean.replace(/[AEIOU]/g, "").slice(0, 3) || clean.slice(0, 3);
  });
  return [productCode.toUpperCase(), ...parts].filter(Boolean).join("-");
}
