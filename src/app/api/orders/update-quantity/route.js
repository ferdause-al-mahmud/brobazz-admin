import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export async function POST(req) {
    const db = await connectDB();
    const productsCollection = db.collection("products");

    try {
        const { updates } = await req.json();

        if (!updates || !Array.isArray(updates)) {
            return NextResponse.json(
                { success: false, error: "Invalid updates data" },
                { status: 400 }
            );
        }

        const results = [];

        for (const update of updates) {
            try {
                const { productId, size, quantity } = update;

                if (!productId || !size || quantity === undefined) {
                    results.push({
                        productId,
                        success: false,
                        message: "Missing required fields"
                    });
                    continue;
                }

                const product = await productsCollection.findOne({ id: productId });
                if (!product) {
                    results.push({
                        productId,
                        success: false,
                        message: `Product with ID ${productId} not found`
                    });
                    continue;
                }

                const sizeIndex = product.availableSizes.findIndex((s) => s.size === size);
                if (sizeIndex === -1) {
                    results.push({
                        productId,
                        success: false,
                        message: `Size ${size} not found for product ${productId}`
                    });
                    continue;
                }

                // Parse availability and quantity as integers before performing arithmetic
                const currentAvailability = parseInt(product.availableSizes[sizeIndex].availability, 10) || 0;
                const newAvailability = currentAvailability + parseInt(quantity, 10);

                // Optional: Prevent negative inventory
                if (newAvailability < 0) {
                    results.push({
                        productId,
                        success: false,
                        message: `Insufficient inventory for ${productId} size ${size}`
                    });
                    continue;
                }

                await productsCollection.updateOne(
                    { id: productId, "availableSizes.size": size },
                    { $set: { "availableSizes.$.availability": newAvailability.toString() } }
                );

                results.push({
                    productId,
                    size,
                    success: true,
                    message: `Availability updated to ${newAvailability}`
                });
            } catch (error) {
                results.push({
                    productId: update.productId,
                    success: false,
                    message: error.message
                });
            }
        }

        return NextResponse.json({
            success: true,
            message: "Product quantities processing complete",
            results
        });
    } catch (error) {
        console.error("Error updating product quantities:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update product quantities", details: error.message },
            { status: 500 }
        );
    }
}