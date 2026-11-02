"use client";
import useRole from "@/app/utils/useRole";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuth } from "@/app/services/AuthProvider";

const DashboardPage = () => {
  const router = useRouter();
  const { loading } = useAuth();
  const { role, loading: roleLoading } = useRole();

  useEffect(() => {
    // Redirect to the Sales Analytics Page when visiting the dashboard
    if (role === "moderator") {
      router.push("/dashboard/all-orders");
    } else if (role === "admin") {
      router.push("/dashboard/sales-analytics");
    }
  }, [router, role, loading, roleLoading]);

  if (loading || roleLoading) {
    return (
      <div className="flex items-center justify-center h-screen text-2xl font-semibold">
        Loading...
      </div>
    );
  }

  return null; // You can return a loading spinner here if you want
};

export default DashboardPage;
