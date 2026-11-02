import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// PUT - Update payment
export const PUT = async (req, { params }) => {
    try {
        const db = await connectDB();
        const paymentsCollection = db.collection('payments');

        const { id } = await params;
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
            status
        } = body;

        // Validation
        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid payment ID" },
                { status: 400 }
            );
        }

        if (!type || !category || !amount || !paymentDate) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const updateData = {
            type,
            category,
            amount: parseFloat(amount),
            description: description || "",
            paymentDate: new Date(paymentDate),
            paymentMethod: paymentMethod || "cash",
            status: status || "paid",
            updatedAt: new Date()
        };

        // Add employee info for salary payments
        if (type === "salary") {
            if (!employeeId || !employeeName) {
                return NextResponse.json(
                    { success: false, error: "Employee ID and name are required for salary payments" },
                    { status: 400 }
                );
            }
            updateData.employeeId = new ObjectId(employeeId);
            updateData.employeeName = employeeName;
        } else {
            // Remove employee fields for expense payments
            updateData.$unset = {
                employeeId: "",
                employeeName: ""
            };
        }

        const result = await paymentsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: "Payment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Payment updated successfully"
        });

    } catch (error) {
        console.error("Error updating payment:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update payment", details: error.message },
            { status: 500 }
        );
    }
};

// DELETE - Delete payment
export const DELETE = async (req, { params }) => {
    try {
        const db = await connectDB();
        const paymentsCollection = db.collection('payments');

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid payment ID" },
                { status: 400 }
            );
        }

        const result = await paymentsCollection.deleteOne({
            _id: new ObjectId(id)
        });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, error: "Payment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Payment deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting payment:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete payment", details: error.message },
            { status: 500 }
        );
    }
};

// GET - Get single payment
export const GET = async (req, { params }) => {
    try {
        const db = await connectDB();
        const paymentsCollection = db.collection('payments');

        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json(
                { success: false, error: "Invalid payment ID" },
                { status: 400 }
            );
        }

        const payment = await paymentsCollection.findOne({
            _id: new ObjectId(id)
        });

        if (!payment) {
            return NextResponse.json(
                { success: false, error: "Payment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            payment
        });

    } catch (error) {
        console.error("Error fetching payment:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch payment", details: error.message },
            { status: 500 }
        );
    }
};