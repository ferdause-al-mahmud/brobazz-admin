"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import OrdersTable from "@/app/Components/Dashboard/OrdersTable/OrdersTable";

const AllOrdersClient = () => {
  const searchParams = useSearchParams();
  const query = searchParams.toString();
  const [ordersData, setOrdersData] = useState({
    orders: [],
    totalPages: 1,
    currentPage: 1,
  });

  const fetchOrders = useCallback(async () => {
    try {
      const response = await fetch(`/api/orders?${query}`, {
        cache: "no-store",
      });

      if (!response.ok) throw new Error("Failed to fetch orders");

      const data = await response.json();
      setOrdersData({
        orders: data.orders,
        totalPages: data.totalPages,
        currentPage: data.currentPage,
      });
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [query]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  return (
    <OrdersTable
      orders={ordersData.orders}
      totalPages={ordersData.totalPages}
      currentPage={ordersData.currentPage}
    />
  );
};

export default AllOrdersClient;
