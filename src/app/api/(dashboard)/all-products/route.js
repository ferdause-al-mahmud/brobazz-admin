import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export const GET = async (req) => {
    try {
        const db = await connectDB();
        const productsCollection = db.collection("products");

        const { searchParams } = new URL(req.url);

        const page = parseInt(searchParams.get("page") || "1");
        const limit = parseInt(searchParams.get("limit") || "10");
        const sortBy = searchParams.get("sortBy") || "";
        const category = searchParams.get("category") || "";

        // Build query
        const query = {};

        if (category) {
            query.$or = [
                {
                    category: {
                        $regex: `^${category}$`,
                        $options: "i",
                    },
                },
                {
                    subcategory: {
                        $regex: `^${category}$`,
                        $options: "i",
                    },
                },
            ];
        }

        const totalProducts = await productsCollection.countDocuments(query);
        const skip = (page - 1) * limit;

        let products = [];

        // Custom sorting when sortBy is provided
        if (sortBy === "lowToHigh") {
            products = await productsCollection
                .find(query)
                .sort({ price: 1 })
                .skip(skip)
                .limit(limit)
                .toArray();
        } else if (sortBy === "highToLow") {
            products = await productsCollection
                .find(query)
                .sort({ price: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
        } else if (sortBy === "oldest") {
            products = await productsCollection
                .find(query)
                .sort({ createdAt: 1 })
                .skip(skip)
                .limit(limit)
                .toArray();
        } else {
            products = await productsCollection
                .find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray();
        }

        return NextResponse.json({
            products,
            totalProducts,
            totalPages: Math.ceil(totalProducts / limit),
            currentPage: page,
        });
    } catch (error) {
        console.error("Error fetching products:", error);

        return NextResponse.json(
            { message: "Server error" },
            { status: 500 }
        );
    }
};