// src/app/api/product-revenue/route.js

export async function POST(request, { params }) {
    const { cID } = await request.json();

    try {
        const response = await fetch(`https://merchant.pathao.com/api/v1/orders/${cID}?archive=0`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PATHAO_TOKEN}`,
            },
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            status: response.status,
            headers: { "Content-Type": "application/json" },
        });
    } catch (error) {
        return new Response(JSON.stringify({
            error: "Server error",
            detail: error.message
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
