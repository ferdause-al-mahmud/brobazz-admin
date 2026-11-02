// src/app/api/(dashboard)/upload/route.js

import { NextResponse } from "next/server";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/* ================= CORS ================= */

const allowedOrigins = [
    "http://localhost:3001",
    "http://localhost:3000",
    "https://admin.clothtar.com",
    "https://clothtar.vercel.app",
];

function getCorsHeaders(origin) {
    return allowedOrigins.includes(origin)
        ? {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        : {};
}

/* =============== OPTIONS ================= */

export async function OPTIONS(req) {
    return new NextResponse(null, {
        status: 204,
        headers: getCorsHeaders(req.headers.get("origin")),
    });
}

/* ================= POST ================= */

export async function POST(req) {
    const origin = req.headers.get("origin");
    const corsHeaders = getCorsHeaders(origin);

    try {
        const formData = await req.formData();
        const files = formData.getAll("files");

        if (!files?.length) {
            return NextResponse.json(
                { success: false, msg: "No files uploaded" },
                { headers: corsHeaders }
            );
        }

        const uploadDir = "/var/www/clothtar/public/uploads";
        fs.mkdirSync(uploadDir, { recursive: true });

        const results = [];

        for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const fileName = `${uuidv4()}.webp`;

            const optimizedImage = await sharp(buffer)
                .rotate() // auto-orient (VERY important)
                .resize({
                    width: 3200,   // or 3500
                    fit: "inside",
                    withoutEnlargement: true,
                    kernel: sharp.kernel.lanczos3,
                })
                .webp({ quality: 90, effort: 6 })
                .toBuffer();

            await fs.promises.writeFile(
                path.join(uploadDir, fileName),
                optimizedImage
            );

            results.push({
                url: `https://clothtar.com/uploads/${fileName}`,
                fileName,
            });
        }

        return NextResponse.json(
            { success: true, files: results },
            { headers: corsHeaders }
        );
    } catch (err) {
        console.error("UPLOAD ERROR:", err);
        return NextResponse.json(
            { success: false, msg: err.message },
            { status: 500, headers: corsHeaders }
        );
    }
}
