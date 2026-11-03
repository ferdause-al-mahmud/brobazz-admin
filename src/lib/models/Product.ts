import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { slugify } from "@/lib/slug";
import { effectivePrice, PRODUCT_TYPES, variantPricing } from "@/lib/store-definitions";

// Identical in customer/lib/models/Product.ts — change both together.

const optionValueSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

// An option the customer picks, e.g. { name: "Size", values: ["S", "M", "L"] }. At most three.
const productOptionSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
  },
  { _id: false },
);

// One buyable combination of option values, e.g. Black / M. Its _id is the variant id carts and
// orders refer to; it stays the same when the variant is edited.
const variantSchema = new Schema({
  sku: { type: String, trim: true, uppercase: true },
  options: { type: [optionValueSchema], default: [] },
  // null means "same as the product".
  price: { type: Number, min: 0, default: null },
  salePrice: { type: Number, min: 0, default: null },
  stock: { type: Number, required: true, min: 0, default: 0 },
  image: { type: String },
  isActive: { type: Boolean, default: true },
});

const specSchema = new Schema(
  {
    label: { type: String, required: true, trim: true },
    value: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    // Product code, e.g. "BIF-001". Carts and orders refer to products by it.
    _id: { type: String, required: true, uppercase: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    productType: { type: String, enum: PRODUCT_TYPES, default: "leather", index: true },
    category: { type: String, required: true, trim: true },
    subCategory: { type: String, trim: true },
    // Derived from category/subCategory on save (see the hook below); used for filtering by URL slug.
    categorySlug: { type: String, index: true },
    subCategorySlug: { type: String, index: true },
    tags: { type: [String], default: [] },
    description: { type: String, default: "" },
    materials: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    // Free-form details shown as a table: { label: "Fit", value: "Regular" }, { label: "Dimensions", ... }.
    specs: { type: [specSchema], default: [] },
    // Image of the size guide, mostly for clothing.
    sizeChart: { type: String },
    currency: { type: String, enum: ["BDT"], default: "BDT" },
    price: { type: Number, required: true, min: 0 },
    salePrice: { type: Number, min: 0, default: null },
    // What the item cost the shop; admin-only, used for profit reports. Never sent to the storefront.
    costPrice: { type: Number, min: 0, default: null },
    // Lowest price actually charged across buyable variants. Stored so it can be sorted and filtered on.
    finalPrice: { type: Number, min: 0 },
    options: { type: [productOptionSchema], default: [] },
    variants: { type: [variantSchema], default: [] },
    // Units available. With variants it's the sum of active variants' stock (kept in sync by the hook
    // and by every $inc on a variant), so listing queries never have to look inside variants.
    stock: { type: Number, required: true, min: 0, default: 0 },
    lowStockThreshold: { type: Number, min: 0, default: 5 },
    images: { type: [String], default: [] },
    // Hidden products stay in the database (and in past orders) but aren't listed.
    isActive: { type: Boolean, default: true, index: true },
    isFeatured: { type: Boolean, default: false },
    soldCount: { type: Number, default: 0 },
    seo: {
      title: { type: String, trim: true },
      description: { type: String, trim: true },
    },
  },
  { timestamps: true },
);

// Runs on create() and save(). Updates done with updateOne/findOneAndUpdate must keep these fields right too.
productSchema.pre("validate", function () {
  this.categorySlug = slugify(this.category);
  this.subCategorySlug = this.subCategory ? slugify(this.subCategory) : undefined;

  const buyable = this.variants.filter((variant) => variant.isActive);
  if (this.variants.length) {
    this.stock = buyable.reduce((sum, variant) => sum + variant.stock, 0);
  }
  const prices = buyable.map((variant) => effectivePrice(variantPricing(this, variant)));
  this.finalPrice = prices.length ? Math.min(...prices) : effectivePrice(this);
});

export type ProductDocument = InferSchemaType<typeof productSchema>;
export type VariantDocument = InferSchemaType<typeof variantSchema>;

const createProductModel = () => model("Product", productSchema);

export const Product =
  (models.Product as ReturnType<typeof createProductModel> | undefined) ?? createProductModel();
