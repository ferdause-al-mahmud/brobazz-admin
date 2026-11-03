import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

const GOOGLE_STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  // Same OAuth client as the customer app; GOOGLE_CLIENT_ID kept as a fallback.
  const clientId = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    console.error("Google OAuth requires OAUTH_CLIENT_ID and GOOGLE_REDIRECT_URI.");
    return NextResponse.redirect(new URL("/login?error=google_unavailable", request.url));
  }

  const state = randomBytes(32).toString("base64url");
  const requested = request.nextUrl.searchParams.get("returnUrl") || "/dashboard";
  const returnUrl = requested.startsWith("/") && !requested.startsWith("//") ? requested : "/dashboard";

  const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authorizationUrl.search = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  }).toString();

  const response = NextResponse.redirect(authorizationUrl);
  response.cookies.set(GOOGLE_STATE_COOKIE, `${state}.${Buffer.from(returnUrl).toString("base64url")}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 10 * 60,
  });
  return response;
}
