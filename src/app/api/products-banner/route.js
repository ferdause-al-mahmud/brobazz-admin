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

        const pipeline = [
            { $match: { $or: [{ subcategory: regex }, { category: regex }] } }, // Match either subcategory or category (case-insensitive)
            {
                $project: {
                    id: 1,
                    firstImageUrl: { $arrayElemAt: ["$imageUrl", 0] },
                },
            },
        ];

        const products = await productCollection.aggregate(pipeline).toArray();

        // Count total products for pagination metadata
        const totalProducts = await productCollection.countDocuments({
            $or: [{ subcategory: regex }, { category: regex }],
        });

        return NextResponse.json({
            products,
            totalProducts,
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};
