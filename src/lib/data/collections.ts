import "server-only";
import { EMPTY_RULES, type CollectionInput, type RuleProduct } from "@/lib/collection-rules";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Collection, type CollectionDocument } from "@/lib/models/Collection";
import { Product, type ProductDocument } from "@/lib/models/Product";
import type { ProductType } from "@/lib/store-definitions";

/** Every product, in the light shape collection rules and pickers need. */
export async function getRuleProducts(): Promise<RuleProduct[]> {
  await connectToDatabase();
  const products = await Product.find(
    {},
    {
      name: 1, images: { $slice: 1 }, categorySlug: 1, subCategorySlug: 1, productType: 1, tags: 1,
      price: 1, finalPrice: 1, isFeatured: 1, isActive: 1, stock: 1, soldCount: 1, createdAt: 1,
    },
  ).lean<(ProductDocument & { _id: string })[]>();

  return products.map((product) => ({
    id: product._id,
    name: product.name,
    image: product.images?.[0] ?? null,
    categorySlug: product.categorySlug ?? "",
    subCategorySlug: product.subCategorySlug ?? null,
    productType: (product.productType ?? "leather") as ProductType,
    tags: product.tags ?? [],
    price: product.price,
    finalPrice: product.finalPrice ?? product.price,
    isFeatured: product.isFeatured ?? false,
    isActive: product.isActive ?? true,
    stock: product.stock,
    soldCount: product.soldCount ?? 0,
    createdAt: (product.createdAt ?? new Date(0)).toISOString(),
  }));
}

/** Categories and sub-categories as rule options. */
export async function getCategoryChoices() {
  await connectToDatabase();
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  return categories
    .filter((category) => !category.parent)
    .flatMap((category) => [
      { slug: category.slug, label: category.name },
      ...categories
        .filter((child) => String(child.parent) === String(category._id))
        .map((child) => ({ slug: child.slug, label: `${category.name} › ${child.name}` })),
    ]);
}

// ISO strings; the form converts to and from the browser's local time.
function dateInput(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

export function toCollectionInput(collection: CollectionDocument): CollectionInput {
  const rules = collection.rules;
  return {
    name: collection.name,
    slug: collection.slug,
    kind: collection.kind,
    eyebrow: collection.eyebrow ?? "",
    description: collection.description ?? "",
    image: collection.image ?? null,
    mode: collection.mode,
    productIds: collection.productIds ?? [],
    rules: {
      ...EMPTY_RULES,
      categories: rules?.categories ?? [],
      productTypes: (rules?.productTypes ?? []) as ProductType[],
      tags: rules?.tags ?? [],
      onSale: Boolean(rules?.onSale),
      featuredOnly: Boolean(rules?.featuredOnly),
      inStockOnly: Boolean(rules?.inStockOnly),
      newWithinDays: rules?.newWithinDays ?? null,
      minPrice: rules?.minPrice ?? null,
      maxPrice: rules?.maxPrice ?? null,
    },
    sort: collection.sort,
    startsAt: dateInput(collection.startsAt),
    endsAt: dateInput(collection.endsAt),
    isActive: collection.isActive ?? true,
    showOnHome: collection.showOnHome ?? false,
    homeLimit: collection.homeLimit ?? 8,
  };
}

export async function getCollectionInput(id: string) {
  await connectToDatabase();
  const collection = await Collection.findById(id).lean().catch(() => null);
  return collection ? toCollectionInput(collection) : null;
}
