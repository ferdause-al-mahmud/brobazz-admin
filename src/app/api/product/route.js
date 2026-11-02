import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const POST = async (req) => {
    const db = await connectDB();
    const productsCollection = db.collection("products");

    try {
        const productData = await req.json();

        // Validate that product ID is provided
        if (!productData.id || productData.id.trim() === "") {
            return NextResponse.json(
                { message: "Please provide a unique product ID" },
                { status: 400 }
            );
        }

        // Check if product with this ID already exists
        const existingProduct = await productsCollection.findOne({ id: productData.id });

        if (existingProduct) {
            return NextResponse.json(
                { message: `A product with ID "${productData.id}" already exists. Please use a different ID.` },
                { status: 409 } // 409 Conflict status code
            );
        }

        // Add createdAt timestamp
        productData.createdAt = new Date().toISOString();

        // Insert the product data into the MongoDB collection
        const result = await productsCollection.insertOne(productData);

        // Construct the inserted product object
        const insertedProduct = {
            ...productData,
            _id: result.insertedId
        };

        // Return a successful response
        return NextResponse.json(
            { message: "Product added successfully", product: insertedProduct },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding product:", error);
        // Log error details for debugging
        return NextResponse.json(
            { message: "Failed to add product" },
            { status: 500 }
        );
    }
};
