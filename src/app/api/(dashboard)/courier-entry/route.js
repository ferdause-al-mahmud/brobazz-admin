import { NextResponse } from "next/server";

export function normalizePhoneNumber(phone) {
    const bengaliToEnglishMap = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };

    return phone
        .split('')
        .map((char) => bengaliToEnglishMap[char] || char)
        .join('')
        .replace(/\D/g, '');
}

export async function POST(request) {
    try {
        const { courier_service, orderDetails, parsedAddress } = await request.json();

        if (!courier_service || !orderDetails) {
            return NextResponse.json({ error: "Missing courier_service or orderDetails" }, { status: 400 });
        }

        const { formData, cart, total, orderID } = orderDetails;

        // Create item description
        const item_description = cart
            .map((item, index) => `Product ${index + 1}: ${item.name} (${item.selectedSize}) - Qty: ${item.quantity}`)
            .join("\n");

        // ----------------------------------------
        // 🚀 1) PATHAO API
        // ----------------------------------------
        if (courier_service === "pathao") {

            if (!parsedAddress) {
                return NextResponse.json({ error: "Pathao requires parsedAddress" }, { status: 400 });
            }

            const payload = {
                store_id: 367849,
                merchant_order_id: orderID?.toString(),
                recipient_name: formData?.name,
                recipient_phone: normalizePhoneNumber(formData?.phone),
                recipient_address: formData?.address,
                recipient_city: parsedAddress?.district_id,
                recipient_zone: parsedAddress?.zone_id,
                recipient_area: parsedAddress?.area_id,
                delivery_type: 48,
                item_type: 2,
                special_instruction: formData?.notes || "No special instructions.",
                item_quantity: 1,
                item_weight: 0.5,
                item_description,
                amount_to_collect: total,
            };

            const pathaoResponse = await fetch("https://merchant.pathao.com/api/v1/orders", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${process.env.PATHAO_TOKEN}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await pathaoResponse.json();

            return NextResponse.json({
                success: true,
                courier_service,
                consignment_id: result?.data?.consignment_id,
                raw: result
            });
        }

        // ----------------------------------------
        // 🚀 2) STEADFAST API
        // ----------------------------------------
        if (courier_service === "steadfast") {

            const payload = {
                invoice: orderID?.toString(),
                recipient_name: formData?.name,
                recipient_phone: normalizePhoneNumber(formData?.phone),
                recipient_address: formData?.address,
                cod_amount: total,
                note: formData?.notes || "",
                item_description,
                delivery_type: 0
            };

            const steadyResponse = await fetch("https://portal.packzy.com/api/v1/create_order", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Api-Key": process.env.STEADFAST_API_KEY,
                    "Secret-Key": process.env.STEADFAST_SECRET_KEY,
                },
                body: JSON.stringify(payload),
            });

            const result = await steadyResponse.json();

            return NextResponse.json({
                success: true,
                courier_service,
                consignment_id: result?.consignment?.consignment_id,
                raw: result
            });
        }

        return NextResponse.json({ error: "Invalid courier_service" }, { status: 400 });

    } catch (error) {
        return NextResponse.json({
            error: "Courier API failed",
            detail: error.message
        }, { status: 500 });
    }
}
