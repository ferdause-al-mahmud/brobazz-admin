import type { Metadata } from "next";
import { CategoryManager, type CategoryRow } from "@/components/products/CategoryManager";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Category } from "@/lib/models/Category";
import { Product } from "@/lib/models/Product";
import type { ProductType } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const user = await requireStaffPage();
  await connectToDatabase();
  const [categories, categoryCounts, subCounts] = await Promise.all([
    Category.find().sort({ sortOrder: 1, name: 1 }).lean(),
    Product.aggregate<{ _id: string; count: number }>([{ $group: { _id: "$categorySlug", count: { $sum: 1 } } }]),
    Product.aggregate<{ _id: string; count: number }>([
      { $match: { subCategorySlug: { $ne: null } } },
      { $group: { _id: "$subCategorySlug", count: { $sum: 1 } } },
    ]),
  ]);
  const counts = new Map([...categoryCounts, ...subCounts].map(({ _id, count }) => [_id, count]));

  const toRow = (category: (typeof categories)[number]): CategoryRow => ({
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    parentId: category.parent ? String(category.parent) : null,
    description: category.description ?? "",
    image: category.image ?? null,
    productType: (category.productType as ProductType | null) ?? null,
    isActive: category.isActive ?? true,
    showInNav: category.showInNav ?? true,
    showOnHome: category.showOnHome ?? false,
    productCount: counts.get(category.slug) ?? 0,
  });

  const rows = categories.filter((category) => !category.parent).map((category) => ({
    ...toRow(category),
    children: categories.filter((child) => String(child.parent) === String(category._id)).map(toRow),
  }));

  // Categories products use that haven't been set up here (e.g. imported products).
  const known = new Set(categories.map((category) => category.slug));
  const unmanaged = categoryCounts.filter(({ _id }) => _id && !known.has(_id));

  return (
    <>
      <PageHeader
        description="Organise products into categories and sub-categories. They drive the storefront menu, category pages and homepage tiles."
        title="Categories"
      />
      <CategoryManager canDelete={user.role === "admin"} rows={rows} unmanaged={unmanaged.map(({ _id, count }) => ({ slug: _id, count }))} />
    </>
  );
}
