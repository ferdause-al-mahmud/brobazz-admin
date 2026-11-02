import bcrypt from "bcrypt";
import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDB";
import { isStaff, setSessionCookie, toSessionUser } from "@/app/lib/session";

// Compared against when the email doesn't exist, so a failed login takes the same time
// whether or not the account exists.
const DUMMY_HASH = "$2b$12$iyPfaAfNvmrKyFVMnLc.YuJTM/3xHd2JTig5MNgliRfHcwkAqCvmS";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { message: "A valid JSON request body is required." },
        { status: 400 },
      );
    }

    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) {
      return NextResponse.json(
        { message: "Email and password are required." },
        { status: 400 },
      );
    }

    // Same `users` collection as the customer app; passwords are bcrypt hashes there too.
    const db = await connectDB();
    const user = await db.collection("users").findOne({ email });
    const passwordMatches = await bcrypt.compare(
      password,
      typeof user?.password === "string" ? user.password : DUMMY_HASH,
    );

    if (!user || !passwordMatches) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
    }
    if (!isStaff(user)) {
      return NextResponse.json(
        { message: "This account doesn't have access to the admin panel." },
        { status: 403 },
      );
    }

    return setSessionCookie(NextResponse.json({ user: toSessionUser(user) }), user);
  } catch (error) {
    console.error("Failed to sign in:", error);
    return NextResponse.json(
      { message: "Unable to sign in. Please try again." },
      { status: 500 },
    );
  }
}
