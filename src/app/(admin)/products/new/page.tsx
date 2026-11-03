import type { Metadata } from "next";
import { ProductForm } from "@/components/products/ProductForm";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getAttributePresets, getCategoryOptions } from "@/lib/data/catalog";
import { emptyProduct } from "@/lib/product-input";

export const metadata: Metadata = { title: "Add product" };

export default async function NewProductPage({ searchParams }: PageProps<"/products/new">) {
  await requireStaffPage();
  const { type } = await searchParams;
  const [categories, presets] = await Promise.all([getCategoryOptions(), getAttributePresets()]);
  const initial = emptyProduct(type === "clothing" ? "clothing" : "leather");

  return (
    <>
      <PageHeader
        back={{ href: "/products", label: "All products" }}
        description="Choose leather goods or clothing; the form suggests the right details and options for each."
        title="Add product"
      />
      <ProductForm categories={categories} initial={initial} originalId={null} presets={presets} />
    </>
  );
}
