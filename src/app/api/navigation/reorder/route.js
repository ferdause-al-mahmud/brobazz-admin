import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const POST = async (req) => {
  try {
    const db = await connectDB();
    const navColl = db.collection("navigation");

    const body = await req.json();
    const { id, direction } = body;

    if (!id || (direction !== "up" && direction !== "down")) {
      return NextResponse.json({ success: false, message: "Invalid request" }, { status: 400 });
    }

    const itemId = new ObjectId(id);
    const item = await navColl.findOne({ _id: itemId });
    if (!item) return NextResponse.json({ success: false, message: "Item not found" }, { status: 404 });

    const parentId = item.parentId || null;
    const siblingQuery = parentId ? { parentId: parentId } : { parentId: null };

    const siblings = await navColl.find(siblingQuery).sort({ order: 1 }).toArray();
    // find index
    const index = siblings.findIndex((s) => String(s._id) === String(id));
    if (index === -1) return NextResponse.json({ success: false, message: "Item not found among siblings" }, { status: 404 });

    let swapWithIndex = direction === "up" ? index - 1 : index + 1;
    if (swapWithIndex < 0 || swapWithIndex >= siblings.length) {
      return NextResponse.json({ success: false, message: "Cannot move further" }, { status: 400 });
    }

    const current = siblings[index];
    const swapWith = siblings[swapWithIndex];

    // swap the order values
    const curOrder = current.order || 0;
    const swapOrder = swapWith.order || 0;

    await navColl.updateOne({ _id: current._id }, { $set: { order: swapOrder } });
    await navColl.updateOne({ _id: swapWith._id }, { $set: { order: curOrder } });

    return NextResponse.json({ success: true, message: "Reordered successfully" }, { status: 200 });
  } catch (error) {
    console.error("Error reordering navigation:", error);
    return NextResponse.json({ success: false, message: "Failed to reorder navigation" }, { status: 500 });
  }
};
