// pages/api/products.js
import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic"; // This prevents static rendering issues

export async function GET(req) {
    const db = await connectDB();
    const productsCollection = db.collection("products");

    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    try {
        // If a name is provided, search products by name
        let sortOption = { createdAt: -1 }
        let query = {};
        if (name) {
            query = {
                name: { $regex: new RegExp(name, "i") }, // Case-insensitive search
            };
        }

        // Fetch matching products
        const products = await productsCollection.find(query).sort(sortOption).toArray();

        return NextResponse.json({ orders: products });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { error: "Failed to fetch products", details: error.message },
            { status: 500 }
        );
    }
}
