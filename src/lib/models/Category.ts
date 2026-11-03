import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { PRODUCT_TYPES } from "@/lib/store-definitions";

// Identical in customer/lib/models/Category.ts — change both together.
//
// Two levels: a category ("Bags") and its sub-categories ("Backpack"), linked by `parent`.
// Products store the category and sub-category *names* (plus slugs), so renaming one here
// must also rename it on its products — the admin does that in the same request.
const categorySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    description: { type: String, default: "" },
    // Tile image on the homepage and the category page header.
    image: { type: String },
    // Which kind of products usually live here; pre-selects the product type in the admin form.
    productType: { type: String, enum: PRODUCT_TYPES, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    // Listed in the storefront's category navigation.
    showInNav: { type: Boolean, default: true },
    // Shown as a tile in the homepage "Shop by category" carousel.
    showOnHome: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export type CategoryDocument = InferSchemaType<typeof categorySchema>;

const createCategoryModel = () => model("Category", categorySchema);

export const Category =
  (models.Category as ReturnType<typeof createCategoryModel> | undefined) ?? createCategoryModel();
