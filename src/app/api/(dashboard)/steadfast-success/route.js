import { normalizePhoneNumber } from "../pathao-entry/route";

// src/app/api/steadfast-success/route.js
export async function GET(request) {
    try {
        // Get phone from query parameters
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone");

        console.log("Phone from query:", phone);

        // Validate input
        if (!phone) {
            return new Response(JSON.stringify({
                error: "Phone number is required"
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const normalizedPhone = normalizePhoneNumber(phone);
        console.log("Normalized phone:", normalizedPhone);

        // Try multiple endpoint variations
        const endpoints = [
            `https://steadfast.com.bd/api/user/consignment/getbyphone/${normalizedPhone}`,
            `https://steadfast.com.bd/user/consignment/getbyphone/${normalizedPhone}`,
        ];

        let lastError = null;

        for (const endpoint of endpoints) {
            console.log("Trying endpoint:", endpoint);

            const response = await fetch(endpoint, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Api-Key": process.env.STEADFAST_API_KEY,
                    "Secret-Key": process.env.STEADFAST_SECRET_KEY,
                    "Accept": "application/json",
                },
            });

            console.log("Response Status:", response.status);
            console.log("Content-Type:", response.headers.get("content-type"));

            // Get response text first
            const text = await response.text();

            // Try to parse as JSON
            try {
                const data = JSON.parse(text);
                console.log("Successfully parsed JSON response");

                return new Response(JSON.stringify(data), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            } catch (parseError) {
                console.log(`Failed to parse response from ${endpoint}`);
                lastError = {
                    endpoint,
                    status: response.status,
                    contentType: response.headers.get("content-type"),
                    error: parseError.message
                };
                console.log("Text preview:", text.substring(0, 100));
            }
        }

        // If all endpoints failed
        console.error("All endpoints failed:", lastError);
        return new Response(JSON.stringify({
            error: "Failed to fetch from Steadfast API",
            detail: "Invalid response format from all endpoints",
            lastAttempt: lastError
        }), {
            status: 502,
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        // Handle errors gracefully
        console.error("Error in steadfast-success:", error.message);
        return new Response(JSON.stringify({
            error: "Server error",
            detail: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}