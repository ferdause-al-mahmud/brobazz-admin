export const dynamic = "force-dynamic";

import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");

        // Connect to the database
        const db = await connectDB();
        const ordersCollection = db.collection("orders");

        // Create date objects for filtering
        const startDateTime = startDate ? new Date(`${startDate}T00:00:00.000Z`) : new Date(0);
        const endDateTime = endDate ? new Date(`${endDate}T23:59:59.999Z`) : new Date();

        // Query orders within the date range, with a moderatorEmail field, and not returned
        const orders = await ordersCollection
            .find({
                createdAt: {
                    $gte: startDateTime,
                    $lte: endDateTime,
                },
                moderatorEmail: { $exists: true },
                status: { $ne: "returned" }, // Exclude returned orders
            })
            .toArray();

        // Aggregate data by moderator
        const moderatorMap = new Map();
        let totalProducts = 0;

        orders.forEach((order) => {
            const moderatorEmail = order.moderatorEmail;
            const productCount = order.cart ? order.cart.length : 0;
            totalProducts += productCount;

            if (!moderatorMap.has(moderatorEmail)) {
                moderatorMap.set(moderatorEmail, {
                    email: moderatorEmail,
                    orderCount: 0,
                    productCount: 0,
                    lastActivity: null,
                });
            }

            const moderator = moderatorMap.get(moderatorEmail);
            moderator.orderCount += 1;
            moderator.productCount += productCount;

            // Update last activity if this order is more recent
            const orderDate = new Date(order.createdAt);
            if (!moderator.lastActivity || orderDate > new Date(moderator.lastActivity)) {
                moderator.lastActivity = order.createdAt;
            }
        });

        // Convert map to array and sort by product count (descending)
        const moderators = Array.from(moderatorMap.values()).sort((a, b) => b.productCount - a.productCount);

        return NextResponse.json({
            moderators,
            totalOrders: orders.length,
            totalProducts,
            dateRange: {
                start: startDateTime,
                end: endDateTime,
            },
        });
    } catch (error) {
        console.error("Error fetching moderator tracking data:", error);
        return NextResponse.json({ error: "Failed to fetch moderator data", details: error.message }, { status: 500 });
    }
}