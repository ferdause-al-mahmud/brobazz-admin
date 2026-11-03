// Sidebar structure and who may open each section. proxy.ts reads ADMIN_ONLY_PATHS for a fast
// redirect; pages and actions still check the role themselves (requireStaffPage / requireStaff).

export type NavItem = {
  label: string;
  href: string;
  icon: NavIcon;
  adminOnly?: boolean;
  /** Key of a live count shown as a badge (see the admin layout). */
  badge?: "pendingOrders" | "pendingReviews" | "lowStock";
  /** Only highlight on an exact path match (for items whose path prefixes others). */
  exact?: boolean;
};

export type NavGroup = { label: string | null; items: NavItem[] };

export type NavIcon =
  | "dashboard"
  | "orders"
  | "products"
  | "add"
  | "variations"
  | "categories"
  | "collections"
  | "stock"
  | "customers"
  | "reviews"
  | "coupons"
  | "content"
  | "media"
  | "settings"
  | "staff";

export const NAVIGATION: NavGroup[] = [
  {
    label: null,
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { label: "Orders", href: "/orders", icon: "orders", badge: "pendingOrders" },
    ],
  },
  {
    label: "Catalog",
    items: [
      { label: "All products", href: "/products", icon: "products", exact: true },
      { label: "Add product", href: "/products/new", icon: "add" },
      { label: "Variations", href: "/products/variations", icon: "variations" },
      { label: "Categories", href: "/products/categories", icon: "categories" },
      { label: "Collections", href: "/collections", icon: "collections" },
      { label: "Stock", href: "/products/stock", icon: "stock", badge: "lowStock" },
    ],
  },
  {
    label: "Customers",
    items: [
      { label: "Customers", href: "/customers", icon: "customers" },
      { label: "Reviews", href: "/reviews", icon: "reviews", badge: "pendingReviews" },
    ],
  },
  {
    label: "Store",
    items: [
      { label: "Coupons", href: "/coupons", icon: "coupons", adminOnly: true },
      { label: "Store content", href: "/content", icon: "content", adminOnly: true },
      { label: "Media library", href: "/media-library", icon: "media" },
      { label: "Settings", href: "/settings", icon: "settings", adminOnly: true, exact: true },
      { label: "Staff", href: "/settings/staff", icon: "staff", adminOnly: true },
    ],
  },
];

export const ADMIN_ONLY_PATHS = NAVIGATION.flatMap((group) => group.items)
  .filter((item) => item.adminOnly)
  .map((item) => item.href);
