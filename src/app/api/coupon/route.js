import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET Route: Fetch all coupons
export const GET = async (request) => {
    try {
        const db = await connectDB();
        const couponCollection = db.collection("coupons");

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search");

        let query = {};
        if (search) {
            query = {
                $or: [
                    { name: { $regex: new RegExp(search, "i") } },
                    { couponName: { $regex: new RegExp(search, "i") } },
                ],
            };
        }

        const coupons = await couponCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        return NextResponse.json({
            success: true,
            data: coupons,
        });
    } catch (error) {
        console.error("Error fetching coupons:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// POST Route: Add a new coupon
export const POST = async (request) => {
    try {
        const db = await connectDB();
        const couponCollection = db.collection("coupons");

        const body = await request.json();
        const { couponName, couponType, minAmount, limit, validity, offerAmount } = body;

        // Validate required fields
        if (!couponName || !couponType || minAmount === undefined || validity === undefined || offerAmount === undefined || !limit) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Missing required fields: couponName, couponType, minAmount, limit, validity, offerAmount",
                },
                { status: 400 }
            );
        }

        // Validate coupon type
        if (!["PERCENTAGE", "FLAT"].includes(couponType)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid couponType. Must be PERCENTAGE or FLAT",
                },
                { status: 400 }
            );
        }

        // Check if coupon name already exists
        const existingCoupon = await couponCollection.findOne({ couponName });
        if (existingCoupon) {
            return NextResponse.json(
                { success: false, message: "Coupon name already exists" },
                { status: 400 }
            );
        }

        // Insert new coupon
        const result = await couponCollection.insertOne({
            couponName,
            couponType,
            minAmount: parseFloat(minAmount),
            offerAmount: parseFloat(offerAmount),
            limit: parseInt(limit, 10),
            validity,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        return NextResponse.json({
            success: true,
            message: "Coupon added successfully",
            data: { _id: result.insertedId },
        });
    } catch (error) {
        console.error("Error adding coupon:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// PUT Route: Update coupon
export const PUT = async (request) => {
    try {
        const db = await connectDB();
        const couponCollection = db.collection("coupons");

        const body = await request.json();
        const { _id, couponName, couponType, minAmount, limit, validity, offerAmount } = body;

        // Validate _id
        if (!_id) {
            return NextResponse.json(
                { success: false, message: "Missing _id parameter" },
                { status: 400 }
            );
        }

        // Validate required fields
        if (!couponName || !couponType || minAmount === undefined || validity === undefined || offerAmount === undefined || !limit) {
            return NextResponse.json(
                {
                    success: false,
                    message:
                        "Missing required fields: couponName, couponType, minAmount, limit, validity, offerAmount",
                },
                { status: 400 }
            );
        }

        // Validate coupon type
        if (!["PERCENTAGE", "FLAT"].includes(couponType)) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid couponType. Must be PERCENTAGE or FLAT",
                },
                { status: 400 }
            );
        }

        // Check if another coupon with same name exists
        const existingCoupon = await couponCollection.findOne({
            couponName,
            _id: { $ne: new ObjectId(_id) },
        });
        if (existingCoupon) {
            return NextResponse.json(
                { success: false, message: "Coupon name already exists" },
                { status: 400 }
            );
        }

        // Update the coupon
        const result = await couponCollection.updateOne(
            { _id: new ObjectId(_id) },
            {
                $set: {
                    couponName,
                    couponType,
                    minAmount: parseFloat(minAmount),
                    offerAmount: parseFloat(offerAmount),
                    limit: parseInt(limit, 10),
                    validity,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, message: "Coupon not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Coupon updated successfully",
        });
    } catch (error) {
        console.error("Error updating coupon:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};

// DELETE Route: Delete coupon
export const DELETE = async (request) => {
    try {
        const db = await connectDB();
        const couponCollection = db.collection("coupons");

        const body = await request.json();
        const { _id } = body;

        // Validate _id
        if (!_id) {
            return NextResponse.json(
                { success: false, message: "Missing _id parameter" },
                { status: 400 }
            );
        }

        // Delete the coupon
        const result = await couponCollection.deleteOne({ _id: new ObjectId(_id) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, message: "Coupon not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Coupon deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting coupon:", error);
        return NextResponse.json(
            { success: false, message: "Internal Server Error" },
            { status: 500 }
        );
    }
};
