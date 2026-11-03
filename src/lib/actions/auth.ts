"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { isStaffRole } from "@/lib/auth/definitions";
import { createSession, deleteSession } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

// Compared against when the email doesn't exist, so a failed login takes the same time
// whether or not the account exists.
const DUMMY_HASH = "$2b$12$iyPfaAfNvmrKyFVMnLc.YuJTM/3xHd2JTig5MNgliRfHcwkAqCvmS";

export type LoginState = { error?: string; email?: string } | undefined;

/** Only allow returning to a path on this site. */
function safeReturnUrl(value: FormDataEntryValue | null) {
  const url = typeof value === "string" ? value : "";
  return url.startsWith("/") && !url.startsWith("//") ? url : "/dashboard";
}

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", email };

  try {
    // Same users collection as the storefront; passwords are bcrypt hashes there too.
    await connectToDatabase();
    const user = await User.findOne({ email }).select("+password").lean();
    const matches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

    if (!user || !matches) return { error: "Invalid email or password.", email };
    if (!isStaffRole(user.role)) {
      return { error: "This account doesn't have access to the admin panel.", email };
    }

    await createSession({ id: String(user._id), role: user.role });
  } catch (error) {
    console.error("Sign-in failed", error);
    return { error: "Couldn't sign you in right now. Please try again.", email };
  }

  redirect(safeReturnUrl(formData.get("returnUrl")));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
