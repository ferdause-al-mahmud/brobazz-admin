"use client";

import Link from "next/link";
import { useState } from "react";
import { BadgeCheck, Check, EyeOff, Home, MessageSquareReply, Star, Trash2, Undo2 } from "lucide-react";
import { ReviewStatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Field";
import { ConfirmButton, useAction } from "@/components/ui/client";
import { deleteReview, replyToReview, setReviewFeatured, setReviewStatus } from "@/lib/actions/reviews";
import { cn } from "@/lib/cn";
import type { ReviewStatus } from "@/lib/store-definitions";

export type ReviewView = {
  id: string;
  productId: string;
  productName: string;
  name: string;
  email: string | null;
  rating: number;
  title: string;
  body: string;
  status: ReviewStatus;
  verified: boolean;
  featured: boolean;
  reply: string;
  createdAt: string;
};

export function ReviewCard({ review, canDelete }: { review: ReviewView; canDelete: boolean }) {
  const { pending, run } = useAction();
  const [replying, setReplying] = useState(false);
  const [reply, setReply] = useState(review.reply);

  return (
    <article className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span aria-label={`${review.rating} out of 5 stars`} className="flex" role="img">
            {[1, 2, 3, 4, 5].map((value) => (
              <Star
                aria-hidden="true"
                className={cn("size-4", value <= review.rating ? "fill-brand-secondary text-brand-secondary" : "text-line-strong")}
                key={value}
              />
            ))}
          </span>
          <ReviewStatusBadge status={review.status} />
          {review.featured && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8a6a1f]">
              <Home className="size-3" /> On homepage
            </span>
          )}
        </div>
        {review.title && <p className="mt-2 font-semibold text-brand-ink">{review.title}</p>}
        <p className="mt-1 whitespace-pre-line text-sm leading-6 text-brand-ink/85">{review.body}</p>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <span className="font-semibold text-brand-ink">{review.name}</span>
          {review.verified && (
            <span className="inline-flex items-center gap-0.5 text-good">
              <BadgeCheck className="size-3.5" /> Verified buyer
            </span>
          )}
          {review.email && <span>{review.email}</span>}
          <span>·</span>
          <Link className="hover:text-brand-primary hover:underline" href={`/products/${encodeURIComponent(review.productId)}`}>
            {review.productName}
          </Link>
          <span>· {new Date(review.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
        </p>

        {replying ? (
          <div className="mt-3 grid gap-2">
            <Textarea aria-label="Your reply" className="min-h-20" onChange={(event) => setReply(event.target.value)} placeholder="Thanks for the kind words…" value={reply} />
            <div className="flex gap-2">
              <Button loading={pending} onClick={() => run(() => replyToReview(review.id, reply), { onSuccess: () => setReplying(false) })} size="sm">
                Save reply
              </Button>
              <Button onClick={() => (setReply(review.reply), setReplying(false))} size="sm" variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          review.reply && (
            <p className="mt-3 rounded-lg bg-surface-muted p-3 text-sm text-brand-ink/85">
              <span className="font-semibold text-brand-ink">Your reply: </span>
              {review.reply}
            </p>
          )
        )}
      </div>

      <div className="flex flex-wrap items-start gap-1 sm:max-w-52 sm:justify-end">
        {review.status !== "approved" && (
          <Button disabled={pending} onClick={() => run(() => setReviewStatus([review.id], "approved"))} size="sm">
            <Check /> Publish
          </Button>
        )}
        {review.status === "approved" && (
          <Button disabled={pending} onClick={() => run(() => setReviewFeatured(review.id, !review.featured))} size="sm" variant="secondary">
            <Home /> {review.featured ? "Unfeature" : "Feature"}
          </Button>
        )}
        {review.status !== "rejected" ? (
          <Button disabled={pending} onClick={() => run(() => setReviewStatus([review.id], "rejected"))} size="sm" variant="ghost">
            <EyeOff /> Hide
          </Button>
        ) : (
          <Button disabled={pending} onClick={() => run(() => setReviewStatus([review.id], "pending"))} size="sm" variant="ghost">
            <Undo2 /> Restore
          </Button>
        )}
        {!replying && (
          <Button onClick={() => setReplying(true)} size="sm" variant="ghost">
            <MessageSquareReply /> {review.reply ? "Edit reply" : "Reply"}
          </Button>
        )}
        {canDelete && (
          <ConfirmButton action={() => deleteReview(review.id)} aria-label="Delete review" size="icon" title="Delete this review?">
            <Trash2 />
          </ConfirmButton>
        )}
      </div>
    </article>
  );
}

export function ApproveAllButton({ ids }: { ids: string[] }) {
  const { pending, run } = useAction();
  if (!ids.length) return null;
  return (
    <Button loading={pending} onClick={() => run(() => setReviewStatus(ids, "approved"))} size="sm" variant="secondary">
      <Check /> Publish all {ids.length} on this page
    </Button>
  );
}
