import "server-only";
import type { ContentSettings, GeneralSettings, ShippingSettings } from "@/lib/actions/settings";
import { connectToDatabase } from "@/lib/db";
import { STORE_SETTINGS_ID, StoreSettings } from "@/lib/models/StoreSettings";

// Matches the storefront's defaults (customer/lib/catalog.ts) for anything not saved yet.
const DEFAULT_SHIPPING = [
  { value: "insideDhaka", label: "Inside Dhaka", eta: "Delivered in 24–48 hours", cost: 70, isActive: true },
  { value: "dhakaSubAreas", label: "Dhaka Sub Areas", eta: "Tongi, Gazipur, Savar, Keraniganj, Narayanganj, Kaliganj", cost: 100, isActive: true },
  { value: "outsideDhaka", label: "Outside Dhaka", eta: "Delivered in 2–4 business days", cost: 130, isActive: true },
];

export async function getSettings(): Promise<GeneralSettings & ShippingSettings & ContentSettings> {
  await connectToDatabase();
  const settings = await StoreSettings.findById(STORE_SETTINGS_ID).lean();

  return {
    storeName: settings?.storeName || "Brobazz",
    tagline: settings?.tagline ?? "",
    supportPhone: settings?.supportPhone ?? "",
    supportEmail: settings?.supportEmail ?? "",
    whatsapp: settings?.whatsapp ?? "",
    address: settings?.address ?? "",
    socials: {
      facebook: settings?.socials?.facebook ?? "",
      instagram: settings?.socials?.instagram ?? "",
      tiktok: settings?.socials?.tiktok ?? "",
      youtube: settings?.socials?.youtube ?? "",
    },
    shippingPolicy: settings?.shippingPolicy ?? "",
    returnPolicy: settings?.returnPolicy ?? "",
    shippingOptions: settings?.shippingOptions?.length
      ? settings.shippingOptions.map(({ value, label, eta, cost, isActive }) => ({ value, label, eta: eta ?? "", cost, isActive: isActive ?? true }))
      : DEFAULT_SHIPPING,
    freeShippingThreshold: settings?.freeShippingThreshold ?? null,
    announcements: (settings?.announcements ?? []).map(({ text, link, isActive }) => ({ text, link: link ?? "", isActive: isActive ?? true })),
    navSpotlight: {
      label: settings?.navSpotlight?.label ?? "Flash sale",
      href: settings?.navSpotlight?.href ?? "/collections/flash-sale",
    },
    heroSlides: (settings?.heroSlides ?? []).map((slide) => ({
      image: slide.image,
      mobileImage: slide.mobileImage ?? null,
      title: slide.title ?? "",
      subtitle: slide.subtitle ?? "",
      ctaLabel: slide.ctaLabel ?? "",
      ctaHref: slide.ctaHref ?? "",
      isActive: slide.isActive ?? true,
    })),
  };
}
