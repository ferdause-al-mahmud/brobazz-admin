import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { COLLECTION_KINDS, COLLECTION_SORTS, PRODUCT_TYPES } from "@/lib/store-definitions";

// Identical in customer/lib/models/Collection.ts — change both together.
//
// A curated group of products shown at /collections/<slug>: an evergreen edit ("Best Sellers"),
// a season ("Winter 26") or a campaign ("Eid Sale"). Products are either picked by hand
// (`productIds`) or matched by `rules`.
const collectionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    kind: { type: String, enum: COLLECTION_KINDS, default: "collection" },
    eyebrow: { type: String, trim: true, default: "" },
    description: { type: String, default: "" },
    image: { type: String },
    mode: { type: String, enum: ["manual", "smart"], default: "smart" },
    productIds: { type: [String], default: [] },
    rules: {
      categories: { type: [String], default: [] }, // category or sub-category slugs
      productTypes: { type: [String], enum: PRODUCT_TYPES, default: [] },
      tags: { type: [String], default: [] },
      onSale: { type: Boolean, default: false },
      featuredOnly: { type: Boolean, default: false },
      inStockOnly: { type: Boolean, default: false },
      newWithinDays: { type: Number, min: 0, default: null },
      minPrice: { type: Number, min: 0, default: null },
      maxPrice: { type: Number, min: 0, default: null },
    },
    sort: { type: String, enum: COLLECTION_SORTS, default: "new" },
    // Optional window for seasons and campaigns; outside it the collection is hidden.
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    isActive: { type: Boolean, default: true },
    // Shown as a product row on the homepage, in `sortOrder`.
    showOnHome: { type: Boolean, default: false },
    homeLimit: { type: Number, min: 1, max: 24, default: 8 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type CollectionDocument = InferSchemaType<typeof collectionSchema>;

const createCollectionModel = () => model("Collection", collectionSchema);

export const Collection =
  (models.Collection as ReturnType<typeof createCollectionModel> | undefined) ??
  createCollectionModel();
