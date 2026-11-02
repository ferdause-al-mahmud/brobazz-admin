import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - Fetch all payments with filters
export const GET = async (req) => {
    try {
        const db = await connectDB();
        const paymentsCollection = db.collection('payments');

        const { searchParams } = new URL(req.url);
        const fetchAll = searchParams.get("all") === "true";

        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const type = searchParams.get('type'); // "salary" or "expense"
        const category = searchParams.get('category');
        const startDate = searchParams.get("startDate");
        const endDate = searchParams.get("endDate");
        const employeeId = searchParams.get("employeeId");

        const skip = (page - 1) * limit;

        // Build query object
        let query = {};

        if (type) {
            query.type = type;
        }

        if (category) {
            query.category = category;
        }

        if (employeeId) {
            query.employeeId = new ObjectId(employeeId);
        }

        // Add date range filter
        if (startDate || endDate) {
            query.paymentDate = {};
            if (startDate) {
                const startDateTime = new Date(startDate);
                startDateTime.setHours(0, 0, 0, 0);
                query.paymentDate.$gte = startDateTime;
            }
            if (endDate) {
                const endDateTime = new Date(endDate);
                endDateTime.setHours(23, 59, 59, 999);
                query.paymentDate.$lte = endDateTime;
            }
        }

        // Fetch payments with pagination
        const paymentsCursor = paymentsCollection
            .find(query)
            .sort({ paymentDate: -1, createdAt: -1 });

        const payments = fetchAll
            ? await paymentsCursor.toArray() // fetch ALL without pagination
            : await paymentsCursor.skip(skip).limit(limit).toArray();


        // Get total count for pagination
        const totalPayments = await paymentsCollection.countDocuments(query);
        const totalPages = Math.ceil(totalPayments / limit);

        // Calculate summary statistics
        const totalAmount = await paymentsCollection
            .aggregate([
                { $match: query },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
            .toArray();

        const salaryTotal = await paymentsCollection
            .aggregate([
                { $match: { ...query, type: "salary" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
            .toArray();

        const expenseTotal = await paymentsCollection
            .aggregate([
                { $match: { ...query, type: "expense" } },
                { $group: { _id: null, total: { $sum: "$amount" } } }
            ])
            .toArray();

        return NextResponse.json({
            success: true,
            payments,
            pagination: {
                totalPayments,
                totalPages,
                currentPage: page,
                limit
            },
            summary: {
                totalAmount: totalAmount[0]?.total || 0,
                salaryTotal: salaryTotal[0]?.total || 0,
                expenseTotal: expenseTotal[0]?.total || 0
            }
        });

    } catch (error) {
        console.error("Error fetching payments:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch payments", details: error.message },
            { status: 500 }
        );
    }
};

// POST - Create new payment
export const POST = async (req) => {
    try {
        const db = await connectDB();
        const paymentsCollection = db.collection('payments');

        const body = await req.json();
        const {
            type,
            employeeId,
            employeeName,
            category,
            amount,
            description,
            paymentDate,
            paymentMethod,
            status = "paid"
        } = body;

        // Validation
        if (!type || !category || !amount || !paymentDate) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        if (type === "salary" && (!employeeId || !employeeName)) {
            return NextResponse.json(
                { success: false, error: "Employee ID and name are required for salary payments" },
                { status: 400 }
            );
        }

        const newPayment = {
            type,
            category,
            amount: parseFloat(amount),
            description: description || "",
            paymentDate: new Date(paymentDate),
            paymentMethod: paymentMethod || "cash",
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add employee info for salary payments
        if (type === "salary") {
            newPayment.employeeId = new ObjectId(employeeId);
            newPayment.employeeName = employeeName;
        }

        const result = await paymentsCollection.insertOne(newPayment);

        return NextResponse.json({
            success: true,
            message: "Payment created successfully",
            paymentId: result.insertedId
        });

    } catch (error) {
        console.error("Error creating payment:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create payment", details: error.message },
            { status: 500 }
        );
    }
};