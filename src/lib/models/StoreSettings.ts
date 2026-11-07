import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";

// Identical in customer/lib/models/StoreSettings.ts — change both together.
//
// One document (_id "store") holding everything the admin can change about the storefront
// that isn't a product, category or collection.
export const STORE_SETTINGS_ID = "store";

const shippingOptionSchema = new Schema(
  {
    // Stored on orders, so keep it stable once used ("insideDhaka").
    value: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    eta: { type: String, default: "" },
    cost: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const announcementSchema = new Schema(
  {
    text: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const heroSlideSchema = new Schema(
  {
    image: { type: String, required: true },
    mobileImage: { type: String },
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    ctaLabel: { type: String, default: "" },
    ctaHref: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

// A link in one of the footer's columns.
const footerLinkSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    href: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { _id: false },
);

const storeSettingsSchema = new Schema(
  {
    _id: { type: String, default: STORE_SETTINGS_ID },
    storeName: { type: String, default: "Brobazz" },
    // The short description under the footer logo.
    tagline: { type: String, default: "" },
    supportPhone: { type: String, default: "" },
    supportEmail: { type: String, default: "" },
    whatsapp: { type: String, default: "" },
    address: { type: String, default: "" },
    socials: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      tiktok: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
    // Uploaded logo URLs; empty means the storefront's built-in logo.
    branding: {
      headerLogo: { type: String, default: "" },
      footerLogo: { type: String, default: "" },
    },
    header: {
      // Small text above the phone number in the navbar.
      phoneLabel: { type: String },
    },
    // Footer texts and links. Anything never saved falls back to the storefront's defaults, so
    // the link lists default to undefined (not []) to tell "never set" apart from "all removed".
    footer: {
      shopHeading: { type: String },
      helpHeading: { type: String },
      policiesHeading: { type: String },
      helpLinks: { type: [footerLinkSchema], default: undefined },
      policyLinks: { type: [footerLinkSchema], default: undefined },
      // The pill under the policy links; empty hides it.
      badgeText: { type: String },
      // Empty means "© 2026 <store name>. All rights reserved."
      copyright: { type: String },
    },
    announcements: { type: [announcementSchema], default: [] },
    // The highlighted button at the end of the category bar; hidden when the label is empty.
    navSpotlight: {
      label: { type: String, default: "Flash sale" },
      href: { type: String, default: "/collections/flash-sale" },
    },
    heroSlides: { type: [heroSlideSchema], default: [] },
    shippingOptions: { type: [shippingOptionSchema], default: [] },
    // Orders at or above this subtotal ship free; null turns it off.
    freeShippingThreshold: { type: Number, min: 0, default: null },
    shippingPolicy: { type: String, default: "" },
    returnPolicy: { type: String, default: "" },
  },
  { timestamps: true },
);

export type StoreSettingsDocument = InferSchemaType<typeof storeSettingsSchema>;

const createStoreSettingsModel = () => model("StoreSettings", storeSettingsSchema);

export const StoreSettings =
  (models.StoreSettings as ReturnType<typeof createStoreSettingsModel> | undefined) ??
  createStoreSettingsModel();
