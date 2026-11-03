import "server-only";
import { signAccessToken } from "@/lib/auth/jwt";

// Cache tags the storefront understands (customer/lib/catalog.ts).
export type StorefrontTag = "products" | "categories" | "collections" | "settings" | "reviews";

/**
 * Tells the storefront to drop its cached copy of these tags so admin edits show up right away.
 * Never throws: if the storefront is unreachable the change is still saved, and the storefront's
 * cache expires on its own within the hour.
 */
export async function revalidateStorefront(tags: StorefrontTag[], userId = "admin-panel") {
  const base = process.env.STOREFRONT_URL;
  if (!base) {
    console.warn("STOREFRONT_URL isn't set; the storefront will pick up changes when its cache expires.");
    return;
  }

  try {
    const token = await signAccessToken({ userId, role: "admin" }, "2m");
    const response = await fetch(new URL("/api/revalidate", base), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ tags }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) console.warn(`Storefront revalidation returned ${response.status}`);
  } catch (error) {
    console.warn("Couldn't reach the storefront to refresh its cache", error);
  }
}
