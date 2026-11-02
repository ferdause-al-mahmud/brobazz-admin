import { normalizePhoneNumber } from "../pathao-entry/route";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone");

        if (!phone) {
            return new Response(
                JSON.stringify({ error: "Phone number is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone) {
            return new Response(
                JSON.stringify({ error: "A valid phone number is required" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        const response = await fetch(
            `https://portal.packzy.com/api/v1/fraud_check/score/${encodeURIComponent(normalizedPhone)}`,
            {
                method: "GET",
                headers: {
                    "api-key": process.env.STEADFAST_API_KEY,
                    "secret-key": process.env.STEADFAST_SECRET_KEY,
                    "Content-Type": "application/json",
                },
            }
        );

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    error: response.status === 429
                        ? "Fraud check rate limit reached. Please try again later."
                        : "Failed to fetch from Packzy",
                    status: response.status,
                }),
                {
                    status: response.status,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }
        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(
            JSON.stringify({
                error: "Server error",
                detail: error.message,
            }),
            { status: 500 }
        );
    }
}