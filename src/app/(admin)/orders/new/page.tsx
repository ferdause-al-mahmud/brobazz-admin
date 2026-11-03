import type { Metadata } from "next";
import { ManualOrderForm } from "@/components/orders/ManualOrderForm";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";
import { connectToDatabase } from "@/lib/db";
import type { PickerProduct } from "@/lib/manual-order";
import { Product, type ProductDocument } from "@/lib/models/Product";
import { effectivePrice, variantLabel, variantPricing } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage() {
  await requireStaffPage();
  await connectToDatabase();
  const [stored, settings] = await Promise.all([
    Product.find({ isActive: true }).sort({ name: 1 }).lean<(ProductDocument & { _id: string })[]>(),
    getSettings(),
  ]);

  const products: PickerProduct[] = stored.map((product) => ({
    id: product._id,
    name: product.name,
    image: product.images[0] ?? null,
    price: product.finalPrice ?? effectivePrice(product),
    stock: product.stock,
    variants: product.variants
      .filter((variant) => variant.isActive)
      .map((variant) => ({
        id: String((variant as { _id?: unknown })._id),
        label: variantLabel(variant.options),
        price: effectivePrice(variantPricing(product, variant)),
        stock: variant.stock,
        image: variant.image ?? null,
      })),
  }));

  return (
    <>
      <PageHeader
        back={{ href: "/orders", label: "Orders" }}
        description="For orders taken by phone, Facebook, WhatsApp or in person. It gets a normal order number and appears with website orders."
        title="New order"
      />
      <ManualOrderForm
        products={products}
        shippingOptions={settings.shippingOptions.filter((option) => option.isActive).map(({ value, label, cost }) => ({ value, label, cost }))}
      />
    </>
  );
}
