import { NextResponse } from "next/server";
import { getSessionUser } from "@/app/lib/session";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await getSessionUser(request);
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Failed to load authenticated user:", error);
    return NextResponse.json(
      { message: "Unable to verify the current session." },
      { status: 500 },
    );
  }
}
