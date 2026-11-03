import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ProductForm } from "@/components/products/ProductForm";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getAttributePresets, getCategoryOptions, getProductInput } from "@/lib/data/catalog";

export async function generateMetadata({ params }: PageProps<"/products/[id]">): Promise<Metadata> {
  return { title: `Edit ${decodeURIComponent((await params).id)}` };
}

export default async function EditProductPage({ params }: PageProps<"/products/[id]">) {
  await requireStaffPage();
  const id = decodeURIComponent((await params).id);
  const [product, categories, presets] = await Promise.all([
    getProductInput(id),
    getCategoryOptions(),
    getAttributePresets(),
  ]);
  if (!product) notFound();

  const storefront = process.env.STOREFRONT_URL;

  return (
    <>
      <PageHeader
        actions={
          storefront && product.isActive ? (
            <ButtonLink href={`${storefront}/product/${product.slug}`} rel="noreferrer" target="_blank" variant="secondary">
              <ExternalLink /> View in store
            </ButtonLink>
          ) : undefined
        }
        back={{ href: "/products", label: "All products" }}
        description={`Code ${product.id}`}
        title={product.name}
      />
      <ProductForm categories={categories} initial={product} key={product.id} originalId={product.id} presets={presets} />
    </>
  );
}
