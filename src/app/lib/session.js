import { decodeJwt } from "jose";
import { ObjectId } from "mongodb";
import { connectDB } from "@/app/lib/connectDB";
import {
  SESSION_COOKIE_NAME,
  signAccessToken,
  STAFF_ROLES,
  verifyAccessToken,
} from "@/app/lib/jwt";

export { SESSION_COOKIE_NAME };

export const isStaff = (user) => STAFF_ROLES.includes(user?.role);

export const toSessionUser = (user) => ({
  _id: user._id.toString(),
  name: user.name || "",
  email: user.email,
  role: user.role || "customer",
  avatar: user.avatar || null,
});

/** Signs a session for a staff user and sets the httpOnly cookie on `response`. */
export const setSessionCookie = async (response, user) => {
  const token = await signAccessToken({ userId: user._id.toString(), role: user.role });
  // The cookie expires with the token (JWT_ACCESS_EXPIRES_IN).
  const { exp } = decodeJwt(token);

  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: new Date(exp * 1000),
  });
  return response;
};

export const clearSessionCookie = (response) => {
  response.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
};

/**
 * The signed-in staff user, re-read from the database so a role change or deleted account
 * takes effect immediately. Returns null when signed out or no longer staff.
 */
export const getSessionUser = async (request) => {
  const session = await verifyAccessToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  if (!session || !ObjectId.isValid(session.userId)) return null;

  const db = await connectDB();
  const user = await db.collection("users").findOne(
    { _id: new ObjectId(session.userId) },
    { projection: { name: 1, email: 1, role: 1, avatar: 1 } },
  );

  return user && isStaff(user) ? toSessionUser(user) : null;
};
