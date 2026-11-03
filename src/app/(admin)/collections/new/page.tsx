import type { Metadata } from "next";
import { CollectionForm } from "@/components/collections/CollectionForm";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { EMPTY_RULES, type CollectionInput } from "@/lib/collection-rules";
import { getCategoryChoices, getRuleProducts } from "@/lib/data/collections";

export const metadata: Metadata = { title: "New collection" };

const blank: CollectionInput = {
  name: "",
  slug: "",
  kind: "collection",
  eyebrow: "",
  description: "",
  image: null,
  mode: "smart",
  productIds: [],
  rules: EMPTY_RULES,
  sort: "new",
  startsAt: null,
  endsAt: null,
  isActive: true,
  showOnHome: false,
  homeLimit: 8,
};

export default async function NewCollectionPage() {
  await requireStaffPage();
  const [products, categories] = await Promise.all([getRuleProducts(), getCategoryChoices()]);

  return (
    <>
      <PageHeader back={{ href: "/collections", label: "Collections" }} title="New collection" />
      <CollectionForm categories={categories} id={null} initial={blank} products={products} />
    </>
  );
}
