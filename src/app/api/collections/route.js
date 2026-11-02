import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDB";
import { ObjectId } from "mongodb";

export const GET = async () => {
    try {
        const db = await connectDB();
        const collections = db.collection("collections");
        const data = await collections.find({}).sort({ serialNo: 1, createdAt: 1 }).toArray();

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error("Error fetching collections:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};

export const POST = async (request) => {
    try {
        const db = await connectDB();
        const collections = db.collection("collections");
        const body = await request.json();

        if (!body.name || !body.path || !body.imageUrl) {
            return NextResponse.json(
                { success: false, message: "Name, path, and imageUrl are required" },
                { status: 400 },
            );
        }

        const serialNo = Number(body.serialNo ?? 0);

        const result = await collections.insertOne({
            name: body.name,
            path: body.path,
            imageUrl: body.imageUrl,
            serialNo: Number.isFinite(serialNo) ? serialNo : 0,
            createdAt: new Date(),
        });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("Error creating collection:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};

export const PUT = async (request) => {
    try {
        const db = await connectDB();
        const collections = db.collection("collections");
        const body = await request.json();

        if (!body._id) {
            return NextResponse.json(
                { success: false, message: "Missing _id" },
                { status: 400 },
            );
        }

        const update = {};
        if (body.name) update.name = body.name;
        if (body.path) update.path = body.path;
        if (body.imageUrl) update.imageUrl = body.imageUrl;
        if (Object.prototype.hasOwnProperty.call(body, "serialNo")) {
            update.serialNo = Number(body.serialNo ?? 0);
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json(
                { success: false, message: "Nothing to update" },
                { status: 400 },
            );
        }

        const result = await collections.updateOne(
            { _id: new ObjectId(body._id) },
            { $set: { ...update, updatedAt: new Date() } },
        );

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("Error updating collection:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};

export const DELETE = async (request) => {
    try {
        const db = await connectDB();
        const collections = db.collection("collections");
        const body = await request.json();

        if (!body._id) {
            return NextResponse.json(
                { success: false, message: "Missing _id" },
                { status: 400 },
            );
        }

        const result = await collections.deleteOne({ _id: new ObjectId(body._id) });

        return NextResponse.json({ success: true, data: result });
    } catch (error) {
        console.error("Error deleting collection:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};
