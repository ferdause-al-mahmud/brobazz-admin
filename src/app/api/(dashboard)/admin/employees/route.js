import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

// GET - Fetch employees with pagination and search
export const GET = async (req) => {
    try {
        const db = await connectDB();
        const employeesCollection = db.collection('employees');

        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';

        // Build query
        let query = {};

        // Status filter
        if (status !== 'all') {
            query.status = status;
        }

        // Search filter - search across name, position, email, and phone
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { position: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { phone: { $regex: search, $options: 'i' } }
            ];
        }

        // Calculate pagination
        const skip = (page - 1) * limit;

        // Get total count for pagination
        const total = await employeesCollection.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        // Get employees with pagination
        const employees = await employeesCollection
            .find(query)
            .sort({ createdAt: -1 }) // Latest first
            .skip(skip)
            .limit(limit)
            .toArray();

        // Get stats
        const stats = await employeesCollection.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "active"] }, 1, 0]
                        }
                    },
                    inactive: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "inactive"] }, 1, 0]
                        }
                    }
                }
            }
        ]).toArray();

        const employeeStats = stats[0] || { total: 0, active: 0, inactive: 0 };

        return NextResponse.json({
            success: true,
            employees,
            pagination: {
                currentPage: page,
                totalPages,
                totalItems: total,
                itemsPerPage: limit,
                hasNext: page < totalPages,
                hasPrev: page > 1
            },
            total,
            totalPages,
            stats: employeeStats
        });

    } catch (error) {
        console.error("Error fetching employees:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch employees", details: error.message },
            { status: 500 }
        );
    }
};

// POST - Create new employee
export const POST = async (req) => {
    try {
        const db = await connectDB();
        const employeesCollection = db.collection('employees');

        const body = await req.json();
        const {
            name,
            position,
            salary,
            phone,
            email,
            joinDate,
            status = "active"
        } = body;

        // Validation
        if (!name || !position || !salary) {
            return NextResponse.json(
                { success: false, error: "Name, position, and salary are required" },
                { status: 400 }
            );
        }

        // Validate email format if provided
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return NextResponse.json(
                { success: false, error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if employee with same email already exists
        if (email) {
            const existingEmployee = await employeesCollection.findOne({ email: email });
            if (existingEmployee) {
                return NextResponse.json(
                    { success: false, error: "Employee with this email already exists" },
                    { status: 400 }
                );
            }
        }

        const newEmployee = {
            name: name.trim(),
            position: position.trim(),
            salary: parseFloat(salary),
            phone: phone?.trim() || "",
            email: email?.trim().toLowerCase() || "",
            joinDate: joinDate ? new Date(joinDate) : new Date(),
            status,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await employeesCollection.insertOne(newEmployee);

        return NextResponse.json({
            success: true,
            message: "Employee created successfully",
            employeeId: result.insertedId
        });

    } catch (error) {
        console.error("Error creating employee:", error);
        return NextResponse.json(
            { success: false, error: "Failed to create employee", details: error.message },
            { status: 500 }
        );
    }
};

// PUT - Update employee
export const PUT = async (req) => {
    try {
        const db = await connectDB();
        const employeesCollection = db.collection('employees');

        const body = await req.json();
        const { _id, ...updateData } = body;

        if (!_id) {
            return NextResponse.json(
                { success: false, error: "Missing employee ID" },
                { status: 400 }
            );
        }

        // Validate email format if provided
        if (updateData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updateData.email)) {
            return NextResponse.json(
                { success: false, error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Check if employee with same email already exists (excluding current employee)
        if (updateData.email) {
            const existingEmployee = await employeesCollection.findOne({
                email: updateData.email.trim().toLowerCase(),
                _id: { $ne: new ObjectId(_id) }
            });
            if (existingEmployee) {
                return NextResponse.json(
                    { success: false, error: "Employee with this email already exists" },
                    { status: 400 }
                );
            }
        }

        // Clean and format update data
        const cleanUpdateData = {
            ...updateData,
            name: updateData.name?.trim(),
            position: updateData.position?.trim(),
            salary: updateData.salary ? parseFloat(updateData.salary) : updateData.salary,
            phone: updateData.phone?.trim() || "",
            email: updateData.email?.trim().toLowerCase() || "",
            updatedAt: new Date()
        };

        // Remove undefined values
        Object.keys(cleanUpdateData).forEach(key => {
            if (cleanUpdateData[key] === undefined) {
                delete cleanUpdateData[key];
            }
        });

        const result = await employeesCollection.updateOne(
            { _id: new ObjectId(_id) },
            { $set: cleanUpdateData }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { success: false, error: "Employee not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Employee updated successfully"
        });

    } catch (error) {
        console.error("Error updating employee:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update employee", details: error.message },
            { status: 500 }
        );
    }
};

// DELETE - Delete employee
export const DELETE = async (req) => {
    try {
        const db = await connectDB();
        const employeesCollection = db.collection('employees');

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json(
                { success: false, error: "Missing employee ID" },
                { status: 400 }
            );
        }

        const result = await employeesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { success: false, error: "Employee not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Employee deleted successfully"
        });

    } catch (error) {
        console.error("Error deleting employee:", error);
        return NextResponse.json(
            { success: false, error: "Failed to delete employee", details: error.message },
            { status: 500 }
        );
    }
};