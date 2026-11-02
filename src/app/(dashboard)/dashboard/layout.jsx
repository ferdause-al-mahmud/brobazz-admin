"use client";

import Sidebar from "@/app/Components/Dashboard/Sidebar/Sidebar";
import withAuth from "@/app/lib/adminRoute";
import { useState, useEffect } from "react";

const DashboardLayout = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState("w-72");

  // Listen for sidebar collapse state changes
  useEffect(() => {
    const handleResize = () => {
      // Update padding based on screen size
      if (window.innerWidth < 1024) {
        setSidebarWidth("w-0");
      } else {
        // You can get the actual sidebar state here if needed
        setSidebarWidth("w-72");
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 ">
      {/* Fixed Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="lg:pl-72 transition-all duration-300">
        <main className="min-h-screen">
          {/* Top padding for mobile menu button */}
          <div className="pt-16 lg:pt-0">
            <div className="px-2 sm:px-6 py-6">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default withAuth(DashboardLayout);
