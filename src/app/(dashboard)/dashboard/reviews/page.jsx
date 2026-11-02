import { serverFetch } from "@/app/lib/serverFetch";
import ReviewsTable from "@/app/Components/Dashboard/ReviewsTable/ReviewsTable";
import { MessageCircle } from "lucide-react";

// Per-user data behind login: never prerender at build time.
export const dynamic = "force-dynamic";

const getReviews = async () => {
  try {
    const res = await serverFetch(
      `${process.env.NEXT_PUBLIC_API_URL || ""}/api/reviews`,
      {
        cache: "no-store",
      },
    );

    if (!res.ok) {
      throw new Error("Failed to fetch reviews");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.error("Error fetching reviews:", error);
    return [];
  }
};

export default async function ReviewsPage() {
  const reviews = await getReviews();

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 md:mb-10">
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-violet-500/10 rounded-lg">
              <MessageCircle className="w-8 h-8 text-violet-600" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900">
                Reviews Management
              </h1>
              <p className="text-gray-600 mt-1">
                Manage and moderate customer reviews
              </p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Total Reviews
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">
                    {reviews.length}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600 mt-2">
                    {reviews.filter((r) => r.status === "pending").length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Approved</p>
                  <p className="text-2xl font-bold text-green-600 mt-2">
                    {reviews.filter((r) => r.status === "approved").length}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Rejected</p>
                  <p className="text-2xl font-bold text-red-600 mt-2">
                    {reviews.filter((r) => r.status === "rejected").length}
                  </p>
                </div>
                <div className="p-3 bg-red-500/10 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Reviews Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <ReviewsTable reviews={reviews} />
        </div>
      </div>
    </div>
  );
}
