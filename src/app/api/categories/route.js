import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const POST = async (req) => {
    const db = await connectDB();
    const categoriesCollection = db.collection("categories");

    try {
        const categoryData = await req.json();

        // Validate required fields
        if (!categoryData.type || !categoryData.category) {
            return NextResponse.json(
                { message: "Type and category are required fields" },
                { status: 400 }
            );
        }

        // Validate type field
        if (!["collection", "accessories"].includes(categoryData.type)) {
            return NextResponse.json(
                { message: "Type must be either 'collection' or 'accessories'" },
                { status: 400 }
            );
        }

        // Check if category already exists with same type
        const existingCategory = await categoriesCollection.findOne({
            type: categoryData.type,
            category: categoryData.category,
            subcategory: categoryData.subcategory || null,
        });

        if (existingCategory) {
            return NextResponse.json(
                { message: "This category already exists" },
                { status: 409 }
            );
        }

        // Add createdAt timestamp
        categoryData.createdAt = new Date().toISOString();
        categoryData.subcategory = categoryData.subcategory || null;

        // Insert the category data
        const result = await categoriesCollection.insertOne(categoryData);

        const insertedCategory = {
            ...categoryData,
            _id: result.insertedId,
        };

        return NextResponse.json(
            { message: "Category created successfully", category: insertedCategory },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json(
            { message: "Failed to create category" },
            { status: 500 }
        );
    }
};

export const GET = async (req) => {
    const db = await connectDB();
    const categoriesCollection = db.collection("categories");

    try {
        const { searchParams } = new URL(req.url);
        const type = searchParams.get("type"); // Filter by type
        const category = searchParams.get("category"); // Filter by category

        const query = {};
        if (type) query.type = type;
        if (category) query.category = category;

        const categories = await categoriesCollection.find(query).toArray();

        return NextResponse.json(
            { categories, total: categories.length },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json(
            { message: "Failed to fetch categories" },
            { status: 500 }
        );
    }
};
