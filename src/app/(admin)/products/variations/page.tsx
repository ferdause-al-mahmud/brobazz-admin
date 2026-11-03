import type { Metadata } from "next";
import { VariationsManager } from "@/components/products/VariationsManager";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getAttributePresets } from "@/lib/data/catalog";

export const metadata: Metadata = { title: "Variations" };

export default async function VariationsPage() {
  await requireStaffPage();
  const presets = await getAttributePresets();

  return (
    <>
      <PageHeader
        description="Reusable options such as clothing sizes, belt sizes or colours. Adding one to a product fills in its values; products keep their own copy."
        title="Variations"
      />
      <VariationsManager presets={presets} />
    </>
  );
}
