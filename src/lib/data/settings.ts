import "server-only";
import type { ContentSettings, FooterSettings, GeneralSettings, NavbarSettings, ShippingSettings } from "@/lib/actions/settings";
import { connectToDatabase } from "@/lib/db";
import { STORE_SETTINGS_ID, StoreSettings } from "@/lib/models/StoreSettings";

// Matches the storefront's defaults (customer/lib/catalog.ts) for anything not saved yet.
const DEFAULT_SHIPPING = [
  { value: "insideDhaka", label: "Inside Dhaka", eta: "Delivered in 2–3 working days", cost: 70, isActive: true },
  { value: "dhakaSubAreas", label: "Dhaka Sub Areas", eta: "Tongi, Gazipur, Savar, Keraniganj, Narayanganj, Kaliganj", cost: 100, isActive: true },
  { value: "outsideDhaka", label: "Outside Dhaka", eta: "Delivered in 2–4 working days", cost: 120, isActive: true },
];

// The storefront navbar and footer built-in texts and links (customer/lib/catalog.ts), shown
// until the admin saves the Navbar or Footer tab.
const STOREFRONT_DEFAULTS = {
  phoneLabel: "Order inquiry",
  tagline: "Thoughtfully made leather goods and everyday accessories.",
  shopHeading: "Shop",
  helpHeading: "Help",
  policiesHeading: "Policies",
  helpLinks: [
    { label: "About us", href: "/about", isActive: true },
    { label: "Contact us", href: "/contact", isActive: true },
    { label: "FAQ", href: "/faq", isActive: true },
    { label: "Track your order", href: "/track", isActive: true },
    { label: "My account", href: "/account", isActive: true },
  ],
  policyLinks: [
    { label: "Terms & conditions", href: "/terms", isActive: true },
    { label: "Privacy policy", href: "/privacy-policy", isActive: true },
    { label: "Shipping & delivery", href: "/shipping-policy", isActive: true },
    { label: "Return & refund", href: "/return-policy", isActive: true },
    { label: "Warranty", href: "/warranty", isActive: true },
  ],
  badgeText: "Cash on delivery inside Dhaka · Delivery all over Bangladesh",
};

export async function getSettings(): Promise<GeneralSettings & ShippingSettings & ContentSettings & NavbarSettings & FooterSettings> {
  await connectToDatabase();
  const settings = await StoreSettings.findById(STORE_SETTINGS_ID).lean();

  return {
    storeName: settings?.storeName || "Brobazz",
    tagline: settings?.tagline || STOREFRONT_DEFAULTS.tagline,
    headerLogo: settings?.branding?.headerLogo || null,
    footerLogo: settings?.branding?.footerLogo || null,
    phoneLabel: settings?.header?.phoneLabel ?? STOREFRONT_DEFAULTS.phoneLabel,
    shopHeading: settings?.footer?.shopHeading ?? STOREFRONT_DEFAULTS.shopHeading,
    helpHeading: settings?.footer?.helpHeading ?? STOREFRONT_DEFAULTS.helpHeading,
    policiesHeading: settings?.footer?.policiesHeading ?? STOREFRONT_DEFAULTS.policiesHeading,
    helpLinks: settings?.footer?.helpLinks
      ? settings.footer.helpLinks.map(({ label, href, isActive }) => ({ label, href, isActive: isActive ?? true }))
      : STOREFRONT_DEFAULTS.helpLinks,
    policyLinks: settings?.footer?.policyLinks
      ? settings.footer.policyLinks.map(({ label, href, isActive }) => ({ label, href, isActive: isActive ?? true }))
      : STOREFRONT_DEFAULTS.policyLinks,
    badgeText: settings?.footer?.badgeText ?? STOREFRONT_DEFAULTS.badgeText,
    copyright: settings?.footer?.copyright ?? "",
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
