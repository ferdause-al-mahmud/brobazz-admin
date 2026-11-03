import "server-only";
import { model, models, Schema, type InferSchemaType } from "mongoose";
import { REVIEW_STATUSES } from "@/lib/store-definitions";

// Identical in customer/lib/models/Review.ts — change both together.
// Customers submit reviews as "pending"; only approved ones are shown on the storefront.
const reviewSchema = new Schema(
  {
    productId: { type: String, required: true, index: true },
    productName: { type: String, required: true },
    user: { type: Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, trim: true, lowercase: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    title: { type: String, trim: true, maxlength: 120, default: "" },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: REVIEW_STATUSES, default: "pending", index: true },
    // The reviewer bought this product (an order of theirs contains it).
    verified: { type: Boolean, default: false },
    // Shown in the homepage testimonials carousel.
    featured: { type: Boolean, default: false },
    reply: { type: String, trim: true, default: "" },
  },
  { timestamps: true },
);

export type ReviewDocument = InferSchemaType<typeof reviewSchema>;

const createReviewModel = () => model("Review", reviewSchema);

export const Review =
  (models.Review as ReturnType<typeof createReviewModel> | undefined) ?? createReviewModel();
