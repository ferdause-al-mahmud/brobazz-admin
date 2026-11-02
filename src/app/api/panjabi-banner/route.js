import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const GET = async (req) => {
    const db = await connectDB();
    const productCollection = db.collection("products");

    // Extract query parameters from the request URL
    const { searchParams } = new URL(req.url);
    const name = searchParams.get("name");

    if (!name) {
        return NextResponse.json({ error: "Name parameter is required" }, { status: 400 });
    }

    try {
        // Case-insensitive regex search for both subcategory and category
        const regex = new RegExp(`^${name}$`, "i");

        // Convert string date to actual Date object
        const dateFilter = new Date("2025-02-10T19:22:51.374Z");

        const pipeline = [
            {
                $addFields: { createdAt: { $toDate: "$createdAt" } } // Convert string to Date
            },
            {
                $match: {
                    $or: [{ subcategory: regex }, { category: regex }],
                    createdAt: { $gt: dateFilter } // Compare converted Date
                }
            },
            { $sort: { createdAt: -1 } }, // Sort in descending order (latest first)

            {
                $project: {
                    id: 1,
                    firstImageUrl: { $arrayElemAt: ["$imageUrl", 0] },
                    createdAt: 1 // Optional: Return converted date for debugging
                },
            },
        ];

        const products = await productCollection.aggregate(pipeline).toArray();

        // Count total products with the same date filter
        const totalProducts = await productCollection.aggregate([
            { $addFields: { createdAt: { $toDate: "$createdAt" } } },
            {
                $match: {
                    $or: [{ subcategory: regex }, { category: regex }],
                    createdAt: { $lte: dateFilter }
                }
            },
            { $count: "totalProducts" }
        ]).toArray();

        return NextResponse.json({
            products,
            totalProducts: totalProducts.length > 0 ? totalProducts[0].totalProducts : 0,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
