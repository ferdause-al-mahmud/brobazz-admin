import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

export const GET = async (request, { params }) => {
    const { id } = await params;
    const db = await connectDB();
    const categoriesCollection = db.collection("categories");

    try {
        const category = await categoriesCollection.findOne({ _id: new ObjectId(id) });

        if (!category) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(category, { status: 200 });
    } catch (error) {
        console.error("Error fetching category:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

export const PUT = async (request, { params }) => {
    const { id } = await params;
    const db = await connectDB();
    const categoriesCollection = db.collection("categories");

    try {
        const updatedData = await request.json();

        // Validate type if it's being changed
        if (updatedData.type && !["collection", "accessories"].includes(updatedData.type)) {
            return NextResponse.json(
                { message: "Type must be either 'collection' or 'accessories'" },
                { status: 400 }
            );
        }

        // Update the category
        const result = await categoriesCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updatedData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Category updated successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error updating category:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};

export const DELETE = async (request, { params }) => {
    const { id } = await params;
    const db = await connectDB();
    const categoriesCollection = db.collection("categories");

    try {
        const result = await categoriesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { error: "Category not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { message: "Category deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting category:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 }
        );
    }
};
