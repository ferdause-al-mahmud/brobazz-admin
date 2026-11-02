// pages/api/products.js
import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET() {
    const db = await connectDB();
    const bannersCollection = db.collection("banners");


    try {
        // If a name is provided, search products by name
        let sortOption = { createdAt: -1 }
        let query = {};

        // Fetch matching products
        const banners = await bannersCollection.find(query).sort(sortOption).toArray();

        return NextResponse.json({ banners: banners });
    } catch (error) {
        console.error("Error fetching banners:", error);
        return NextResponse.json(
            { error: "Failed to fetch banners", details: error.message },
            { status: 500 }
        );
    }
}
