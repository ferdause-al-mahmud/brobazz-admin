import type { Metadata } from "next";
import {
  FooterSettingsForm,
  GeneralSettingsForm,
  NavbarSettingsForm,
  ShippingSettingsForm,
} from "@/components/settings/SettingsForms";
import { PageHeader } from "@/components/ui/Page";
import { LinkTabs } from "@/components/ui/Tabs";
import { requireStaffPage } from "@/lib/auth/session";
import { getSettings } from "@/lib/data/settings";

export const metadata: Metadata = { title: "Settings" };

const TABS = [
  { value: "store", label: "Store details" },
  { value: "delivery", label: "Delivery" },
  { value: "navbar", label: "Navbar" },
  { value: "footer", label: "Footer" },
] as const;

type Tab = (typeof TABS)[number]["value"];

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  await requireStaffPage({ adminOnly: true });
  const { tab: tabParam } = await searchParams;
  const tab: Tab = TABS.find((item) => item.value === tabParam)?.value ?? "store";
  const settings = await getSettings();

  return (
    <>
      <PageHeader description="Store details, delivery charges, and the storefront navbar and footer." title="Settings" />
      <div className="mb-6 border-b border-line">
        <LinkTabs
          active={tab}
          tabs={TABS.map((item) => ({ ...item, href: item.value === "store" ? "/settings" : `/settings?tab=${item.value}` }))}
        />
      </div>

      {tab === "store" && <GeneralSettingsForm initial={settings} />}
      {tab === "delivery" && (
        <ShippingSettingsForm initial={{ shippingOptions: settings.shippingOptions, freeShippingThreshold: settings.freeShippingThreshold }} />
      )}
      {tab === "navbar" && <NavbarSettingsForm initial={{ headerLogo: settings.headerLogo, phoneLabel: settings.phoneLabel }} />}
      {tab === "footer" && (
        <FooterSettingsForm
          initial={{
            footerLogo: settings.footerLogo,
            tagline: settings.tagline,
            shopHeading: settings.shopHeading,
            helpHeading: settings.helpHeading,
            policiesHeading: settings.policiesHeading,
            helpLinks: settings.helpLinks,
            policyLinks: settings.policyLinks,
            badgeText: settings.badgeText,
            copyright: settings.copyright,
          }}
          storeName={settings.storeName}
        />
      )}
    </>
  );
}
