import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, STAFF_ROLES, verifyAccessToken } from "@/app/lib/jwt";

// Server-side access control for every dashboard page and API route.
// Checks the signed session token only (fast, no database). Routes that need to react to a
// role change immediately can also call requireAuth(), which re-reads the user.

// Mirrors the `adminOnly` items in the Sidebar.
const ADMIN_ONLY_PAGES = [
  "sales-analytics",
  "image-management",
  "collection-management",
  "navigation",
  "announcements",
  "coupon-management",
  "product-serialization",
  "moderator-track",
  "user-management",
  "expenses",
  "employee-management",
  "product-revenue",
  "reviews",
].map((page) => `/dashboard/${page}`);

// APIs used only by the admin-only pages above.
const ADMIN_ONLY_APIS = [
  "/api/admin/employees",
  "/api/admin/payments",
  "/api/admin/revenue-details",
  "/api/user-management",
  "/api/moderator-tracking",
  "/api/product-serialization",
  "/api/navigation",
  "/api/coupon",
  "/api/collections",
  "/api/banner",
  "/api/reviews",
];

const matches = (pathname, prefixes) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function proxy(request) {
  const { pathname, search } = request.nextUrl;
  const isApi = pathname.startsWith("/api/");

  // Login, logout, session check and Google sign-in must work while signed out.
  if (pathname.startsWith("/api/auth/")) return NextResponse.next();

  const session = await verifyAccessToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!session || !STAFF_ROLES.includes(session.role)) {
    if (isApi) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("returnUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  const adminOnly = matches(pathname, isApi ? ADMIN_ONLY_APIS : ADMIN_ONLY_PAGES);
  if (adminOnly && session.role !== "admin") {
    if (isApi) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/orders/:path*", "/api/:path*"],
};
