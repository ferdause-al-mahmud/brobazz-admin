import type { Metadata } from "next";
import { StaffManager } from "@/components/settings/StaffManager";
import { PageHeader } from "@/components/ui/Page";
import { requireStaffPage } from "@/lib/auth/session";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/lib/models/User";

export const metadata: Metadata = { title: "Staff" };

export default async function StaffPage() {
  const me = await requireStaffPage({ adminOnly: true });
  await connectToDatabase();
  const staff = await User.find({ role: { $in: ["admin", "moderator"] } }, { name: 1, email: 1, role: 1, createdAt: 1 })
    .sort({ role: 1, name: 1 })
    .lean();

  return (
    <>
      <PageHeader description="Who can sign in to the admin panel, and what they can change." title="Staff" />
      <StaffManager
        meId={me.id}
        staff={staff.map((user) => ({
          id: String(user._id),
          name: user.name,
          email: user.email,
          role: user.role as "admin" | "moderator",
          createdAt: user.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
