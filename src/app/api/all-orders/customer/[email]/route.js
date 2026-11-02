// /api/orders/customer/[email]/route.js
import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(req, { params }) {
    const { email } = await params;
    const db = await connectDB();
    const ordersCollection = db.collection('orders');

    try {
        const orders = await ordersCollection.find({ "formData.email": email }).toArray();
        return NextResponse.json({ success: true, orders });
    } catch (error) {
        console.error("Error fetching orders for email:", email, error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch orders", details: error.message },
            { status: 500 }
        );
    }
}
