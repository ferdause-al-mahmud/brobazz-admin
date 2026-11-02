import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const GET = async (req) => {
    const db = await connectDB();
    const reviewsCollection = db.collection("reviews");

    try {
        const reviews = await reviewsCollection.find({}).sort({ createdAt: -1 }).toArray();
        return NextResponse.json(reviews, { status: 200 });
    } catch (error) {
        console.error("Error fetching reviews:", error);
        return NextResponse.json(
            { message: "Failed to fetch reviews" },
            { status: 500 }
        );
    }
};

export const POST = async (req) => {
    const db = await connectDB();
    const reviewsCollection = db.collection("reviews");

    try {
        const reviewData = await req.json();

        // Validate required fields
        if (
            !reviewData.name ||
            !reviewData.email ||
            !reviewData.rating ||
            !reviewData.review
        ) {
            return NextResponse.json(
                { message: "Please provide all required fields" },
                { status: 400 }
            );
        }

        // Create review document with pending status
        const review = {
            ...reviewData,
            status: "pending", // Default status
            createdAt: new Date().toISOString(),
        };

        const result = await reviewsCollection.insertOne(review);

        return NextResponse.json(
            { message: "Review submitted successfully", review: { ...review, _id: result.insertedId } },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding review:", error);
        return NextResponse.json(
            { message: "Failed to add review" },
            { status: 500 }
        );
    }
};
