import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const GET = async (req, { params }) => {
    const db = await connectDB();
    const ordersCollection = db.collection('orders');

    try {
        const { orderID } = await params;

        const order = await ordersCollection.findOne({ orderID: parseInt(orderID) });

        if (!order) {
            return NextResponse.json(
                { error: `Order with ID ${orderID} not found` },
                { status: 404 }
            );
        }

        return NextResponse.json(order, { status: 200 });

    } catch (error) {
        console.error("Error fetching order:", error);
        return NextResponse.json(
            { error: "Failed to fetch order", details: error.message },
            { status: 500 }
        );
    }
};

export const PUT = async (req, { params }) => {
    const db = await connectDB();
    const paramOrder = await params;
    const ordersCollection = db.collection('orders');
    const productsCollection = db.collection('products');
    const orderID = parseInt(paramOrder.orderID);
    const { status } = await req.json();

    try {
        // Fetch current order
        const order = await ordersCollection.findOne({ orderID });

        if (!order) {
            return NextResponse.json({ error: "Order not found" }, { status: 404 });
        }

        const newStatus = status.toLowerCase();
        const previousStatus = order.status?.toLowerCase();

        // ---------------------------
        // CASE 1: Status is changing to 'delivered'
        // ---------------------------
        if (newStatus === 'delivered') {
            const courier = order.courier_service?.toLowerCase();
            let total_revenue;

            // Steadfast, Pathao, or no courier service - use same logic
            if (!courier || courier === "steadfast" || courier === "pathao") {
                total_revenue = parseFloat(order.total) - parseFloat(order.shippingCost) + (parseFloat(order.advance) || 0);
            } else {
                // Other courier services - no revenue calculation
                total_revenue = 0;
            }

            // Update order status and total_revenue
            const result = await ordersCollection.updateOne(
                { orderID },
                { $set: { status, total_revenue } }
            );

            if (result.modifiedCount === 0) {
                return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
            }

            // Increase selling_amount for all products in the order
            if (order.cart && order.cart.length > 0) {
                for (const item of order.cart) {
                    await productsCollection.updateOne(
                        { id: item.id },
                        { $inc: { selling_amount: parseInt(item.quantity, 10) } }
                    );
                }
            }

            return NextResponse.json(
                { message: "Order updated to delivered status with profit and selling amount calculated" },
                { status: 200 }
            );
        }

        // ---------------------------
        // CASE 2: Status is NOT 'delivered'
        // ---------------------------

        // If order was previously delivered and is being changed, decrease selling_amount
        if (previousStatus === 'delivered') {
            if (order.cart && order.cart.length > 0) {
                for (const item of order.cart) {
                    // Fetch current product to check selling_amount
                    const product = await productsCollection.findOne({ id: item.id });
                    const currentSellingAmount = product?.selling_amount || 0;
                    const decrementAmount = parseInt(item.quantity, 10);

                    // Only decrease if it won't go negative
                    if (currentSellingAmount > 0) {
                        const newAmount = Math.max(0, currentSellingAmount - decrementAmount);
                        await productsCollection.updateOne(
                            { id: item.id },
                            { $set: { selling_amount: newAmount } }
                        );
                    }
                }
            }
        }

        // If status is "returned", update inventory
        if (newStatus === "returned") {
            const quantityUpdates = order.cart?.map((item) => ({
                productId: item.id,
                size: item.selectedSize,
                quantity: Number.parseInt(item.quantity, 10),
            }));

            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/update-quantity`, {
                method: "POST",
                // Forward the session cookie so proxy.js lets this internal call through.
                headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") ?? "" },
                body: JSON.stringify({ updates: quantityUpdates }),
            });
        }

        //if previous status was "returned" and is being changed, we need to decrease inventory again
        if (previousStatus === "returned" && newStatus !== "returned") {
            const quantityUpdates = order.cart?.map((item) => ({
                productId: item.id,
                size: item.selectedSize,
                quantity: -Number.parseInt(item.quantity, 10),
            }));

            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/update-quantity`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: req.headers.get("cookie") ?? "" },
                body: JSON.stringify({ updates: quantityUpdates }),
            });
        }

        // Update order status
        const result = await ordersCollection.updateOne(
            { orderID },
            { $set: { status } }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
        }

        return NextResponse.json({ message: "Order updated successfully" }, { status: 200 });

    } catch (error) {
        console.error("Error updating order:", error);
        return NextResponse.json(
            { error: "Failed to update order", details: error.message },
            { status: 500 }
        );
    }
};

export async function DELETE(request, { params }) {
    const db = await connectDB();
    const ordersCollection = db.collection('orders');

    try {
        const { orderID } = await params;
        // Find the order first to check if it exists and get its data
        const order = await ordersCollection.findOne({ orderID: parseInt(orderID) });
        if (!order) {
            return NextResponse.json(
                { message: "Order not found" },
                { status: 404 }
            );
        }

        // Delete the order
        const result = await ordersCollection.deleteOne({ orderID: parseInt(orderID) });

        if (result.deletedCount === 0) {
            return NextResponse.json(
                { message: "Failed to delete order" },
                { status: 500 }
            );
        }

        // If the order was not returned, we need to update inventory
        if (order.status !== "returned") {
            const quantityUpdates = order.cart?.map((item) => ({
                productId: item.id,
                size: item.selectedSize,
                quantity: Number.parseInt(item.quantity, 10), // Positive to add back to inventory
            }));

            // Update inventory
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/orders/update-quantity`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Cookie: request.headers.get("cookie") ?? "" },
                body: JSON.stringify({ updates: quantityUpdates }),
            });
        }

        return NextResponse.json(
            { message: "Order deleted successfully" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting order:", error);
        return NextResponse.json(
            { message: "Error deleting order" },
            { status: 500 }
        );
    }
}
