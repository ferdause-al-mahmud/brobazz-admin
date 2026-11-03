import { Sidebar, type SidebarCounts } from "@/components/layout/Sidebar";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { Order } from "@/lib/models/Order";
import { Product } from "@/lib/models/Product";
import { Review } from "@/lib/models/Review";

// Every admin page is per-user, so nothing here is prerendered.
async function getCounts(): Promise<SidebarCounts> {
  await connectToDatabase();
  const [pendingOrders, pendingReviews, lowStock] = await Promise.all([
    Order.countDocuments({ status: "pending" }),
    Review.countDocuments({ status: "pending" }),
    Product.countDocuments({ isActive: true, $expr: { $lte: ["$stock", "$lowStockThreshold"] } }),
  ]);
  return { pendingOrders, pendingReviews, lowStock };
}

export default async function AdminLayout({ children }: LayoutProps<"/">) {
  const user = await requireStaffPage();
  const counts = await getCounts().catch(() => ({}));

  return (
    <div className="min-h-screen">
      <Sidebar counts={counts} storefrontUrl={process.env.STOREFRONT_URL ?? null} user={user} />
      <div className="lg:pl-64">
        <main className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
