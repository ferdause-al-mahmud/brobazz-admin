import { connectDB } from "@/app/lib/connectDB"
import { NextResponse } from "next/server"

export async function PUT(req, { params }) {
    try {
        const { id } = await params;
        const { phone, cart, total, notes, address, shippingCost, consignment_id, name, email, paymentOption, shippingOption, discount, status, advance } = await req.json()
        const parsedId = parseInt(id, 10)
        // ValparsedIdate input
        if (!parsedId) {
            return NextResponse.json({ message: "Order ID is required" }, { status: 400 })
        }

        if (!cart || !Array.isArray(cart) || cart.length === 0) {
            return NextResponse.json({ message: "Cart items are required" }, { status: 400 })
        }

        // Connect to database
        const db = await connectDB()
        const ordersCollection = db.collection("orders")

        // Find the order to update
        const existingOrder = await ordersCollection.findOne({ orderID: parsedId })
        if (!existingOrder) {
            return NextResponse.json({ message: "Order not found" }, { status: 404 })
        }

        // Update the order
        const updatedOrder = {
            ...existingOrder,
            formData: {
                ...existingOrder.formData,
                phone: phone,
                notes: notes,
                address: address,
                name: name || existingOrder.formData?.name,
                email: email || existingOrder.formData?.email
            },
            cart: cart,
            total: total,
            shippingCost: shippingCost || 0,
            consignment_id: consignment_id || "",
            paymentOption: paymentOption || existingOrder.paymentOption,
            shippingOption: shippingOption || existingOrder.shippingOption,
            discount: discount !== undefined ? discount : (existingOrder.discount || 0),
            advance: advance !== undefined ? advance : (existingOrder.advance || 0),
            status: status || existingOrder.status,
            updatedAt: new Date(),
        }

        // Save to database
        const result = await ordersCollection.updateOne({ orderID: parsedId }, { $set: updatedOrder })

        if (result.modifiedCount === 0) {
            return NextResponse.json({ message: "Failed to update order" }, { status: 500 })
        }

        return NextResponse.json({
            message: "Order updated successfully",
            order: updatedOrder,
        })
    } catch (error) {
        console.error("Error updating order:", error)
        return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 })
    }
}


export async function PATCH(req, { params }) {
    try {
        const { id } = await params;
        const { consignment_id, courier_service } = await req.json();
        const parsedId = parseInt(id, 10);

        if (!parsedId || !consignment_id) {
            return NextResponse.json(
                { message: "Order ID and consignment_id are required" },
                { status: 400 }
            );
        }

        // Connect to database
        const db = await connectDB();
        const ordersCollection = db.collection("orders");

        // Update the order with new consignment_id
        const result = await ordersCollection.updateOne(
            { orderID: parsedId },
            { $set: { consignment_id, updatedAt: new Date(), courier_service } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ message: "Order not found or not updated" }, { status: 404 });
        }

        return NextResponse.json({
            message: "Consignment ID added successfully",
            consignment_id,
        });
    } catch (error) {
        console.error("Error adding consignment_id:", error);
        return NextResponse.json(
            { message: "Internal server error", error: error.message },
            { status: 500 }
        );
    }
}

