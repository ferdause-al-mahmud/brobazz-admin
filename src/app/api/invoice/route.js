// src/app/api/invoice/route.js

export async function POST(req) {
    try {
        const body = await req.json();

        const pathaoResponse = await fetch("https://merchant.pathao.com/api/v1/orders/pods", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PATHAO_TOKEN}`, // same token
            },
            body: JSON.stringify(body),
        });

        const contentType = pathaoResponse.headers.get("content-type");
        const buffer = await pathaoResponse.arrayBuffer();

        return new Response(buffer, {
            status: 200,
            headers: {
                "Content-Type": contentType,
            },
        });
    } catch (error) {
        console.error("Invoice proxy error:", error);
        return new Response(JSON.stringify({ message: "Failed to fetch invoice" }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}
