import { serverFetch } from "@/app/lib/serverFetch";
import ManualEntryTable from "@/app/Components/Dashboard/ManualEntryTable/ManualEntryTable";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const getOrders = async (page = 1, limit = 10, status = "all", phone = "") => {
  try {
    const queryParams = new URLSearchParams();
    queryParams.append("page", page);
    queryParams.append("limit", limit);
    queryParams.append("type", "manual");
    if (phone) {
      queryParams.append("phone", phone);
    }
    // type=manual
    // Add status filter if not "all"
    if (status !== "all") {
      queryParams.append("status", status);
    }

    const apiUrlWithParams = `${apiUrl}/api/orders?${queryParams.toString()}`;

    const res = await serverFetch(apiUrlWithParams, {
      cache: "no-store", // Avoid caching to ensure fresh data
    });

    if (!res.ok) {
      throw new Error("Failed to fetch orders");
    }

    const data = await res.json();
    // Filter out orders with status 'cancelled'
    const filteredOrders = data.orders.filter(
      (order) => order.status !== "cancelled",
    );
    return {
      orders: filteredOrders,
      totalPages: data.totalPages,
      currentPage: data.currentPage,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return { orders: [], totalPages: 1, currentPage: 1 };
  }
};

// Main server-side component
const AllOrders = async ({ searchParams }) => {
  const params = await searchParams;
  const page = Number.parseInt(params?.page || "1"); // Default to page 1
  const limit = 10; // Set a limit per page
  const status = params?.status || "all"; // Get status filter from URL
  const phone = params?.phone || "";

  const { orders, totalPages, currentPage } = await getOrders(
    page,
    limit,
    status,
    phone,
  );

  return (
    <div>
      {/* Render OrdersTable and pass paginated data */}
      <ManualEntryTable
        orders={orders}
        totalPages={totalPages}
        currentPage={currentPage}
      />
    </div>
  );
};

export default AllOrders;
