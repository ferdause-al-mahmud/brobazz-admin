import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const GET = async (req, { params }) => {
  try {
    const { id } = await params;
    const db = await connectDB();
    const navColl = db.collection("navigation");

    const item = await navColl.findOne({ _id: new ObjectId(id) });
    if (!item) {
      return NextResponse.json({ success: false, message: "Navigation item not found" }, { status: 404 });
    }

    const normalized = { ...item, _id: String(item._id), parentId: item.parentId ? String(item.parentId) : null };
    return NextResponse.json({ success: true, navigation: normalized }, { status: 200 });
  } catch (error) {
    console.error("Error fetching navigation item:", error);
    return NextResponse.json({ success: false, message: "Failed to fetch navigation item" }, { status: 500 });
  }
};

export const PUT = async (req, { params }) => {
  try {
    const { id } = await params;
    const db = await connectDB();
    const navColl = db.collection("navigation");

    const body = await req.json();
    const { title, type, path = "", parentId = null, order, isActive } = body;

    if (!title || !type) {
      return NextResponse.json({ success: false, message: "Title and type are required" }, { status: 400 });
    }

    if (!["link", "dropdown"].includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
    }

    if (type === "link" && (!path || path.trim() === "")) {
      return NextResponse.json({ success: false, message: "Path is required for link type" }, { status: 400 });
    }

    const itemId = new ObjectId(id);

    // Validate parentId (cannot be self)
    let parentObjId = null;
    if (parentId) {
      try {
        parentObjId = new ObjectId(parentId);
      } catch (err) {
        return NextResponse.json({ success: false, message: "Invalid parentId" }, { status: 400 });
      }

      if (String(parentObjId) === String(itemId)) {
        return NextResponse.json({ success: false, message: "parentId cannot be the item itself" }, { status: 400 });
      }

      // Prevent circular references: walk up parents
      let currentParent = await navColl.findOne({ _id: parentObjId });
      while (currentParent) {
        if (String(currentParent._id) === String(itemId)) {
          return NextResponse.json({ success: false, message: "Circular parent relationship detected" }, { status: 400 });
        }
        if (!currentParent.parentId) break;
        currentParent = await navColl.findOne({ _id: currentParent.parentId });
      }
    }

    const updateDoc = {
      $set: {
        title,
        type,
        path: path || "",
        parentId: parentObjId,
        order: typeof order === "number" ? order : undefined,
        isActive: typeof isActive === "boolean" ? isActive : undefined,
        updatedAt: new Date().toISOString(),
      },
    };

    // Remove undefined fields from $set
    Object.keys(updateDoc.$set).forEach((k) => updateDoc.$set[k] === undefined && delete updateDoc.$set[k]);

    const res = await navColl.updateOne({ _id: itemId }, updateDoc);
    if (res.matchedCount === 0) {
      return NextResponse.json({ success: false, message: "Navigation item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Navigation updated successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error updating navigation item:", error);
    return NextResponse.json({ success: false, message: "Failed to update navigation item" }, { status: 500 });
  }
};

export const DELETE = async (req, { params }) => {
  try {
    const { id } = await params;
    const db = await connectDB();
    const navColl = db.collection("navigation");

    const itemId = new ObjectId(id);

    // Check for children
    const child = await navColl.findOne({ parentId: itemId });
    if (child) {
      return NextResponse.json({ success: false, message: "Cannot delete this navigation item because it has child items." }, { status: 400 });
    }

    const res = await navColl.deleteOne({ _id: itemId });
    if (res.deletedCount === 0) {
      return NextResponse.json({ success: false, message: "Navigation item not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Navigation deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error deleting navigation item:", error);
    return NextResponse.json({ success: false, message: "Failed to delete navigation item" }, { status: 500 });
  }
};
