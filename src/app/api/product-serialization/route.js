import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

const VALID_SCOPES = new Set(["category", "subcategory", "type"]);

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getProductQuery = (scope, value) => {
    const exact = { $regex: `^${escapeRegex(value)}$`, $options: "i" };

    if (scope === "category") return { category: exact };
    if (scope === "subcategory") return { subcategory: exact };
    if (value === "new-arrivals") return { type: { $regex: "^featured$", $options: "i" } };
    return { type: { $regex: "^sale$", $options: "i" } };
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const scope = searchParams.get("scope") || "category";
        const value = searchParams.get("value") || "";
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = 20;

        if (!VALID_SCOPES.has(scope) || !value) {
            return NextResponse.json({ message: "A valid scope and value are required" }, { status: 400 });
        }
        if (scope === "type" && !["new-arrivals", "sale"].includes(value)) {
            return NextResponse.json({ message: "Unsupported product type" }, { status: 400 });
        }

        const db = await connectDB();
        const products = await db.collection("products")
            .find(getProductQuery(scope, value))
            .sort({ createdAt: -1 })
            .toArray();
        const serializations = db.collection("productSerializations");
        const productIds = products.map((product) => product.id);
        const saved = await serializations.find({
            scope,
            value: { $regex: `^${escapeRegex(value)}$`, $options: "i" },
            productId: { $in: productIds },
        }).toArray();
        const serialByProduct = new Map(saved.map((item) => [item.productId, item.serial]));

        const sortedProducts = products
                .map((product) => ({ ...product, serial: serialByProduct.get(product.id) ?? null }))
                .sort((a, b) => {
                    const aSerial = Number.isFinite(a.serial) ? a.serial : Number.MAX_SAFE_INTEGER;
                    const bSerial = Number.isFinite(b.serial) ? b.serial : Number.MAX_SAFE_INTEGER;
                    return aSerial - bSerial || new Date(b.createdAt) - new Date(a.createdAt);
                });
        const totalProducts = sortedProducts.length;
        const totalPages = Math.max(1, Math.ceil(totalProducts / limit));
        const currentPage = Math.min(page, totalPages);

        return NextResponse.json({
            products: sortedProducts.slice((currentPage - 1) * limit, currentPage * limit),
            totalProducts,
            totalPages,
            currentPage,
            limit,
        });
    } catch (error) {
        console.error("Error fetching product serializations:", error);
        return NextResponse.json({ message: "Failed to fetch product serializations" }, { status: 500 });
    }
}

export async function PUT(request) {
    try {
        const body = await request.json();
        const { scope, value, updates } = body;
        if (!VALID_SCOPES.has(scope) || !value || !Array.isArray(updates)) {
            return NextResponse.json({ message: "Scope, value, and updates are required" }, { status: 400 });
        }
        if (scope === "type" && !["new-arrivals", "sale"].includes(value)) {
            return NextResponse.json({ message: "Unsupported product type" }, { status: 400 });
        }

        const db = await connectDB();
        const products = await db.collection("products").find({
            id: { $in: updates.map((item) => item.productId) },
            ...getProductQuery(scope, value),
        }).project({ id: 1 }).toArray();
        const validIds = new Set(products.map((product) => product.id));
        const operations = [];

        for (const item of updates) {
            if (!validIds.has(item.productId)) continue;
            const serial = item.serial === "" || item.serial === null ? null : Number(item.serial);
            if (serial !== null && (!Number.isInteger(serial) || serial < 0)) {
                return NextResponse.json({ message: "Serial must be a non-negative integer" }, { status: 400 });
            }

            const filter = { productId: item.productId, scope, value };
            operations.push(serial === null
                ? { deleteOne: { filter } }
                : { updateOne: { filter, update: { $set: { ...filter, serial, updatedAt: new Date() } }, upsert: true } });
        }

        if (operations.length) await db.collection("productSerializations").bulkWrite(operations);
        return NextResponse.json({ message: "Serializations saved successfully" });
    } catch (error) {
        console.error("Error saving product serializations:", error);
        return NextResponse.json({ message: "Failed to save product serializations" }, { status: 500 });
    }
}
