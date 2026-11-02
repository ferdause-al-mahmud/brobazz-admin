import { cookies } from "next/headers";
import { SESSION_COOKIE_NAME } from "@/app/lib/jwt";

/**
 * fetch() for Server Components that call this app's own API routes. Server-side requests
 * don't carry the browser's cookies, so this forwards the signed-in user's session cookie;
 * without it proxy.js answers 401.
 */
export async function serverFetch(url, init = {}) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const headers = new Headers(init.headers);
  if (token) headers.set("Cookie", `${SESSION_COOKIE_NAME}=${token}`);
  return fetch(url, { ...init, headers });
}
