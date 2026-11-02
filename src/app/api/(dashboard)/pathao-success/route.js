import { normalizePhoneNumber } from "../pathao-entry/route";

// src/app/api/success-rate/route.js
export async function POST(request) {
    try {
        // Parse incoming JSON body
        const body = await request.json();

        // Optional: Validate input
        if (!body.phone) {
            return new Response(JSON.stringify({
                error: "Phone number is required"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const phone = normalizePhoneNumber(body?.phone);

        // Forward request to Pathao API
        const response = await fetch("https://merchant.pathao.com/api/v1/user/success", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PATHAO_TOKEN}`,
            },
            body: JSON.stringify({ phone }),
        });

        // Get response data
        const data = await response.json();

        // Return Pathao response back to client
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        // Handle errors gracefully
        return new Response(JSON.stringify({
            error: "Server error",
            detail: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}