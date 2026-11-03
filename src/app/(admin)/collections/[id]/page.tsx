import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { ButtonLink } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getCategoryChoices, getCollectionInput, getRuleProducts } from "@/lib/data/collections";

export const metadata: Metadata = { title: "Edit collection" };

export default async function EditCollectionPage({ params }: PageProps<"/collections/[id]">) {
  await requireStaffPage();
  const { id } = await params;
  const [collection, products, categories] = await Promise.all([getCollectionInput(id), getRuleProducts(), getCategoryChoices()]);
  if (!collection) notFound();
  const storefront = process.env.STOREFRONT_URL;

  return (
    <>
      <PageHeader
        actions={
          storefront ? (
            <ButtonLink href={`${storefront}/collections/${collection.slug}`} rel="noreferrer" target="_blank" variant="secondary">
              <ExternalLink /> View in store
            </ButtonLink>
          ) : undefined
        }
        back={{ href: "/collections", label: "Collections" }}
        title={collection.name}
      />
      <CollectionForm categories={categories} id={id} initial={collection} key={id} products={products} />
    </>
  );
}
