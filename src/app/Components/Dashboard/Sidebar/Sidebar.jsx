"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  ShoppingBag,
  ImageIcon,
  Package,
  PackagePlus,
  FileText,
  Boxes,
  Activity,
  Users,
  DollarSign,
  UserCog,
  Receipt,
  LogOut,
  Menu,
  X,
  MessageCircle,
  Library,
  ListTree,
  Megaphone,
} from "lucide-react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import useRole from "@/app/utils/useRole";
import { useAuth } from "@/app/services/AuthProvider";
import { RiCoupon2Fill } from "react-icons/ri";

const Sidebar = () => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState(null);
  const sidebarRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const { user, setUser } = useAuth();
  const { role } = useRole();

  // Navigation items configuration
  const navigationItems = [
    {
      id: "sales",
      label: "Sales Analytics",
      icon: TrendingUp,
      href: "/dashboard/sales-analytics",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      adminOnly: true,
    },
    {
      id: "orders",
      label: "All Orders",
      icon: ShoppingBag,
      href: "/dashboard/all-orders",
      color: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20",
      adminOnly: false,
    },
    {
      id: "image-management",
      label: "Image Management",
      icon: ImageIcon,
      href: "/dashboard/image-management",
      color: "from-fuchsia-500 to-fuchsia-600",
      bgColor: "bg-fuchsia-500/10",
      borderColor: "border-fuchsia-500/20",
      adminOnly: true,
    },
    {
      id: "collection-management",
      label: "Collection Management",
      icon: Library,
      href: "/dashboard/collection-management",
      color: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-500/10",
      borderColor: "border-amber-500/20",
      adminOnly: true,
    },
    {
      id: "navigation-management",
      label: "Navigation Management",
      icon: ListTree,
      href: "/dashboard/navigation",
      color: "from-violet-500 to-violet-600",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      adminOnly: true,
    },
    {
      id: "announcement-management",
      label: "Announcement Bar",
      icon: Megaphone,
      href: "/dashboard/announcements",
      color: "from-sky-500 to-sky-600",
      bgColor: "bg-sky-500/10",
      borderColor: "border-sky-500/20",
      adminOnly: true,
    },

    {
      id: "coupon-management",
      label: "Coupon Management",
      icon: RiCoupon2Fill,
      href: "/dashboard/coupon-management",
      color: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-500/10",
      borderColor: "border-blue-500/20",
      adminOnly: true,
    },
    {
      id: "add-product",
      label: "Add Products",
      icon: PackagePlus,
      href: "/dashboard/add-product",
      color: "from-purple-500 to-purple-600",
      bgColor: "bg-purple-500/10",
      borderColor: "border-purple-500/20",
      adminOnly: false,
    },
    {
      id: "products",
      label: "All Products",
      icon: Package,
      href: "/dashboard/all-products",
      color: "from-orange-500 to-orange-600",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20",
      adminOnly: false,
    },
    {
      id: "product-serialization",
      label: "Product Serialization",
      icon: ListTree,
      href: "/dashboard/product-serialization",
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      adminOnly: true,
    },
    {
      id: "add-category",
      label: "Add Categories",
      icon: PackagePlus,
      href: "/dashboard/add-category",
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20",
      adminOnly: false,
    },
    {
      id: "categories",
      label: "All Categories",
      icon: Package,
      href: "/dashboard/all-categories",
      color: "from-rose-500 to-rose-600",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      adminOnly: false,
    },
    {
      id: "manual",
      label: "Manual Entry",
      icon: FileText,
      href: "/dashboard/moderator-entry",
      color: "from-indigo-500 to-indigo-600",
      bgColor: "bg-indigo-500/10",
      borderColor: "border-indigo-500/20",
      adminOnly: false,
    },
    {
      id: "stock",
      label: "Stock",
      icon: Boxes,
      href: "/dashboard/stock",
      color: "from-red-500 to-red-600",
      bgColor: "bg-red-500/10",
      borderColor: "border-red-500/20",
      adminOnly: false,
    },
    {
      id: "moderator",
      label: "Moderator Activity",
      icon: Activity,
      href: "/dashboard/moderator-track",
      color: "from-teal-500 to-teal-600",
      bgColor: "bg-teal-500/10",
      borderColor: "border-teal-500/20",
      adminOnly: true,
    },
    {
      id: "users",
      label: "User Management",
      icon: Users,
      href: "/dashboard/user-management",
      color: "from-cyan-500 to-cyan-600",
      bgColor: "bg-cyan-500/10",
      borderColor: "border-cyan-500/20",
      adminOnly: true,
    },
    {
      id: "expenses",
      label: "Expense Management",
      icon: DollarSign,
      href: "/dashboard/expenses",
      color: "from-yellow-500 to-yellow-600",
      bgColor: "bg-yellow-500/10",
      borderColor: "border-yellow-500/20",
      adminOnly: true,
    },
    {
      id: "employees",
      label: "Employee Management",
      icon: UserCog,
      href: "/dashboard/employee-management",
      color: "from-pink-500 to-pink-600",
      bgColor: "bg-pink-500/10",
      borderColor: "border-pink-500/20",
      adminOnly: true,
    },
    {
      id: "revenue",
      label: "Gross Revenue",
      icon: Receipt,
      href: "/dashboard/product-revenue",
      color: "from-rose-500 to-rose-600",
      bgColor: "bg-rose-500/10",
      borderColor: "border-rose-500/20",
      adminOnly: true,
    },
    {
      id: "reviews",
      label: "Reviews",
      icon: MessageCircle,
      href: "/dashboard/reviews",
      color: "from-violet-500 to-violet-600",
      bgColor: "bg-violet-500/10",
      borderColor: "border-violet-500/20",
      adminOnly: true,
    },
  ];

  // Filter items based on role
  const visibleItems = navigationItems.filter(
    (item) => !item.adminOnly || (item.adminOnly && role === "admin"),
  );

  const handleLogout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Failed to log out.");
      }
      setUser(null);
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      console.error("Error logging out:", error);
      toast.error("Error logging out. Please try again.");
    }
  };

  // Close mobile menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
        setIsMobileOpen(false);
      }
    };

    if (isMobileOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMobileOpen]);

  return (
    <>
      {/* Mobile Menu Button */}

      <div className="lg:hidden fixed flex flex-row items-center gap-16 top-0 left-0 bg-slate-900 z-50 w-full">
        <button
          onClick={() => setIsMobileOpen(true)}
          className="m-2 p-2 bg-slate-800 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-slate-700"
        >
          <Menu className="w-6 h-6 text-slate-200" />
        </button>
        <p className="text-white flex items-center gap-4 text-lg font-semibold m-2">
          <LayoutDashboard className="w-5 h-5 " />
          Dashboard
        </p>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" />
      )}

      {/* Sidebar */}
      <aside
        ref={sidebarRef}
        className={`
          fixed top-0 left-0 h-full z-50 w-72
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950
          border-r border-slate-800
          transition-all duration-300 ease-in-out
          shadow-2xl lg:shadow-none
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between h-16 px-4 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
            <div className={`flex items-center gap-3 `}>
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                  <LayoutDashboard className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 shadow-lg" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Dashboard</h2>
                <p className="text-xs text-slate-400">
                  {role === "admin" ? "Administrator" : "Moderator"}
                </p>
              </div>
            </div>

            {/* Close button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsMobileOpen(false)}
                className="lg:hidden p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 space-y-1">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const isHovered = hoveredItem === item.id;

              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200 group
                    ${
                      isActive
                        ? `${item.bgColor} ${item.borderColor} border backdrop-blur-sm`
                        : "hover:bg-slate-800/50"
                    }
                  `}
                >
                  <div
                    className={`
                    relative flex-shrink-0 p-2 rounded-lg
                    ${
                      isActive
                        ? `bg-gradient-to-br ${item.color} shadow-lg`
                        : "bg-slate-800/50 group-hover:bg-slate-700/50"
                    }
                    transition-all duration-200
                  `}
                  >
                    <Icon
                      className={`
                      w-5 h-5
                      ${
                        isActive
                          ? "text-white"
                          : "text-slate-400 group-hover:text-slate-300"
                      }
                    `}
                    />
                    {isActive && (
                      <div className="absolute inset-0 rounded-lg bg-white/10 animate-pulse" />
                    )}
                  </div>
                  <span
                    className={`
                      font-medium text-sm
                      ${
                        isActive
                          ? "text-white"
                          : "text-slate-300 group-hover:text-white"
                      }
                    `}
                  >
                    {item.label}
                  </span>

                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-b from-blue-500 to-purple-500 rounded-l-full shadow-lg shadow-blue-500/50" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="border-t border-slate-800 p-3 bg-slate-900/50 backdrop-blur-sm">
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                bg-red-500/10 hover:bg-red-500/20
                border border-red-500/20 hover:border-red-500/30
                transition-all duration-200 group
              `}
            >
              <div className="flex-shrink-0 p-2 bg-red-500/20 rounded-lg group-hover:bg-red-500/30 transition-colors">
                <LogOut className="w-5 h-5 text-red-400" />
              </div>
              <span className="font-medium text-sm text-red-400 group-hover:text-red-300">
                Logout
              </span>
            </button>

            {/* User info */}
            <div className="mt-3 px-3 py-2 bg-slate-800/30 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content offset */}
      <div
        className={`
        lg:ml-72
        transition-all duration-300
      `}
      />
    </>
  );
};

export default Sidebar;
