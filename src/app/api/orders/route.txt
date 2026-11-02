// app/api/orders/route.js

import { connectDB } from "@/app/lib/connectDB"
import { requireAuth } from "@/app/utils/requireAuth";
import { NextResponse } from "next/server"

export const GET = async (req) => {

    const { error, user } = await requireAuth(req);

    if (error) {
        return NextResponse.json({ error }, { status: 401 });
    }

    // 🔒 Role check here
    if (!["admin", "moderator"].includes(user.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    const db = await connectDB()
    const ordersCollection = db.collection("orders")

    const { searchParams } = new URL(req.url)
    const page = Number.parseInt(searchParams.get("page")) || 1
    const limit = Number.parseInt(searchParams.get("limit")) || 10
    const status = searchParams.get("status")
    const phone = searchParams.get("phone")
    const type = searchParams.get("type")
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")
    const skip = (page - 1) * limit

    try {
        // Base query: no status filter by default
        let query = {}
        console.log(phone)
        // Add status filter if not "all"
        if (status && status !== "all") {
            query.status = status
        }

        if (phone) {
            query["formData.phone"] = { $regex: phone, $options: "i" } // case-insensitive match
        }

        // Add type filter if provided
        if (type === "manual") {
            query.type = type
        } else if (type === "web") {
            query.type = { $exists: false }
        }

        // Add date range filter if provided
        if (startDate || endDate) {
            query.createdAt = {}
            if (startDate) {

                // Set start date to beginning of day
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);
                query.createdAt.$gte = startDateTime;
            }
            if (endDate) {
                // Set end date to end of day
                const endDateTime = new Date(endDate)
                endDateTime.setHours(23, 59, 59, 999)
                query.createdAt.$lte = endDateTime
            }
        }

        // Fetch paginated and filtered orders
        const orders = await ordersCollection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray()

        // Get total filtered count
        const totalFilteredOrders = await ordersCollection.countDocuments(query)
        const totalPages = Math.ceil(totalFilteredOrders / limit)

        // Get total count of all orders
        const totalOrders = await ordersCollection.countDocuments({})

        return NextResponse.json({
            orders,
            totalOrders,
            totalPages,
            currentPage: page,
        })
    } catch (error) {
        console.error("Error fetching orders:", error)
        return NextResponse.json(
            { error: "Failed to fetch orders", details: error.message },
            { status: 500 }
        )
    }
}

