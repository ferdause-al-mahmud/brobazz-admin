import "server-only";
import { connectToDatabase } from "@/lib/db";
import { Attribute } from "@/lib/models/Attribute";
import { Category } from "@/lib/models/Category";
import { Product, type ProductDocument } from "@/lib/models/Product";
import { emptyProduct, type ProductInput } from "@/lib/product-input";
import type { ProductType } from "@/lib/store-definitions";
import type { AttributePreset, CategoryOption } from "@/components/products/ProductForm";

/** Categories with their sub-categories, for pickers. */
export async function getCategoryOptions(): Promise<CategoryOption[]> {
  await connectToDatabase();
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 }).lean();
  return categories
    .filter((category) => !category.parent)
    .map((category) => ({
      name: category.name,
      productType: (category.productType as ProductType | null) ?? null,
      subCategories: categories
        .filter((child) => String(child.parent) === String(category._id))
        .map((child) => child.name),
    }));
}

export async function getAttributePresets(): Promise<AttributePreset[]> {
  await connectToDatabase();
  const presets = await Attribute.find().sort({ sortOrder: 1, name: 1 }).lean();
  return presets.map((preset) => ({
    id: String(preset._id),
    name: preset.name,
    values: preset.values,
    productTypes: preset.productTypes,
  }));
}

type StoredProduct = ProductDocument & { _id: string };

/** A stored product in the shape the product form edits. */
export function toProductInput(product: StoredProduct): ProductInput {
  return {
    ...emptyProduct(),
    id: product._id,
    slug: product.slug,
    name: product.name,
    productType: (product.productType ?? "leather") as ProductType,
    category: product.category,
    subCategory: product.subCategory ?? "",
    tags: product.tags ?? [],
    description: product.description ?? "",
    materials: product.materials ?? "",
    highlights: product.highlights ?? [],
    specs: (product.specs ?? []).map(({ label, value }) => ({ label, value })),
    sizeChart: product.sizeChart ?? null,
    price: product.price,
    salePrice: product.salePrice ?? null,
    costPrice: product.costPrice ?? null,
    options: (product.options ?? []).map(({ name, values }) => ({ name, values: [...values] })),
    variants: (product.variants ?? []).map((variant) => ({
      id: String((variant as { _id?: unknown })._id ?? ""),
      sku: variant.sku ?? "",
      options: variant.options.map(({ name, value }) => ({ name, value })),
      price: variant.price ?? null,
      salePrice: variant.salePrice ?? null,
      stock: variant.stock,
      image: variant.image ?? null,
      isActive: variant.isActive ?? true,
    })),
    stock: product.stock,
    lowStockThreshold: product.lowStockThreshold ?? 5,
    images: product.images ?? [],
    isActive: product.isActive ?? true,
    isFeatured: product.isFeatured ?? false,
    seo: { title: product.seo?.title ?? "", description: product.seo?.description ?? "" },
  };
}

export async function getProductInput(id: string) {
  await connectToDatabase();
  const product = await Product.findById(id.toUpperCase()).lean<StoredProduct>();
  return product ? toProductInput(product) : null;
}
