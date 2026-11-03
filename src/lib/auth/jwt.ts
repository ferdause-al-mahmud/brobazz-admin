// Same token format as the customer app (HS256, user id in `sub`, `role` claim), signed with the
// shared JWT_ACCESS_SECRET. No database or next/headers imports, so proxy.ts can use it.
import { jwtVerify, SignJWT } from "jose";

// Separate from the customer cookie so signing in or out of one app never affects the other
// (on localhost both apps share cookies across ports).
export const SESSION_COOKIE = "brobazz_admin_session";

export type SessionPayload = { userId: string; role: string };

function secretKey() {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) throw new Error("JWT_ACCESS_SECRET must be set in .env");
  return new TextEncoder().encode(secret);
}

export function signAccessToken({ userId, role }: SessionPayload, expiresIn?: string) {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(expiresIn ?? process.env.JWT_ACCESS_EXPIRES_IN ?? "72h")
    .sign(secretKey());
}

/** Returns null for a missing, tampered or expired token. */
export async function verifyAccessToken(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string" || typeof payload.role !== "string") return null;
    return { userId: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}
