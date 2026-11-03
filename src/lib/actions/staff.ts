"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";
import { InputError, runAction } from "./result";

type StaffRole = "admin" | "moderator" | "customer";

/**
 * Gives an existing storefront account a staff role (or takes it away with "customer").
 * The person signs up on the storefront first; the admin panel never creates accounts.
 */
export async function setUserRole(email: string, role: StaffRole) {
  return runAction(async () => {
    const me = await requireStaff({ adminOnly: true });
    if (!["admin", "moderator", "customer"].includes(role)) throw new InputError("Unknown role");
    await connectToDatabase();

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      throw new InputError("No account uses that email. Ask them to register on the storefront first.", {
        email: "No account with this email",
      });
    }
    if (String(user._id) === me.id) throw new InputError("You can't change your own role");
    if (user.role === "admin" && role !== "admin" && (await User.countDocuments({ role: "admin" })) <= 1) {
      throw new InputError("The store needs at least one admin");
    }

    user.role = role;
    await user.save();
    revalidatePath("/settings/staff");
    return user.name;
  }, role === "customer" ? "Staff access removed" : "Role updated");
}
