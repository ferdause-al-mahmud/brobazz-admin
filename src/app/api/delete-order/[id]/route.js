import { connectDB } from "@/app/lib/connectDB"
import { NextResponse } from "next/server"

export async function DELETE(req, { params }) {
    try {
        const { id } = params
        const parsedId = parseInt(id, 10)

        if (!parsedId) {
            return NextResponse.json({ message: "Order ID is required" }, { status: 400 })
        }

        const db = await connectDB()
        const ordersCollection = db.collection("orders")

        const result = await ordersCollection.deleteOne({ orderID: parsedId })

        if (result.deletedCount === 0) {
            return NextResponse.json({ message: "Order not found or already deleted" }, { status: 404 })
        }

        return NextResponse.json({ message: "Order deleted successfully" })
    } catch (error) {
        console.error("Error deleting order:", error)
        return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 })
    }
}
