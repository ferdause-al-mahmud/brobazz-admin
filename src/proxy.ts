import { NextResponse, type NextRequest } from "next/server";
import { isStaffRole } from "@/lib/auth/definitions";
import { SESSION_COOKIE, verifyAccessToken } from "@/lib/auth/jwt";
import { ADMIN_ONLY_PATHS } from "@/lib/navigation";

// Fast, optimistic access control from the signed token (no database). Pages and server actions
// re-check the user against the database, so a revoked role takes effect immediately there.
const PUBLIC_PATHS = ["/login", "/api/auth", "/media", "/uploads"];

const matches = (pathname: string, prefixes: string[]) =>
  prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (matches(pathname, PUBLIC_PATHS)) return NextResponse.next();

  const session = await verifyAccessToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session || !isStaffRole(session.role)) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const login = new URL("/login", request.url);
    if (pathname !== "/") login.searchParams.set("returnUrl", `${pathname}${search}`);
    return NextResponse.redirect(login);
  }

  if (session.role !== "admin" && matches(pathname, ADMIN_ONLY_PATHS)) {
    return NextResponse.redirect(new URL("/dashboard?denied=1", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|logo.png).*)"],
};
