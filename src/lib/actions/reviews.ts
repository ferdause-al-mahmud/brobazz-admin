"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Review } from "@/lib/models/Review";
import { revalidateStorefront } from "@/lib/revalidate";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/store-definitions";
import { InputError, runAction } from "./result";

async function done(userId: string) {
  revalidatePath("/reviews");
  await revalidateStorefront(["reviews"], userId);
}

export async function setReviewStatus(ids: string[], status: ReviewStatus) {
  return runAction(async () => {
    const user = await requireStaff();
    if (!REVIEW_STATUSES.includes(status)) throw new InputError("Unknown status");
    await connectToDatabase();
    // Only published reviews can be featured on the homepage.
    await Review.updateMany({ _id: { $in: ids } }, { $set: { status, ...(status !== "approved" ? { featured: false } : {}) } });
    await done(user.id);
  }, status === "approved" ? "Published" : status === "rejected" ? "Hidden from the store" : "Moved back to pending");
}

export async function setReviewFeatured(id: string, featured: boolean) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    const review = await Review.findById(id);
    if (!review) throw new InputError("This review no longer exists");
    if (featured && review.status !== "approved") throw new InputError("Publish the review before featuring it");
    review.featured = featured;
    await review.save();
    await done(user.id);
  }, featured ? "Featured on the homepage" : "Removed from the homepage");
}

export async function replyToReview(id: string, reply: string) {
  return runAction(async () => {
    const user = await requireStaff();
    await connectToDatabase();
    await Review.updateOne({ _id: id }, { $set: { reply: reply.trim().slice(0, 1000) } });
    await done(user.id);
  }, reply.trim() ? "Reply saved" : "Reply removed");
}

export async function deleteReview(id: string) {
  return runAction(async () => {
    const user = await requireStaff({ adminOnly: true });
    await connectToDatabase();
    await Review.deleteOne({ _id: id });
    await done(user.id);
  }, "Review deleted");
}
