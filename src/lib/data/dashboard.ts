import "server-only";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { Review } from "@/lib/models/Review";
import { User } from "@/lib/models/User";
import type { OrderStatus, ProductType } from "@/lib/store-definitions";

const TZ = "Asia/Dhaka";
const DAY = 24 * 60 * 60 * 1000;

export const DASHBOARD_RANGES = {
  "7d": { label: "Last 7 days", days: 7, bucket: "day" },
  "30d": { label: "Last 30 days", days: 30, bucket: "day" },
  "90d": { label: "Last 90 days", days: 90, bucket: "week" },
  "12m": { label: "Last 12 months", days: 365, bucket: "month" },
} as const;
export type DashboardRange = keyof typeof DASHBOARD_RANGES;

// Only delivered orders count as sales, on the day they were delivered. Orders delivered before
// deliveredAt was recorded fall back to their last update.
const SOLD_AT = { $ifNull: ["$deliveredAt", "$updatedAt"] };

/** Pipeline start: delivered orders whose delivery falls in [from, to). */
function deliveredBetween(from: Date, to?: Date) {
  return [
    { $match: { status: "delivered" } },
    { $addFields: { soldAt: SOLD_AT } },
    { $match: { soldAt: { $gte: from, ...(to ? { $lt: to } : {}) } } },
  ];
}

async function periodTotals(from: Date, to: Date) {
  const [totals] = await Order.aggregate<{ revenue: number; orders: number; units: number }>([
    ...deliveredBetween(from, to),
    {
      $group: {
        _id: null,
        revenue: { $sum: "$total" },
        orders: { $sum: 1 },
        units: { $sum: { $sum: "$items.quantity" } },
      },
    },
  ]);
  const customers = await User.countDocuments({ role: "customer", createdAt: { $gte: from, $lt: to } });
  return { revenue: totals?.revenue ?? 0, orders: totals?.orders ?? 0, units: totals?.units ?? 0, customers };
}

/** Bucket keys from `from` to `to`, so days without sales still show as zero. */
function bucketKeys(from: Date, to: Date, bucket: "day" | "week" | "month") {
  const format = (date: Date) => {
    const local = new Date(date.toLocaleString("en-US", { timeZone: TZ }));
    const y = local.getFullYear();
    const m = String(local.getMonth() + 1).padStart(2, "0");
    const d = String(local.getDate()).padStart(2, "0");
    return bucket === "month" ? `${y}-${m}` : `${y}-${m}-${d}`;
  };
  const keys: string[] = [];
  if (bucket === "month") {
    const cursor = new Date(from);
    cursor.setDate(1);
    while (cursor < to) {
      keys.push(format(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const step = bucket === "week" ? 7 * DAY : DAY;
    // Inclusive of `to`, so today (or the current week) has a bucket.
    for (let time = from.getTime(); time <= to.getTime(); time += step) keys.push(format(new Date(time)));
  }
  return [...new Set(keys)];
}

export async function getDashboard(range: DashboardRange) {
  await connectToDatabase();
  const { days, bucket } = DASHBOARD_RANGES[range];
  const now = new Date();
  const from = new Date(now.getTime() - days * DAY);
  const previousFrom = new Date(from.getTime() - days * DAY);

  // Weekly buckets start on the range's first day so the last bucket ends today.
  const bucketExpression =
    bucket === "month"
      ? { $dateToString: { date: "$soldAt", format: "%Y-%m", timezone: TZ } }
      : bucket === "week"
        ? {
            $dateToString: {
              date: {
                $dateAdd: {
                  startDate: from,
                  unit: "day",
                  amount: { $multiply: [{ $floor: { $divide: [{ $subtract: ["$soldAt", from] }, 7 * DAY] } }, 7] },
                },
              },
              format: "%Y-%m-%d",
              timezone: TZ,
            },
          }
        : { $dateToString: { date: "$soldAt", format: "%Y-%m-%d", timezone: TZ } };

  const [current, previous, trend, byStatus, topProducts, byType, recentOrders, lowStock, pendingReviews, pendingOrders] =
    await Promise.all([
      periodTotals(from, now),
      periodTotals(previousFrom, from),
      Order.aggregate<{ _id: string; revenue: number; orders: number }>([
        ...deliveredBetween(from),
        { $group: { _id: bucketExpression, revenue: { $sum: "$total" }, orders: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: OrderStatus; count: number }>([
        { $match: { createdAt: { $gte: from } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),
      Order.aggregate<{ _id: string; name: string; units: number; revenue: number; image: string | null }>([
        ...deliveredBetween(from),
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.productId",
            name: { $first: "$items.name" },
            image: { $first: "$items.image" },
            units: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 6 },
      ]),
      Order.aggregate<{ _id: ProductType | null; revenue: number }>([
        ...deliveredBetween(from),
        { $unwind: "$items" },
        { $lookup: { from: "products", localField: "items.productId", foreignField: "_id", as: "product", pipeline: [{ $project: { productType: 1 } }] } },
        {
          $group: {
            _id: { $ifNull: [{ $first: "$product.productType" }, "leather"] },
            revenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          },
        },
      ]),
      Order.find({}, { orderID: 1, customer: 1, total: 1, status: 1, createdAt: 1 }).sort({ createdAt: -1 }).limit(6).lean(),
      Product.find(
        { isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } },
        { name: 1, stock: 1, lowStockThreshold: 1, images: { $slice: 1 } },
      )
        .sort({ stock: 1 })
        .limit(6)
        .lean<{ _id: string; name: string; stock: number; lowStockThreshold: number; images: string[] }[]>(),
      Review.countDocuments({ status: "pending" }),
      Order.countDocuments({ status: "pending" }),
    ]);

  const trendByKey = new Map(trend.map((point) => [point._id, point]));
  return {
    range,
    bucket,
    current: { ...current, aov: current.orders ? current.revenue / current.orders : 0 },
    previous: { ...previous, aov: previous.orders ? previous.revenue / previous.orders : 0 },
    trend: bucketKeys(from, now, bucket).map((key) => ({
      key,
      revenue: trendByKey.get(key)?.revenue ?? 0,
      orders: trendByKey.get(key)?.orders ?? 0,
    })),
    byStatus: Object.fromEntries(byStatus.map(({ _id, count }) => [_id, count])) as Partial<Record<OrderStatus, number>>,
    topProducts,
    byType: Object.fromEntries(byType.map(({ _id, revenue }) => [_id ?? "leather", revenue])) as Partial<Record<ProductType, number>>,
    recentOrders: recentOrders.map((order) => ({
      orderID: order.orderID,
      name: order.customer.name,
      total: order.total,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
    })),
    lowStock: lowStock.map((product) => ({
      id: product._id,
      name: product.name,
      stock: product.stock,
      threshold: product.lowStockThreshold,
      image: product.images?.[0] ?? null,
    })),
    pendingReviews,
    pendingOrders,
  };
}
