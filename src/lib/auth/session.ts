import "server-only";
import { decodeJwt } from "jose";
import { isValidObjectId } from "mongoose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { isStaffRole } from "./definitions";
import { SESSION_COOKIE, signAccessToken, verifyAccessToken } from "./jwt";

export type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "moderator";
  avatar: string | null;
};

/** Signs a session for a staff member and stores it in the httpOnly cookie. */
export async function createSession(user: { id: string; role: string }) {
  const token = await signAccessToken({ userId: user.id, role: user.role });
  const { exp } = decodeJwt(token);

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date((exp ?? 0) * 1000),
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/**
 * The signed-in staff member, re-read from the database so a role change or deleted account takes
 * effect immediately. Null when signed out or no longer staff. Cached for the request.
 */
export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const session = await verifyAccessToken((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session || !isValidObjectId(session.userId)) return null;

  await connectToDatabase();
  const user = await User.findById(session.userId, { name: 1, email: 1, role: 1, avatar: 1 }).lean();
  if (!user || !isStaffRole(user.role)) return null;

  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar ?? null,
  };
});

/** For pages: the staff member, or a redirect to the login page. */
export async function requireStaffPage(options: { adminOnly?: boolean } = {}) {
  const user = await getStaffUser();
  if (!user) redirect("/login");
  if (options.adminOnly && user.role !== "admin") redirect("/dashboard?denied=1");
  return user;
}

export class AuthError extends Error {}

/** For server actions and route handlers: throws AuthError unless signed in with the right role. */
export async function requireStaff(options: { adminOnly?: boolean } = {}) {
  const user = await getStaffUser();
  if (!user) throw new AuthError("Your session has expired. Sign in again.");
  if (options.adminOnly && user.role !== "admin") throw new AuthError("Only admins can do that.");
  return user;
}
