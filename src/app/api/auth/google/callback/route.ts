import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { isStaffRole } from "@/lib/auth/definitions";
import { createSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

const GOOGLE_STATE_COOKIE = "google_oauth_state";

function finish(request: NextRequest, target: string) {
  const response = NextResponse.redirect(new URL(target, request.url));
  response.cookies.set(GOOGLE_STATE_COOKIE, "", { path: "/api/auth/google", maxAge: 0 });
  return response;
}

function decodeReturnUrl(encoded: string) {
  try {
    const url = Buffer.from(encoded, "base64url").toString();
    return url.startsWith("/") && !url.startsWith("//") ? url : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const [cookieState = "", encodedReturnUrl, extra] = (request.cookies.get(GOOGLE_STATE_COOKIE)?.value ?? "").split(".");
  const queryState = params.get("state") ?? "";
  const code = params.get("code");

  const stateMatches =
    cookieState.length > 0 &&
    cookieState.length === queryState.length &&
    timingSafeEqual(Buffer.from(cookieState), Buffer.from(queryState));
  if (!stateMatches || extra || !encodedReturnUrl) return finish(request, "/login?error=google_login_failed");
  if (params.has("error") || !code) return finish(request, "/login?error=google_login_cancelled");

  const clientId = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) return finish(request, "/login?error=google_unavailable");

  try {
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
      cache: "no-store",
    });
    const tokens = (await tokenResponse.json().catch(() => ({}))) as { access_token?: string };
    if (!tokenResponse.ok || typeof tokens.access_token !== "string") {
      return finish(request, "/login?error=google_login_failed");
    }

    const profileResponse = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
      cache: "no-store",
    });
    const profile = (await profileResponse.json().catch(() => ({}))) as {
      sub?: string;
      email?: string;
      email_verified?: boolean;
    };
    const email = profile.email?.trim().toLowerCase();
    if (!profileResponse.ok || profile.email_verified !== true || !profile.sub || !email) {
      return finish(request, "/login?error=google_login_failed");
    }

    await connectToDatabase();
    const user = (await User.findOne({ googleId: profile.sub })) ?? (await User.findOne({ email }));
    if (user?.googleId && user.googleId !== profile.sub) {
      return finish(request, "/login?error=google_account_conflict");
    }
    // The admin panel never creates accounts: only existing admins and moderators may sign in.
    if (!user || !isStaffRole(user.role)) return finish(request, "/login?error=google_no_access");

    if (!user.googleId) {
      user.googleId = profile.sub;
      await user.save();
    }

    await createSession({ id: String(user._id), role: user.role });
    return finish(request, decodeReturnUrl(encodedReturnUrl));
  } catch (error) {
    console.error("Google sign-in failed", error);
    return finish(request, "/login?error=google_login_failed");
  }
}
