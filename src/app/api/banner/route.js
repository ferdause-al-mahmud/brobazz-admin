import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET Route: Fetch all banners
export const GET = async () => {
    try {
        const db = await connectDB();
        const coverCollection = db.collection("coverPictures");
        const totalCover = await coverCollection.find({}).toArray();

        return NextResponse.json({
            success: true,
            data: totalCover,
        });
    } catch (error) {
        console.error("Error fetching cover pictures:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};

// POST Route: Add a new banner
export const POST = async (request) => {
    try {
        const db = await connectDB();
        const coverCollection = db.collection("coverPictures");

        const body = await request.json();

        if (!body.url) {
            return NextResponse.json(
                { success: false, message: "Missing required field: url" },
                { status: 400 },
            );
        }

        await coverCollection.insertOne({
            url: body.url,
            link: body.link?.trim() || "",
            createdAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "Banner added successfully",
        });
    } catch (error) {
        console.error("Error adding banner:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};

// PUT Route: Update an existing banner
export const PUT = async (request) => {
    try {
        const db = await connectDB();
        const coverCollection = db.collection("coverPictures");

        const body = await request.json();
        const id = body._id;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Missing _id parameter" },
                { status: 400 },
            );
        }

        const update = {};

        if (Object.prototype.hasOwnProperty.call(body, "url")) {
            update.url = body.url;
        }

        if (Object.prototype.hasOwnProperty.call(body, "link")) {
            update.link = typeof body.link === "string" ? body.link.trim() : "";
        }

        if (Object.keys(update).length === 0) {
            return NextResponse.json(
                { success: false, message: "Nothing to update" },
                { status: 400 },
            );
        }

        const result = await coverCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { ...update, updatedAt: new Date() } },
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, message: "Banner not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Banner updated successfully",
        });
    } catch (error) {
        console.error("Error updating banner:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};

// DELETE Route: Delete a banner by _id
export const DELETE = async (request) => {
    try {
        const db = await connectDB();
        const coverCollection = db.collection("coverPictures");

        const body = await request.json();
        const id = body._id;

        if (!id) {
            return NextResponse.json(
                { success: false, message: "Missing _id parameter" },
                { status: 400 },
            );
        }

        const result = await coverCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, message: "Banner not found" },
                { status: 404 },
            );
        }

        return NextResponse.json({
            success: true,
            message: "Banner deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting banner:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 },
        );
    }
};
