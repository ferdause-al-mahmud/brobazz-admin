import { connectDB } from "@/app/lib/connectDB";
import { requireAuth } from "@/app/utils/requireAuth";
import { NextResponse } from "next/server";

const normalizeAnnouncement = (announcement) => ({
  ...announcement,
  _id: String(announcement._id),
});

const requireAdmin = async (request) => {
  const auth = await requireAuth(request);

  if (auth.error || auth.user?.role !== "admin") {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  return null;
};

export const GET = async (request) => {

  try {
    const db = await connectDB();
    const announcements = db.collection("announcements");
    const data = await announcements.find({}).sort({ order: 1, createdAt: 1 }).toArray();

    return NextResponse.json({
      success: true,
      announcements: data.map(normalizeAnnouncement),
    });
  } catch (error) {
    console.error("Failed to fetch announcements:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch announcements" },
      { status: 500 },
    );
  }
};

export const POST = async (request) => {

  try {
    const db = await connectDB();
    const announcements = db.collection("announcements");
    const body = await request.json();
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Announcement text is required" },
        { status: 400 },
      );
    }

    const highest = await announcements.find({}).sort({ order: -1 }).limit(1).toArray();
    const nextOrder = highest.length > 0 ? (highest[0].order || 0) + 1 : 1;
    const order = Number(body.order ?? nextOrder);

    const newAnnouncement = {
      text,
      order: Number.isFinite(order) ? order : nextOrder,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await announcements.insertOne(newAnnouncement);

    return NextResponse.json(
      {
        success: true,
        announcement: normalizeAnnouncement({
          ...newAnnouncement,
          _id: result.insertedId,
        }),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create announcement:", error);
    return NextResponse.json(
      { success: false, message: "Failed to create announcement" },
      { status: 500 },
    );
  }
};
