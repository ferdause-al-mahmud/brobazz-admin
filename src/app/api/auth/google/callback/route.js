import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDB";
import { isStaff, setSessionCookie } from "@/app/lib/session";

const GOOGLE_STATE_COOKIE = "google_oauth_state";

const getValidatedReturnUrl = (encodedReturnUrl, requestUrl) => {
  try {
    const returnUrl = new URL(
      Buffer.from(encodedReturnUrl, "base64url").toString(),
      requestUrl,
    );
    return returnUrl.origin === new URL(requestUrl).origin
      ? returnUrl
      : new URL("/dashboard", requestUrl);
  } catch {
    return new URL("/dashboard", requestUrl);
  }
};

const redirectToLogin = (request, errorCode) => {
  const response = NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(errorCode)}`, request.url),
  );
  response.cookies.set(GOOGLE_STATE_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 0,
  });
  return response;
};

export async function GET(request) {
  const url = new URL(request.url);
  const stateCookie = request.cookies.get(GOOGLE_STATE_COOKIE)?.value || "";
  const [cookieState, encodedReturnUrl, extra] = stateCookie.split(".");
  const queryState = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code");

  const stateMatches =
    cookieState &&
    queryState &&
    cookieState.length === queryState.length &&
    timingSafeEqual(Buffer.from(cookieState), Buffer.from(queryState));

  if (!stateMatches || extra || !encodedReturnUrl) {
    return redirectToLogin(request, "google_login_failed");
  }

  if (url.searchParams.has("error") || !code) {
    return redirectToLogin(request, "google_login_cancelled");
  }

  const clientId = process.env.OAUTH_CLIENT_ID || process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.OAUTH_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    console.error(
      "Google OAuth requires OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, and GOOGLE_REDIRECT_URI.",
    );
    return redirectToLogin(request, "google_unavailable");
  }

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

    if (!tokenResponse.ok) {
      console.error("Google rejected the OAuth authorization-code exchange.");
      return redirectToLogin(request, "google_login_failed");
    }

    const tokens = await tokenResponse.json();
    if (typeof tokens.access_token !== "string") {
      console.error("Google OAuth response did not include an access token.");
      return redirectToLogin(request, "google_login_failed");
    }

    const profileResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
        cache: "no-store",
      },
    );

    if (!profileResponse.ok) {
      console.error("Unable to retrieve the Google account profile.");
      return redirectToLogin(request, "google_login_failed");
    }

    const profile = await profileResponse.json();
    const email =
      typeof profile.email === "string" ? profile.email.trim().toLowerCase() : "";

    if (
      profile.email_verified !== true ||
      typeof profile.sub !== "string" ||
      !email
    ) {
      return redirectToLogin(request, "google_login_failed");
    }

    const db = await connectDB();
    const users = db.collection("users");
    let user = await users.findOne({ googleId: profile.sub });

    if (!user) {
      const escapedEmail = email.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      user = await users.findOne({
        email: { $regex: `^${escapedEmail}$`, $options: "i" },
      });
    }

    if (user?.googleId && user.googleId !== profile.sub) {
      return redirectToLogin(request, "google_account_conflict");
    }

    // The admin panel never creates accounts: only existing admins/moderators may sign in.
    if (!user || !isStaff(user)) {
      return redirectToLogin(request, "google_no_access");
    }

    if (!user.googleId) {
      await users.updateOne({ _id: user._id }, { $set: { googleId: profile.sub } });
    }

    const response = NextResponse.redirect(
      getValidatedReturnUrl(encodedReturnUrl, request.url),
    );
    await setSessionCookie(response, user);
    response.cookies.set(GOOGLE_STATE_COOKIE, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth/google",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("Failed to complete Google sign-in:", error);
    return redirectToLogin(request, "google_login_failed");
  }
}
