import type { Metadata } from "next";
import { MessageSquareText, Star } from "lucide-react";
import type { QueryFilter } from "mongoose";
import { ApproveAllButton, ReviewCard, type ReviewView } from "@/components/reviews/ReviewCard";
import { Card } from "@/components/ui/Card";
import { ParamSelect, SearchBox } from "@/components/ui/client";
import { EmptyState, PageHeader, Pagination, withParams } from "@/components/ui/Page";
import { LinkTabs } from "@/components/ui/Tabs";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Review, type ReviewDocument } from "@/lib/models/Review";
import { REVIEW_STATUSES, type ReviewStatus } from "@/lib/store-definitions";

export const metadata: Metadata = { title: "Reviews" };

const PAGE_SIZE = 20;

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default async function ReviewsPage({ searchParams }: PageProps<"/reviews">) {
  const user = await requireStaffPage();
  const params = Object.fromEntries(
    Object.entries(await searchParams).map(([key, value]) => [key, Array.isArray(value) ? value[0] : value]),
  ) as Record<string, string | undefined>;
  const status = REVIEW_STATUSES.find((value) => value === params.status) ?? null;
  const rating = Number(params.rating) || null;
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q?.trim();

  const base: QueryFilter<ReviewDocument> = {};
  if (rating && rating >= 1 && rating <= 5) base.rating = rating;
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    base.$or = [{ productName: pattern }, { productId: pattern }, { name: pattern }, { body: pattern }, { title: pattern }];
  }
  const filter: QueryFilter<ReviewDocument> = status ? { ...base, status } : base;

  await connectToDatabase();
  const [reviews, total, counts, [summary]] = await Promise.all([
    Review.find(filter).sort({ createdAt: -1 }).skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean(),
    Review.countDocuments(filter),
    Review.aggregate<{ _id: ReviewStatus; count: number }>([{ $match: base }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Review.aggregate<{ average: number; count: number }>([
      { $match: { status: "approved" } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
  ]);
  const countFor = (value: ReviewStatus) => counts.find((item) => item._id === value)?.count ?? 0;
  const href = (overrides: Record<string, string | number | undefined>) => withParams("/reviews", params, overrides);

  const views: ReviewView[] = reviews.map((review) => ({
    id: String(review._id),
    productId: review.productId,
    productName: review.productName,
    name: review.name,
    email: review.email ?? null,
    rating: review.rating,
    title: review.title ?? "",
    body: review.body,
    status: review.status,
    verified: review.verified ?? false,
    featured: review.featured ?? false,
    reply: review.reply ?? "",
    createdAt: review.createdAt.toISOString(),
  }));

  return (
    <>
      <PageHeader
        actions={
          summary ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface px-3 py-2 text-sm font-semibold text-brand-ink">
              <Star className="size-4 fill-brand-secondary text-brand-secondary" />
              {summary.average.toFixed(1)} average from {summary.count} published
            </span>
          ) : undefined
        }
        description="Customers' reviews appear on product pages once published. Feature the best ones on the homepage."
        title="Reviews"
      />
      <Card>
        <div className="border-b border-line px-5 pt-1">
          <LinkTabs
            active={status ?? "all"}
            tabs={[
              { value: "all", label: "All", count: counts.reduce((sum, item) => sum + item.count, 0), href: href({ status: undefined, page: undefined }) },
              { value: "pending", label: "Awaiting review", count: countFor("pending"), href: href({ status: "pending", page: undefined }) },
              { value: "approved", label: "Published", count: countFor("approved"), href: href({ status: "approved", page: undefined }) },
              { value: "rejected", label: "Hidden", count: countFor("rejected"), href: href({ status: "rejected", page: undefined }) },
            ]}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3">
          <SearchBox placeholder="Search product, name or text" />
          <ParamSelect
            label="Rating"
            options={[{ value: "", label: "Any rating" }, ...[5, 4, 3, 2, 1].map((value) => ({ value: String(value), label: `${value} star${value > 1 ? "s" : ""}` }))]}
            param="rating"
          />
          {status === "pending" && (
            <div className="ml-auto">
              <ApproveAllButton ids={views.map((review) => review.id)} />
            </div>
          )}
        </div>
        {views.length === 0 ? (
          <EmptyState
            description={status === "pending" ? "You're all caught up." : "Reviews customers write on product pages show up here."}
            icon={<MessageSquareText />}
            title={status === "pending" ? "Nothing to review" : "No reviews"}
          />
        ) : (
          <div className="divide-y divide-line border-t border-line">
            {views.map((review) => (
              <ReviewCard canDelete={user.role === "admin"} key={review.id} review={review} />
            ))}
          </div>
        )}
        <Pagination hrefFor={(next) => href({ page: next })} page={page} pageSize={PAGE_SIZE} total={total} totalPages={Math.ceil(total / PAGE_SIZE)} />
      </Card>
    </>
  );
}
