import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

// Simple in-memory cache
let cache = {
    data: null,
    timestamp: null,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in ms

export const GET = async (req) => {
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = parseInt(searchParams.get("limit")) || 10;
        const search = searchParams.get("search") || "";

        // ✅ Check cache (skip if search used)
        if (!search && cache.data && Date.now() - cache.timestamp < CACHE_DURATION) {
            const { productsWithStats, stats } = cache.data;

            // Apply pagination on cached data
            const totalPages = Math.ceil(productsWithStats.length / limit);
            const startIndex = (page - 1) * limit;
            const paginatedProducts = productsWithStats.slice(startIndex, startIndex + limit);

            return NextResponse.json({
                success: true,
                products: paginatedProducts,
                stats,
                pagination: {
                    currentPage: page,
                    totalPages,
                    totalItems: productsWithStats.length,
                    itemsPerPage: limit,
                    hasNext: page < totalPages,
                    hasPrev: page > 1,
                },
                cached: true, // 👀 helpful for debugging
            });
        }

        // 🔌 DB fetch if no valid cache
        const db = await connectDB();
        const productsCollection = db.collection("products");

        // 🔍 Build search query
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: "i" } },
                { category: { $regex: search, $options: "i" } },
                { id: { $regex: search, $options: "i" } },
            ];
        }

        // Fetch all matching products
        const allProducts = await productsCollection
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();
        // 🧮 Add stock, sold, revenue, profit calculations
        const productsWithStats = allProducts.map((product) => {
            // Calculate total stock from availableSizes
            let totalStock = 0;
            if (product.availableSizes && Array.isArray(product.availableSizes)) {
                totalStock = product.availableSizes.reduce((sum, size) => {
                    return sum + Number(size.availability || 0);
                }, 0);
            }

            // Calculate price per unit (use offerPrice if available, otherwise use price)
            const sellingPrice = Number(product.offerPrice || product.price || 0);
            const costPrice = Number(product.buying_price || 0);
            const profitPerUnit = sellingPrice - costPrice;

            // Calculate sold quantity and revenue
            const soldQuantity = Number(product.selling_amount || 0);
            const totalRevenue = soldQuantity * sellingPrice;
            const totalCost = soldQuantity * costPrice;
            const grossProfit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

            return {
                ...product,
                totalStock,
                soldQuantity,
                totalRevenue,
                totalCost,
                grossProfit,
                profitMargin,
                profitPerUnit,
            };
        });

        // ✅ Global Stats BEFORE pagination
        const totalStockAll = productsWithStats.reduce((sum, p) => sum + p.totalStock, 0);
        const totalSoldQuantity = productsWithStats.reduce((sum, p) => sum + p.soldQuantity, 0);
        const totalRevenue = productsWithStats.reduce((sum, p) => sum + p.totalRevenue, 0);
        const totalCost = productsWithStats.reduce((sum, p) => sum + p.totalCost, 0);
        const totalGrossProfit = totalRevenue - totalCost;

        const stats = {
            totalProducts: allProducts.length,
            totalStock: totalStockAll,
            totalSoldQuantity,
            totalRevenue,
            totalCost,
            totalGrossProfit,
            averageProfitMargin: totalRevenue > 0 ? (totalGrossProfit / totalRevenue) * 100 : 0,
        };

        // 📄 Pagination AFTER stats
        const totalPages = Math.ceil(allProducts.length / limit);
        const startIndex = (page - 1) * limit;
        const paginatedProducts = productsWithStats.slice(startIndex, startIndex + limit);

        // ✅ Update cache only when search is not used
        if (!search) {
            cache = {
                data: { productsWithStats, stats },
                timestamp: Date.now(),
            };
        }

        return NextResponse.json({
            success: true,
            products: paginatedProducts,
            stats,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: allProducts.length,
                itemsPerPage: limit,
                hasNext: page < totalPages,
                hasPrev: page > 1,
            },
            cached: false,
        });
    } catch (error) {
        console.error("Error fetching products:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch products", details: error.message },
            { status: 500 }
        );
    }
};
