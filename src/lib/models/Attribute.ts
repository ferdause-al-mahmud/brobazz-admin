import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { PRODUCT_TYPES } from "@/lib/store-definitions";

// Admin-only. Reusable option presets ("Variations" in the sidebar), e.g. Size: S, M, L, XL for
// clothing or Belt size: 32–42 for leather. The product form uses them to fill in options quickly;
// products copy the values, so editing a preset never changes existing products.
const attributeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    values: { type: [String], default: [] },
    // Product types the preset is suggested for; empty means all.
    productTypes: { type: [String], enum: PRODUCT_TYPES, default: [] },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type AttributeDocument = InferSchemaType<typeof attributeSchema>;

const createAttributeModel = () => model("Attribute", attributeSchema);

export const Attribute =
  (models.Attribute as ReturnType<typeof createAttributeModel> | undefined) ?? createAttributeModel();
