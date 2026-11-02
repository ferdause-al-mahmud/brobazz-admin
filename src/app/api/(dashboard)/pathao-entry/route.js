
export function normalizePhoneNumber(phone) {
    const bengaliToEnglishMap = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    };

    return phone
        .split('')
        .map(char => bengaliToEnglishMap[char] || char) // Convert Bengali digits
        .join('')
        .replace(/\D/g, ''); // Remove non-digit characters (e.g., hyphens)
}

export async function POST(request) {


    try {
        const orderDetails = await request.json();
        const { formData, cart, total, orderID, parsedAddress } = orderDetails;

        const item_description = cart.map((item, index) =>
            `Product ${index + 1}: ${item.name} (${item.selectedSize}) - Quantity: ${item.quantity}`
        ).join("\n");

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

        const data = await pathaoResponse.json();

        return new Response(JSON.stringify(data), {
            status: pathaoResponse.status,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({
            error: "Failed to create order",
            detail: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
