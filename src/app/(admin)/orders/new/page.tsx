import type { Metadata } from "next";
import { ManualOrderForm } from "@/components/orders/ManualOrderForm";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";
import { connectToDatabase } from "@/lib/db";
import { getPickerProducts } from "@/lib/order-create";

export const metadata: Metadata = { title: "New order" };

export default async function NewOrderPage() {
  await requireStaffPage();
  await connectToDatabase();
  const [products, settings] = await Promise.all([getPickerProducts(), getSettings()]);

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
