// app/api/admin/employees/export/route.js
export const dynamic = "force-dynamic"; // 👈 add this at the top

import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

// GET - Export all employees data for CSV
export const GET = async (req) => {
    try {
        const db = await connectDB();
        const employeesCollection = db.collection('employees');

        const { searchParams } = new URL(req.url);
        const status = searchParams.get('status') || 'all';
        const format = searchParams.get('format') || 'csv';

        // Build query
        let query = {};
        if (status !== 'all') {
            query.status = status;
        }

        // Fetch all employees for export (no pagination)
        const employees = await employeesCollection
            .find(query)
            .sort({ name: 1 }) // Sort by name for export
            .toArray();

        // Transform data for export
        const exportData = employees.map(emp => ({
            _id: emp._id,
            name: emp.name,
            position: emp.position,
            salary: emp.salary,
            phone: emp.phone || "",
            email: emp.email || "",
            joinDate: emp.joinDate,
            status: emp.status,
            createdAt: emp.createdAt,
            updatedAt: emp.updatedAt || emp.createdAt
        }));

        return NextResponse.json({
            success: true,
            employees: exportData,
            total: exportData.length,
            exportedAt: new Date().toISOString(),
            format: format
        });

    } catch (error) {
        console.error("Error exporting employees:", error);
        return NextResponse.json(
            { success: false, error: "Failed to export employees", details: error.message },
            { status: 500 }
        );
    }
};