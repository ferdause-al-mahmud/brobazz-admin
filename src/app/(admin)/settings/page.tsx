import type { Metadata } from "next";
import { GeneralSettingsForm, ShippingSettingsForm } from "@/components/settings/SettingsForms";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireStaffPage({ adminOnly: true });
  const settings = await getSettings();

  return (
    <>
      <PageHeader description="Store details, delivery charges and policies used across the storefront." title="Settings" />
      <div className="grid gap-6">
        <ShippingSettingsForm initial={{ shippingOptions: settings.shippingOptions, freeShippingThreshold: settings.freeShippingThreshold }} />
        <GeneralSettingsForm initial={settings} />
      </div>
    </>
  );
}
