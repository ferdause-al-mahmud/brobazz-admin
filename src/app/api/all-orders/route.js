import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const GET = async (req) => {
    const db = await connectDB();
    const ordersCollection = db.collection("orders");

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page")) || 1;
    const limit = parseInt(searchParams.get("limit")) || 10;
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const skip = (page - 1) * limit;

    try {
        // Build date range query
        let dateQuery = {};
        if (startDate || endDate) {
            dateQuery.createdAt = {};
            if (startDate) {
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);
                dateQuery.createdAt.$gte = startDateTime;
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                dateQuery.createdAt.$lte = endDateTime;
            }
        }

        // Build pagination query
        let paginationQuery = { ...dateQuery };
        if (type === "manual") {
            paginationQuery.type = type;
        } else if (type === "web") {
            paginationQuery.type = { $exists: false };
        }

        // Aggregate all statistics in parallel
        const [
            allOrdersCount,
            manualOrdersCount,
            webOrdersCount,

            deliveredOrdersCount,
            pendingOrdersCount,
            holdOrdersCount,
            shippedOrdersCount,
            returnedOrdersCount,
            exchangeOrdersCount,
            confirmedOrdersCount,
            trashedOrdersCount,


            manualDeliveredCount,
            manualPendingCount,
            manualHoldCount,
            manualShippedCount,
            manualReturnedCount,
            manualExchangeCount,
            manualConfirmedCount,
            manualTrashedCount,

            webDeliveredCount,
            webPendingCount,
            webHoldCount,
            webShippedCount,
            webReturnedCount,
            webExchangeCount,
            webConfirmedCount,
            webTrashedCount,


            deliveredSalesAgg,
            dateWiseDeliveredSalesAgg,
            monthlyRevenueAgg,

            paginatedOrders,
            totalPaginatedCount,
            couponUsageAgg
        ] = await Promise.all([
            // Total counts (no date filter)
            ordersCollection.countDocuments({}),
            ordersCollection.countDocuments({ type: "manual" }),
            ordersCollection.countDocuments({ type: { $exists: false } }),

            // Status counts in date range
            ordersCollection.countDocuments({ ...dateQuery, status: "delivered" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "pending" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "hold" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "shipped" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "returned" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "exchange" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "confirmed" }),
            ordersCollection.countDocuments({ ...dateQuery, status: "trashed" }),

            // Manual orders by status in date range
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "delivered" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "pending" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "hold" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "shipped" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "returned" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "exchange" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "confirmed" }),
            ordersCollection.countDocuments({ ...dateQuery, type: "manual", status: "trashed" }),

            // Web orders by status in date range
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "delivered" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "pending" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "hold" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "shipped" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "returned" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "exchange" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "confirmed" }),
            ordersCollection.countDocuments({ ...dateQuery, type: { $exists: false }, status: "trashed" }),

            // Sales aggregation (all time delivered)
            ordersCollection.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: null,
                        totalSales: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$total_revenue", null] },
                                    { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                    "$total_revenue"
                                ]
                            }
                        },
                        manualSales: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$type", "manual"] },
                                    {
                                        $cond: [
                                            { $eq: ["$total_revenue", null] },
                                            { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                            "$total_revenue"
                                        ]
                                    },
                                    0,
                                ],
                            },
                        },
                        webSales: {
                            $sum: {
                                $cond: [
                                    { $eq: [{ $type: "$type" }, "missing"] },
                                    {
                                        $cond: [
                                            { $eq: ["$total_revenue", null] },
                                            { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                            "$total_revenue"
                                        ]
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]).toArray(),

            // Date-wise delivered sales (within selected date range)
            ordersCollection.aggregate([
                { $match: { ...dateQuery, status: "delivered" } },
                {
                    $group: {
                        _id: null,
                        totalSales: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$total_revenue", null] },
                                    { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                    "$total_revenue"
                                ]
                            }
                        },
                        manualSales: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$type", "manual"] },
                                    {
                                        $cond: [
                                            { $eq: ["$total_revenue", null] },
                                            { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                            "$total_revenue"
                                        ]
                                    },
                                    0,
                                ],
                            },
                        },
                        webSales: {
                            $sum: {
                                $cond: [
                                    { $eq: [{ $type: "$type" }, "missing"] },
                                    {
                                        $cond: [
                                            { $eq: ["$total_revenue", null] },
                                            { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                            "$total_revenue"
                                        ]
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
            ]).toArray(),

            // Monthly revenue aggregation (total, manual, web)
            ordersCollection.aggregate([
                { $match: { status: "delivered" } },
                {
                    $group: {
                        _id: {
                            year: { $year: "$createdAt" },
                            month: { $month: "$createdAt" },
                        },
                        revenue: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$total_revenue", null] },
                                    { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                    "$total_revenue"
                                ]
                            }
                        },
                        manualSales: {
                            $sum: {
                                $cond: [
                                    { $eq: ["$type", "manual"] },
                                    {
                                        $cond: [
                                            { $eq: ["$total_revenue", null] },
                                            { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                            "$total_revenue"
                                        ]
                                    },
                                    0,
                                ],
                            },
                        },
                        webSales: {
                            $sum: {
                                $cond: [
                                    { $eq: [{ $type: "$type" }, "missing"] },
                                    {
                                        $cond: [
                                            { $eq: ["$total_revenue", null] },
                                            { $add: [{ $subtract: ["$total", { $ifNull: ["$shippingCost", 0] }] }, { $ifNull: ["$advance", 0] }] },
                                            "$total_revenue"
                                        ]
                                    },
                                    0,
                                ],
                            },
                        },
                        month: { $first: "$createdAt" },
                    },
                },
                { $sort: { "_id.year": -1, "_id.month": -1 } },
            ]).toArray(),

            // Paginated orders
            ordersCollection.find(paginationQuery)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .toArray(),

            // Total count for pagination
            ordersCollection.countDocuments(paginationQuery),

            // Coupon usage aggregation
            ordersCollection.aggregate([
                {
                    $match: {
                        couponCode: { $exists: true, $ne: "" },
                        couponDiscount: { $gt: 0 }   // ⬅️ Only include positive discount values
                    }
                },
                {
                    $group: {
                        _id: "$couponCode",
                        usedTimes: { $sum: 1 },
                        totalDiscountGiven: { $sum: "$couponDiscount" }
                    }
                },
                { $sort: { usedTimes: -1 } }
            ]).toArray(),


        ]);

        // Extract sales data
        const salesData = deliveredSalesAgg[0] || { totalSales: 0, manualSales: 0, webSales: 0 };
        const dateWiseSalesData = dateWiseDeliveredSalesAgg[0] || { totalSales: 0, manualSales: 0, webSales: 0 };

        // Format month-year labels
        const formatMonthYear = (date) => {
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const d = new Date(date);
            return `${monthNames[d.getMonth()]} ${d.getFullYear()}`;
        };

        // Format monthly revenue breakdown
        const revenueByMonth = monthlyRevenueAgg.reduce((acc, item) => {
            const monthYear = formatMonthYear(item.month);
            acc[monthYear] = {
                month: monthYear,
                revenue: item.revenue,
                manualSales: item.manualSales,
                webSales: item.webSales,
            };
            return acc;
        }, {});

        const totalPages = Math.ceil(totalPaginatedCount / limit);

        const couponUsage = couponUsageAgg.map(item => ({
            couponCode: item._id,
            usedTimes: item.usedTimes,
            totalDiscountGiven: item.totalDiscountGiven
        }));

        return NextResponse.json({
            // Paginated orders
            orders: paginatedOrders,

            // Overall counts
            totalOrders: allOrdersCount,
            manualOrdersCount,
            webOrdersCount,

            // All-time sales totals
            totalDeliveredSales: salesData.totalSales,
            totalWebSales: salesData.webSales,
            totalManualSales: salesData.manualSales,

            // Date-wise sales totals (NEW)
            dateWiseTotalRevenue: dateWiseSalesData.totalSales,
            dateWiseManualRevenue: dateWiseSalesData.manualSales,
            dateWiseWebRevenue: dateWiseSalesData.webSales,

            // Delivered orders counts
            deliveredOrdersCount,
            deliveredManualOrdersCount: manualDeliveredCount,
            deliveredWebOrdersCount: webDeliveredCount,

            // Status counts
            pendingOrdersCount,
            manualPendingOrdersCount: manualPendingCount,
            webPendingOrdersCount: webPendingCount,

            holdOrdersCount,
            manualHoldOrdersCount: manualHoldCount,
            webHoldOrdersCount: webHoldCount,

            shippedOrdersCount,
            manualShippedOrdersCount: manualShippedCount,
            webShippedOrdersCount: webShippedCount,

            returnedOrdersCount,
            manualReturnedOrdersCount: manualReturnedCount,
            webReturnedOrdersCount: webReturnedCount,

            exchangeOrdersCount,
            manualExchangeOrdersCount: manualExchangeCount,
            webExchangeOrdersCount: webExchangeCount,

            confirmedOrdersCount,
            manualConfirmedOrdersCount: manualConfirmedCount,
            webConfirmedOrdersCount: webConfirmedCount,

            trashedOrdersCount,
            manualTrashedOrdersCount: manualTrashedCount,
            webTrashedOrdersCount: webTrashedCount,

            // Monthly revenue data (with manual + web breakdown)
            revenueByMonth,

            couponUsage,

            // Pagination
            totalPages,
            currentPage: page,
        });
    } catch (error) {
        console.error("Error fetching orders:", error);
        return NextResponse.json(
            { error: "Failed to fetch orders", details: error.message },
            { status: 500 }
        );
    }
};