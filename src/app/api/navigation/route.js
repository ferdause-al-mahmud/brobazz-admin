import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

const buildNavigationTree = (items) => {
  const map = {};
  // initialize map and children
  items.forEach((it) => {
    map[it._id] = { ...it, children: [] };
  });

  const roots = [];
  items.forEach((it) => {
    const parentId = it.parentId || null;
    if (!parentId) {
      roots.push(map[it._id]);
    } else if (map[parentId]) {
      map[parentId].children.push(map[it._id]);
    } else {
      // defensive: if parent not found, treat as root
      roots.push(map[it._id]);
    }
  });

  const sortRecursive = (nodes) => {
    nodes.sort((a, b) => (a.order || 0) - (b.order || 0));
    nodes.forEach((n) => sortRecursive(n.children));
  };

  sortRecursive(roots);
  return roots;
};

export const GET = async (req) => {
  try {
    const db = await connectDB();
    const navColl = db.collection("navigation");

    // Admin GET should return all items (active and inactive)
    const items = await navColl.find({}).sort({ order: 1 }).toArray();

    // Normalize ids to strings
    const normalized = items.map((it) => ({
      ...it,
      _id: String(it._id),
      parentId: it.parentId ? String(it.parentId) : null,
    }));

    const tree = buildNavigationTree(normalized);

    return NextResponse.json({ success: true, navigation: tree }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch navigation (admin):", error);
    return NextResponse.json(
      { success: false, message: "Failed to fetch navigation" },
      { status: 500 },
    );
  }
};

export const POST = async (req) => {
  try {
    const db = await connectDB();
    const navColl = db.collection("navigation");

    const body = await req.json();

    const { title, type, path = "", parentId = null } = body;

    if (!title || !type) {
      return NextResponse.json({ success: false, message: "Title and type are required" }, { status: 400 });
    }

    if (!["link", "dropdown"].includes(type)) {
      return NextResponse.json({ success: false, message: "Invalid type" }, { status: 400 });
    }

    if (type === "link" && (!path || path.trim() === "")) {
      return NextResponse.json({ success: false, message: "Path is required for link type" }, { status: 400 });
    }

    let parentObjId = null;
    if (parentId) {
      try {
        parentObjId = new ObjectId(parentId);
      } catch (err) {
        return NextResponse.json({ success: false, message: "Invalid parentId" }, { status: 400 });
      }
    }

    // Determine next order among siblings (same parent)
    const siblingQuery = parentObjId ? { parentId: parentObjId } : { parentId: null };
    const highest = await navColl.find(siblingQuery).sort({ order: -1 }).limit(1).toArray();
    const nextOrder = highest && highest.length > 0 ? (highest[0].order || 0) + 1 : 1;

    const newDoc = {
      title,
      type,
      path: path || "",
      parentId: parentObjId,
      order: body.order || nextOrder,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      createdAt: new Date().toISOString(),
    };

    const result = await navColl.insertOne(newDoc);

    const inserted = {
      ...newDoc,
      _id: String(result.insertedId),
      parentId: newDoc.parentId ? String(newDoc.parentId) : null,
    };

    return NextResponse.json({ success: true, navigation: inserted }, { status: 201 });
  } catch (error) {
    console.error("Failed to create navigation:", error);
    return NextResponse.json({ success: false, message: "Failed to create navigation" }, { status: 500 });
  }
};
