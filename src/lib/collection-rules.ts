// Which products a smart collection contains. Mirrors collectionProducts() in
// customer/lib/catalog.ts so the admin preview matches the storefront.
import type { CollectionKind, CollectionSort, ProductType } from "@/lib/store-definitions";

export type CollectionRules = {
  categories: string[];
  productTypes: ProductType[];
  tags: string[];
  onSale: boolean;
  featuredOnly: boolean;
  inStockOnly: boolean;
  newWithinDays: number | null;
  minPrice: number | null;
  maxPrice: number | null;
};

export type CollectionInput = {
  name: string;
  slug: string;
  kind: CollectionKind;
  eyebrow: string;
  description: string;
  image: string | null;
  mode: "manual" | "smart";
  productIds: string[];
  rules: CollectionRules;
  sort: CollectionSort;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  showOnHome: boolean;
  homeLimit: number;
};

/** The product fields rules look at. */
export type RuleProduct = {
  id: string;
  name: string;
  image: string | null;
  categorySlug: string;
  subCategorySlug: string | null;
  productType: ProductType;
  tags: string[];
  price: number;
  finalPrice: number;
  isFeatured: boolean;
  isActive: boolean;
  stock: number;
  soldCount: number;
  createdAt: string;
};

export const EMPTY_RULES: CollectionRules = {
  categories: [],
  productTypes: [],
  tags: [],
  onSale: false,
  featuredOnly: false,
  inStockOnly: true,
  newWithinDays: null,
  minPrice: null,
  maxPrice: null,
};

const DAY = 24 * 60 * 60 * 1000;

export function matchesRules(product: RuleProduct, rules: CollectionRules, now = Date.now()) {
  if (
    rules.categories.length &&
    !rules.categories.includes(product.categorySlug) &&
    !(product.subCategorySlug && rules.categories.includes(product.subCategorySlug))
  ) {
    return false;
  }
  if (rules.productTypes.length && !rules.productTypes.includes(product.productType)) return false;
  if (rules.tags.length && !rules.tags.some((tag) => product.tags.includes(tag))) return false;
  if (rules.onSale && !(product.finalPrice < product.price)) return false;
  if (rules.featuredOnly && !product.isFeatured) return false;
  if (rules.inStockOnly && product.stock < 1) return false;
  if (rules.newWithinDays && now - Date.parse(product.createdAt) > rules.newWithinDays * DAY) return false;
  if (rules.minPrice !== null && product.finalPrice < rules.minPrice) return false;
  if (rules.maxPrice !== null && product.finalPrice > rules.maxPrice) return false;
  return true;
}

export function sortForCollection(products: RuleProduct[], sort: CollectionSort) {
  const sorted = [...products];
  switch (sort) {
    case "best-selling":
      return sorted.sort((a, b) => b.soldCount - a.soldCount || Date.parse(b.createdAt) - Date.parse(a.createdAt));
    case "price-asc":
      return sorted.sort((a, b) => a.finalPrice - b.finalPrice);
    case "price-desc":
      return sorted.sort((a, b) => b.finalPrice - a.finalPrice);
    case "manual":
      return sorted;
    default:
      return sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
}

/** The collection's visible products, in storefront order. */
export function resolveCollection(collection: Pick<CollectionInput, "mode" | "productIds" | "rules" | "sort">, products: RuleProduct[]) {
  const live = products.filter((product) => product.isActive);
  if (collection.mode === "manual") {
    const byId = new Map(live.map((product) => [product.id, product]));
    const picked = collection.productIds.flatMap((id) => byId.get(id) ?? []);
    return collection.sort === "manual" ? picked : sortForCollection(picked, collection.sort);
  }
  return sortForCollection(
    live.filter((product) => matchesRules(product, collection.rules)),
    collection.sort,
  );
}

export const collectionKindLabels: Record<CollectionKind, string> = {
  collection: "Collection",
  season: "Season",
  campaign: "Campaign",
};

export const collectionSortLabels: Record<CollectionSort, string> = {
  manual: "Manual order",
  new: "Newest first",
  "best-selling": "Best selling",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
};
