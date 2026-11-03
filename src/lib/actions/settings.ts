"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { STORE_SETTINGS_ID, StoreSettings } from "@/lib/models/StoreSettings";
import { revalidateStorefront } from "@/lib/revalidate";
import { InputError, runAction } from "./result";

export type GeneralSettings = {
  storeName: string;
  tagline: string;
  supportPhone: string;
  supportEmail: string;
  whatsapp: string;
  address: string;
  socials: { facebook: string; instagram: string; tiktok: string; youtube: string };
  shippingPolicy: string;
  returnPolicy: string;
};

export type ShippingSettings = {
  shippingOptions: { value: string; label: string; eta: string; cost: number; isActive: boolean }[];
  freeShippingThreshold: number | null;
};

export type ContentSettings = {
  announcements: { text: string; link: string; isActive: boolean }[];
  navSpotlight: { label: string; href: string };
  heroSlides: {
    image: string;
    mobileImage: string | null;
    title: string;
    subtitle: string;
    ctaLabel: string;
    ctaHref: string;
    isActive: boolean;
  }[];
};

/** Links may point inside the store ("/collections/eid") or to another site (https://…). */
function checkLink(value: string, field: string, errors: Record<string, string>) {
  const link = value.trim();
  if (link && !/^(\/|https?:\/\/)/.test(link)) errors[field] = "Start with / for a store page, or https://";
  return link;
}

/** "Inside Chattogram" → "insideChattogram" */
function camelCase(label: string) {
  return label
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((word, index) => (index ? word[0].toUpperCase() + word.slice(1) : word))
    .join("");
}

async function save(fields: Record<string, unknown>, userId: string) {
  await connectToDatabase();
  await StoreSettings.updateOne({ _id: STORE_SETTINGS_ID }, { $set: fields }, { upsert: true, runValidators: true });
  revalidatePath("/settings");
  revalidatePath("/content");
  await revalidateStorefront(["settings"], userId);
}

export async function saveGeneralSettings(input: GeneralSettings) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    const errors: Record<string, string> = {};
    if (!input.storeName.trim()) errors.storeName = "Enter the store name";
    if (input.supportEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.supportEmail.trim())) {
      errors.supportEmail = "Enter a valid email";
    }
    const socials = Object.fromEntries(
      Object.entries(input.socials).map(([key, value]) => [key, checkLink(value, `socials.${key}`, errors)]),
    );
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    await save(
      {
        storeName: input.storeName.trim(),
        tagline: input.tagline.trim(),
        supportPhone: input.supportPhone.trim(),
        supportEmail: input.supportEmail.trim(),
        // wa.me links need digits only, with the country code.
        whatsapp: input.whatsapp.replace(/\D/g, ""),
        address: input.address.trim(),
        socials,
        shippingPolicy: input.shippingPolicy.trim(),
        returnPolicy: input.returnPolicy.trim(),
      },
      user.id,
    );
  }, "Settings saved");
}

export async function saveShippingSettings(input: ShippingSettings) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    const errors: Record<string, string> = {};
    const options = input.shippingOptions.map((option, index) => {
      const label = option.label.trim();
      if (!label) errors[`shippingOptions.${index}.label`] = "Enter a name";
      if (!Number.isFinite(option.cost) || option.cost < 0) errors[`shippingOptions.${index}.cost`] = "Enter 0 or more";
      return {
        // The value is stored on orders, so it stays fixed once created.
        value: option.value.trim() || camelCase(label),
        label,
        eta: option.eta.trim(),
        cost: Math.round(option.cost),
        isActive: option.isActive,
      };
    });
    if (!options.some((option) => option.isActive)) errors.shippingOptions = "Keep at least one delivery option on";
    if (new Set(options.map((option) => option.value)).size !== options.length) errors.shippingOptions = "Each option needs a different name";
    if (input.freeShippingThreshold !== null && input.freeShippingThreshold < 0) errors.freeShippingThreshold = "Enter 0 or more";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    await save({ shippingOptions: options, freeShippingThreshold: input.freeShippingThreshold }, user.id);
  }, "Delivery settings saved");
}

export async function saveContentSettings(input: ContentSettings) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    const errors: Record<string, string> = {};
    const announcements = input.announcements
      .map((announcement, index) => ({
        text: announcement.text.trim(),
        link: checkLink(announcement.link, `announcements.${index}.link`, errors) || undefined,
        isActive: announcement.isActive,
      }))
      .filter((announcement) => announcement.text);
    const heroSlides = input.heroSlides.map((slide, index) => {
      if (!slide.image) errors[`heroSlides.${index}.image`] = "Add an image";
      return {
        image: slide.image,
        mobileImage: slide.mobileImage || undefined,
        title: slide.title.trim(),
        subtitle: slide.subtitle.trim(),
        ctaLabel: slide.ctaLabel.trim(),
        ctaHref: checkLink(slide.ctaHref, `heroSlides.${index}.ctaHref`, errors),
        isActive: slide.isActive,
      };
    });
    const navSpotlight = {
      label: input.navSpotlight.label.trim(),
      href: checkLink(input.navSpotlight.href, "navSpotlight.href", errors),
    };
    if (navSpotlight.label && !navSpotlight.href) errors["navSpotlight.href"] = "Add a link for the button";
    if (Object.keys(errors).length) throw new InputError("Please fix the highlighted fields", errors);

    await save({ announcements, heroSlides, navSpotlight }, user.id);
  }, "Store content saved");
}
