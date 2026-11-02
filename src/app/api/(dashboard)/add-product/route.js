import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from 'next/server';

export const POST = async (req) => {
    const db = await connectDB();
    const productsCollection = db.collection('products');

    try {
        const productData = await req.json(); // Parse the JSON data from the request body

        // Add createdAt timestamp
        productData.createdAt = new Date().toISOString();

        // Insert the product data into the MongoDB collection
        const result = await productsCollection.insertOne(productData);

        // Construct the inserted product object
        const insertedProduct = {
            ...productData,
            _id: result.insertedId // Include the generated ID
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
            { error: "Failed to add product", details: error.message },
            { status: 500 }
        );
    }
};
