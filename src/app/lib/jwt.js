// Same token format as the Brobazz customer app (HS256, user id in `sub`, `role` claim),
// signed with JWT_ACCESS_SECRET. No database or next/headers imports, so proxy.js can use it.
import { jwtVerify, SignJWT } from "jose";

// Separate from the customer cookie so signing in or out of one app never affects the other
// (on localhost both apps share cookies across ports).
export const SESSION_COOKIE_NAME = "brobazz_admin_session";

// Roles allowed into the admin panel at all.
export const STAFF_ROLES = ["admin", "moderator"];

const secretKey = () => {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET must be set in .env");
  return new TextEncoder().encode(secret);
};

export const signAccessToken = ({ userId, role }) =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_ACCESS_EXPIRES_IN || "72h")
    .sign(secretKey());

/** Returns { userId, role } for a valid token, or null for a missing, tampered or expired one. */
export const verifyAccessToken = async (token) => {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
};
