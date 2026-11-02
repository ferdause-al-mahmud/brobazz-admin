"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import OrdersTable from "@/app/Components/Dashboard/OrdersTable/OrdersTable";
import toast from "react-hot-toast";

const apiUrl = process.env.NEXT_PUBLIC_API_URL;

const AllOrdersClient = ({ searchParams }) => {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const page = Number(searchParams?.page || 1);
  const status = searchParams?.status || "all";
  const type = searchParams?.type || "";
  const limit = 10;

  const fetchOrders = async () => {
    try {
      setIsLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit,
        type,
      });
      if (status !== "all") {
        queryParams.append("status", status);
      }

      const res = await fetch(
        `${apiUrl}/api/orders?${queryParams.toString()}`,
        {
          cache: "no-store",
        },
      );

      if (!res.ok) throw new Error("Failed to fetch orders");

      const data = await res.json();
      const filtered = data.orders.filter((o) => o.status !== "cancelled");

      setOrders(filtered);
      setCurrentPage(data.currentPage);
      setTotalPages(data.totalPages);
    } catch (err) {
      console.error(err);
      toast.error("Failed to fetch orders");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (orderId) => {
    toast.custom(
      (t) => (
        <div className="bg-white p-4 rounded shadow border max-w-sm w-full">
          <p className="text-sm font-medium">
            Delete this order? Order Id {orderId}
          </p>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                try {
                  await fetch(`${apiUrl}/api/delete-order/${orderId}`, {
                    method: "DELETE",
                  });
                  toast.success("Order deleted");
                  fetchOrders(); // 🔁 Refetch
                } catch (err) {
                  console.error(err);
                  toast.error("Delete failed");
                }
              }}
              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
            >
              Confirm
            </button>
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1 bg-gray-200 rounded text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      ),
      { duration: 10000, position: "top-center" },
    );
  };

  useEffect(() => {
    fetchOrders();
  }, [page, status, type]);

  return (
    <OrdersTable
      orders={orders}
      totalPages={totalPages}
      currentPage={currentPage}
      onDelete={handleDelete} // Pass delete handler to table
      isLoading={isLoading}
    />
  );
};

export default AllOrdersClient;
