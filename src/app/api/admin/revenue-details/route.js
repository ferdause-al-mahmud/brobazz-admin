import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const GET = async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 10;
        const search = searchParams.get("search") || "";
        const startDate = searchParams.get("startDate") || "";
        const endDate = searchParams.get("endDate") || "";

        const db = await connectDB();
        const ordersCollection = db.collection("orders");
        const productsCollection = db.collection("products");

        // Build date filter for delivered orders
        let dateFilter = {};
        if (startDate || endDate) {
            dateFilter.createdAt = {};
            if (startDate) {
                dateFilter.createdAt.$gte = new Date(startDate);
            }
            if (endDate) {
                // Add 1 day to include the entire end date
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1);
                dateFilter.createdAt.$lt = endDateObj;
            }
        }

        // Query: only delivered orders within date range
        const deliveredOrders = await ordersCollection
            .find({
                status: "delivered",
                ...dateFilter,
            })
            .sort({ createdAt: -1 })
            .toArray();

        // Extract all unique products from cart items with their quantities
        const productMap = new Map(); // productId -> { name, price, quantities, revenues, costs, orders: [] }

        for (const order of deliveredOrders) {
            if (order.cart && Array.isArray(order.cart)) {
                // Calculate actual order revenue: (total - shippingCost) + advance
                const orderRevenue =
                    (parseFloat(order.total) || 0) -
                    (parseFloat(order.shippingCost) || 0) +
                    (parseFloat(order.advance) || 0);

                // Calculate total item value from cart
                let totalItemValue = 0;
                const cartItems = order.cart.map((item) => {
                    const qty = parseInt(item.quantity, 10) || 0;
                    const price = parseFloat(item.price) || 0;
                    const itemValue = qty * price;
                    totalItemValue += itemValue;
                    return { ...item, qty, price, itemValue };
                });

                // Distribute order revenue across products proportionally
                for (const item of cartItems) {
                    const productId = item.id;
                    const quantity = item.qty;
                    // Proportionally distribute order revenue to this product
                    const distributedRevenue = totalItemValue > 0
                        ? (item.itemValue / totalItemValue) * orderRevenue
                        : 0;

                    if (!productMap.has(productId)) {
                        productMap.set(productId, {
                            id: productId,
                            name: item.name || "Unknown",
                            totalQuantity: 0,
                            totalRevenue: 0,
                            totalCost: 0,
                            grossProfit: 0,
                            profitMargin: 0,
                            sellingPrice: item.price,
                            buyingPrice: 0,
                            orderCount: 0,
                        });
                    }

                    const product = productMap.get(productId);
                    product.totalQuantity += quantity;
                    product.totalRevenue += distributedRevenue;
                    product.orderCount += 1;
                }
            }
        }

        // Fetch buying prices from products collection
        const productIds = Array.from(productMap.keys());
        if (productIds.length > 0) {
            const productsData = await productsCollection
                .find({ id: { $in: productIds } })
                .toArray();

            const productsDataMap = new Map();
            productsData.forEach((p) => {
                productsDataMap.set(p.id, p);
            });

            // Update buying prices and calculate profit
            for (const [productId, product] of productMap.entries()) {
                const dbProduct = productsDataMap.get(productId);
                const buyingPrice = parseFloat(dbProduct?.buying_price || 0);
                product.buyingPrice = buyingPrice;

                const totalCost = product.totalQuantity * buyingPrice;
                product.totalCost = totalCost;
                product.grossProfit = product.totalRevenue - totalCost;
                product.profitMargin =
                    product.totalRevenue > 0
                        ? (product.grossProfit / product.totalRevenue) * 100
                        : 0;
            }
        }

        // Convert map to array and apply search filter
        let productsWithStats = Array.from(productMap.values());

        if (search) {
            productsWithStats = productsWithStats.filter(
                (p) =>
                    p.name.toLowerCase().includes(search.toLowerCase()) ||
                    p.id.toLowerCase().includes(search.toLowerCase())
            );
        }

        // Calculate global stats
        const globalStats = {
            totalProducts: productsWithStats.length,
            totalQuantitySold: productsWithStats.reduce((sum, p) => sum + p.totalQuantity, 0),
            totalRevenue: productsWithStats.reduce((sum, p) => sum + p.totalRevenue, 0),
            totalCost: productsWithStats.reduce((sum, p) => sum + p.totalCost, 0),
            totalGrossProfit: productsWithStats.reduce((sum, p) => sum + p.grossProfit, 0),
            averageProfitMargin: 0,
        };

        if (globalStats.totalRevenue > 0) {
            globalStats.averageProfitMargin =
                (globalStats.totalGrossProfit / globalStats.totalRevenue) * 100;
        }

        // Pagination
        const totalPages = Math.ceil(productsWithStats.length / limit);
        const startIndex = (page - 1) * limit;
        const paginatedProducts = productsWithStats.slice(startIndex, startIndex + limit);

        return NextResponse.json({
            success: true,
            products: paginatedProducts,
            stats: globalStats,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: productsWithStats.length,
                itemsPerPage: limit,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            dateFilter: {
                startDate: startDate || null,
                endDate: endDate || null,
            },
        });
    } catch (error) {
        console.error("Error fetching revenue details:", error);
        return NextResponse.json(
            {
                success: false,
                error: "Failed to fetch revenue details",
                details: error.message,
            },
            { status: 500 }
        );
    }
};
