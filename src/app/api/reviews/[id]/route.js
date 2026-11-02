import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const PATCH = async (req, { params }) => {
    const db = await connectDB();
    const reviewsCollection = db.collection("reviews");

    try {
        const { id } = await params;
        const updateData = await req.json();

        // Validate ID
        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { message: "Invalid review ID" },
                { status: 400 }
            );
        }

        // Update the review (status approval/disapproval)
        const result = await reviewsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: updateData.status } }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { message: "Review not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Review updated successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating review:", error);
        return NextResponse.json(
            { message: "Failed to update review" },
            { status: 500 }
        );
    }
};

export const DELETE = async (req, { params }) => {
    const db = await connectDB();
    const reviewsCollection = db.collection("reviews");

    try {
        const { id } = params;

        // Validate ID
        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { message: "Invalid review ID" },
                { status: 400 }
            );
        }

        const result = await reviewsCollection.deleteOne({
            _id: new ObjectId(id),
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { message: "Review not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Review deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting review:", error);
        return NextResponse.json(
            { message: "Failed to delete review" },
            { status: 500 }
        );
    }
};
