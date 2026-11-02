import { connectDB } from "@/app/lib/connectDB";
import { NextResponse } from "next/server";

export const POST = async (req) => {
    const db = await connectDB();
    const ordersCollection = db.collection("orders");

    try {
        const billingDetails = await req.json();
        billingDetails.createdAt = new Date();
        billingDetails.status = billingDetails.status || "pending";

        const phone = billingDetails?.formData?.phone;

        // Find latest order by this phone
        const lastOrderByPhone = await ordersCollection
            .find({ "formData.phone": phone })
            .sort({ createdAt: -1 })
            .limit(1)
            .toArray();

        if (lastOrderByPhone.length > 0) {
            const lastOrder = lastOrderByPhone[0];

            const createdTime = new Date(lastOrder.createdAt).getTime();
            const now = new Date().getTime();

            const diffMinutes = Math.floor((now - createdTime) / (1000 * 60));

            if (diffMinutes < 120) {
                const remaining = 120 - diffMinutes;

                return NextResponse.json(
                    {
                        message: `Order created with this number ${diffMinutes}  min ago. Try again after ${remaining} min`,
                    },
                    { status: 400 }
                );
            }
        }

        // Get highest orderID
        const lastOrder = await ordersCollection
            .find()
            .sort({ orderID: -1 })
            .limit(1)
            .toArray();

        let orderID = lastOrder.length > 0 ? lastOrder[0].orderID + 1 : 10001;

        while (await ordersCollection.findOne({ orderID })) {
            orderID += 1;
        }

        billingDetails.orderID = orderID;

        await ordersCollection.insertOne(billingDetails);

        return NextResponse.json(
            { message: "Order added successfully", orderID },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error adding Order:", error);
        return NextResponse.json(
            { error: "Failed to add Order", details: error.message },
            { status: 500 }
        );
    }
};