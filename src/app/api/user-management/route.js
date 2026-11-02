import { NextResponse } from "next/server";
import { connectDB } from "@/app/lib/connectDB";
import { ObjectId } from "mongodb";

// GET /api/user-management
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const searchQuery = searchParams.get("search") || "";
        const roleFilter = searchParams.get("role") || "";
        const page = parseInt(searchParams.get("page")) || 1;
        const limit = 30; // 30 users per page
        const skip = (page - 1) * limit;

        // Connect to MongoDB
        const db = await connectDB();
        const usersCollection = db.collection("users");

        // Build query
        let query = {};

        // Add search filter if provided
        if (searchQuery) {
            query.$or = [
                { name: { $regex: searchQuery, $options: 'i' } },
                { email: { $regex: searchQuery, $options: 'i' } }
            ];
        }

        // Add role filter if provided
        if (roleFilter) {
            query.role = roleFilter;
        }

        // Get total count of users matching the query
        const totalUsers = await usersCollection.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        // Fetch users with pagination
        const users = await usersCollection
            .find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        // Transform the data to include _id
        const transformedUsers = users.map(user => ({
            _id: user._id,
            email: user.email,
            name: user.name || user.email.split("@")[0],
            role: user.role || "customer",
            createdAt: user.createdAt || new Date(),
        }));

        return NextResponse.json({
            users: transformedUsers,
            totalUsers,
            totalPages,
            currentPage: page,
            usersPerPage: limit
        });
    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json(
            { error: "Failed to fetch users" },
            { status: 500 }
        );
    }
}

// PATCH /api/user-management
export async function PATCH(request) {
    try {
        const { userId, newRole } = await request.json();

        if (!userId || !newRole) {
            return NextResponse.json(
                { error: "Missing required fields" },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles = ["admin", "moderator", "customer"];
        if (!validRoles.includes(newRole)) {
            return NextResponse.json(
                { error: "Invalid role" },
                { status: 400 }
            );
        }

        // Connect to MongoDB
        const db = await connectDB();
        const usersCollection = db.collection("users");

        // Update user role in MongoDB
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    role: newRole,
                    updatedAt: new Date()
                }
            }
        );

        if (result.matchedCount === 0) {
            return NextResponse.json(
                { error: "User not found" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            message: "User role updated successfully",
            userId,
            newRole
        });
    } catch (error) {
        console.error("Error updating user role:", error);
        return NextResponse.json(
            { error: "Failed to update user role" },
            { status: 500 }
        );
    }
} 