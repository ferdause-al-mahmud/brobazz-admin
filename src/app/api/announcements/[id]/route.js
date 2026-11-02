import { connectDB } from "@/app/lib/connectDB";
import { requireAuth } from "@/app/utils/requireAuth";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

const normalizeAnnouncement = (announcement) => ({
  ...announcement,
  _id: String(announcement._id),
});

const getAnnouncementId = async (params) => {
  const resolvedParams = await params;
  return resolvedParams.id;
};

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

export const GET = async (request, { params }) => {
  try {
    const id = await getAnnouncementId(params);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid announcement id" },
        { status: 400 },
      );
    }

    const db = await connectDB();
    const announcements = db.collection("announcements");
    const announcement = await announcements.findOne({ _id: new ObjectId(id) });

    if (!announcement) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      announcement: normalizeAnnouncement(announcement),
    });
  } catch (error) {
    console.error("Failed to fetch announcement:", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch announcement" },
      { status: 500 },
    );
  }
};

export const PUT = async (request, { params }) => {

  try {
    const id = await getAnnouncementId(params);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid announcement id" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const text = body.text?.trim();

    if (!text) {
      return NextResponse.json(
        { success: false, message: "Announcement text is required" },
        { status: 400 },
      );
    }

    const update = {
      text,
      updatedAt: new Date(),
    };

    if (Object.prototype.hasOwnProperty.call(body, "order")) {
      const order = Number(body.order);
      update.order = Number.isFinite(order) ? order : 0;
    }

    if (Object.prototype.hasOwnProperty.call(body, "isActive")) {
      update.isActive = !!body.isActive;
    }

    const db = await connectDB();
    const announcements = db.collection("announcements");
    const result = await announcements.updateOne(
      { _id: new ObjectId(id) },
      { $set: update },
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Announcement updated successfully",
    });
  } catch (error) {
    console.error("Failed to update announcement:", error);
    return NextResponse.json(
      { success: false, message: "Failed to update announcement" },
      { status: 500 },
    );
  }
};

export const DELETE = async (request, { params }) => {

  try {
    const id = await getAnnouncementId(params);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid announcement id" },
        { status: 400 },
      );
    }

    const db = await connectDB();
    const announcements = db.collection("announcements");
    const result = await announcements.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, message: "Announcement not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Announcement deleted successfully",
    });
  } catch (error) {
    console.error("Failed to delete announcement:", error);
    return NextResponse.json(
      { success: false, message: "Failed to delete announcement" },
      { status: 500 },
    );
  }
};
