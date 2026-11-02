// // Backend API - Better rate limit handling
// const CACHE = new Map();
// const TTL_MS = 5 * 60 * 1000; // 5 minutes cache for successful responses
// const REQUEST_QUEUE = new Map();
// const wait = (ms) => new Promise(r => setTimeout(r, ms));

// // Aggressive rate limiting
// const RATE_LIMITER = {
//     requests: [],
//     maxPerMinute: 20, // Conservative limit
//     minDelay: 100, // Minimum 100ms between requests

//     async canProceed() {
//         const now = Date.now();
//         // Remove requests older than 1 minute
//         this.requests = this.requests.filter(time => now - time < 60000);

//         // Check if we're at the limit
//         if (this.requests.length >= this.maxPerMinute) {
//             const oldestRequest = Math.min(...this.requests);
//             const waitTime = 60000 - (now - oldestRequest) + 100;
//             console.log(`Rate limit reached, waiting ${waitTime}ms`);
//             await wait(waitTime);
//             return this.canProceed(); // Recursive check
//         }

//         // Check minimum delay between requests
//         if (this.requests.length > 0) {
//             const lastRequest = Math.max(...this.requests);
//             const timeSinceLastRequest = now - lastRequest;
//             if (timeSinceLastRequest < this.minDelay) {
//                 await wait(this.minDelay - timeSinceLastRequest);
//             }
//         }

//         this.requests.push(Date.now());
//         return true;
//     }
// };

// export async function GET(request) {
//     try {
//         const { searchParams } = new URL(request.url);
//         const id = searchParams.get("id");

//         if (!id) {
//             return Response.json({ error: "Missing order ID" }, { status: 400 });
//         }

//         const now = Date.now();

//         // Check cache first - ONLY return cached if it's a successful response
//         const cached = CACHE.get(id);
//         if (cached && cached.expiresAt > now && !cached.value.error) {
//             return Response.json(cached.value, {
//                 headers: { "Cache-Control": "public, max-age=300" }
//             });
//         }

//         // Check if request already in progress
//         if (REQUEST_QUEUE.has(id)) {
//             const result = await REQUEST_QUEUE.get(id);
//             return Response.json(result, {
//                 headers: { "Cache-Control": "public, max-age=300" }
//             });
//         }

//         // Wait for rate limiter approval
//         await RATE_LIMITER.canProceed();

//         // Create and queue the request
//         const requestPromise = fetchOrderWithRetry(id);
//         REQUEST_QUEUE.set(id, requestPromise);

//         try {
//             const result = await requestPromise;

//             // ONLY cache successful results (no errors)
//             if (result && !result.error && result.order_status !== "Error") {
//                 CACHE.set(id, {
//                     value: result,
//                     expiresAt: now + TTL_MS
//                 });
//             } else {
//                 // Remove any previously cached error for this ID
//                 CACHE.delete(id);
//             }

//             return Response.json(result, {
//                 headers: {
//                     "Cache-Control": result.error ? "no-cache" : "public, max-age=300"
//                 }
//             });
//         } finally {
//             REQUEST_QUEUE.delete(id);
//         }

//     } catch (error) {
//         console.error("API Error:", error);
//         return Response.json({
//             error: "Server error",
//             detail: error.message,
//             order_status: "Error"
//         }, { status: 500 });
//     }
// }

// async function fetchOrderWithRetry(id, retryCount = 0) {
//     const MAX_RETRIES = 2;
//     const url = `https://api-hermes.pathao.com/aladdin/api/v1/orders/${id}`;

//     try {
//         const resp = await fetch(url, {
//             headers: {
//                 "Content-Type": "application/json",
//                 Authorization: `Bearer ${process.env.PATHAO_TOKEN}`,
//             },
//         });

//         // Handle rate limits with exponential backoff
//         if (resp.status === 429) {
//             if (retryCount >= MAX_RETRIES) {
//                 console.warn(`Max retries reached for order ${id}`);
//                 return {
//                     error: "Rate limited",
//                     order_status: "Limit reached please wait", // Return pending instead of error
//                     retryLater: true
//                 };
//             }

//             const retryAfter = resp.headers.get("Retry-After");
//             const baseWait = retryAfter ? Math.min(+retryAfter * 1000, 10000) : 2000;
//             const waitTime = baseWait * Math.pow(2, retryCount); // Exponential backoff

//             console.log(`Rate limited for order ${id}, retry ${retryCount + 1}/${MAX_RETRIES}, waiting ${waitTime}ms`);
//             await wait(waitTime);

//             return fetchOrderWithRetry(id, retryCount + 1);
//         }

//         if (!resp.ok) {
//             const errorData = await safeJson(resp);
//             console.warn(`Failed to fetch order ${id}: ${resp.status}`, errorData);
//             return {
//                 error: "Failed to fetch",
//                 detail: errorData,
//                 order_status: "Unknown",
//                 statusCode: resp.status
//             };
//         }

//         const data = await resp.json();
//         return {
//             consignment_id: data?.data?.consignment_id || id,
//             order_status: data?.data?.order_status || "Unknown",
//             updated_at: data?.data?.updated_at,
//         };

//     } catch (error) {
//         console.error(`Network error for order ${id}:`, error.message);
//         return {
//             error: "Network error",
//             detail: error.message,
//             order_status: "Unknown"
//         };
//     }
// }

// async function safeJson(res) {
//     try {
//         return await res.json();
//     } catch {
//         try {
//             return { message: await res.text() };
//         } catch {
//             return { message: "unknown" };
//         }
//     }
// }


const CACHE = new Map();
const TTL_MS = 5 * 60 * 1000;
const REQUEST_QUEUE = new Map();
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const RATE_LIMITER = {
    requests: [],
    maxPerMinute: 20,
    minDelay: 100,

    async canProceed() {
        const now = Date.now();

        this.requests = this.requests.filter((time) => now - time < 60000);

        if (this.requests.length >= this.maxPerMinute) {
            const oldest = Math.min(...this.requests);
            const waitMs = 60000 - (now - oldest) + 100;
            await wait(waitMs);
            return this.canProceed();
        }

        if (this.requests.length > 0) {
            const last = Math.max(...this.requests);
            const since = now - last;
            if (since < this.minDelay) {
                await wait(this.minDelay - since);
            }
        }

        this.requests.push(Date.now());
        return true;
    }
};

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const consignment_id = searchParams.get("id");
        const courier = searchParams.get("courier_service") || "pathao";

        if (!consignment_id) {
            return Response.json({ error: "Missing ID" }, { status: 400 });
        }

        const now = Date.now();
        const cacheKey = `${courier}-${consignment_id}`;
        const cached = CACHE.get(cacheKey);

        if (cached && cached.expiresAt > now && !cached.value.error) {
            return Response.json(cached.value, {
                headers: { "Cache-Control": "public, max-age=300" },
            });
        }

        if (REQUEST_QUEUE.has(cacheKey)) {
            const result = await REQUEST_QUEUE.get(cacheKey);
            return Response.json(result, {
                headers: { "Cache-Control": "public, max-age=300" },
            });
        }

        await RATE_LIMITER.canProceed();

        const requestPromise =
            courier === "steadfast"
                ? fetchSteadfastStatus(consignment_id)
                : fetchPathaoStatus(consignment_id);

        REQUEST_QUEUE.set(cacheKey, requestPromise);

        try {
            const result = await requestPromise;

            if (result && !result.error) {
                CACHE.set(cacheKey, {
                    value: result,
                    expiresAt: now + TTL_MS,
                });
            } else {
                CACHE.delete(cacheKey);
            }

            return Response.json(result, {
                headers: {
                    "Cache-Control": result.error
                        ? "no-cache"
                        : "public, max-age=300",
                },
            });
        } finally {
            REQUEST_QUEUE.delete(cacheKey);
        }
    } catch (error) {
        return Response.json(
            {
                error: "Server error",
                detail: error.message,
                order_status: "Error",
            },
            { status: 500 }
        );
    }
}

async function fetchPathaoStatus(id, retry = 0) {
    const MAX_RETRY = 2;
    const url = `https://api-hermes.pathao.com/aladdin/api/v1/orders/${id}`;

    try {
        const resp = await fetch(url, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.PATHAO_TOKEN}`,
            },
        });

        if (resp.status === 429) {
            if (retry >= MAX_RETRY) {
                return { order_status: "Limit reached please wait" };
            }
            await wait(2000 * (retry + 1));
            return fetchPathaoStatus(id, retry + 1);
        }

        if (!resp.ok) {
            const err = await safeJson(resp);
            return {
                error: true,
                detail: err,
                order_status: "Unknown",
            };
        }

        const data = await resp.json();

        return {
            consignment_id: data?.data?.consignment_id || id,
            order_status: data?.data?.order_status || "Unknown",
            updated_at: data?.data?.updated_at,
        };
    } catch (error) {
        return {
            error: true,
            detail: error.message,
            order_status: "Unknown",
        };
    }
}

async function fetchSteadfastStatus(consignment_id) {
    try {
        const url = `https://portal.packzy.com/api/v1/status_by_cid/${consignment_id}`;

        const resp = await fetch(url, {
            headers: {
                "Api-Key": process.env.STEADFAST_API_KEY,
                "Secret-Key": process.env.STEADFAST_SECRET_KEY,
                "Content-Type": "application/json",
            },
        });

        if (!resp.ok) {
            const text = await safeJson(resp);
            return {
                error: true,
                detail: text,
                order_status: "Unknown",
            };
        }

        const data = await resp.json();

        return {
            consignment_id,
            order_status: data?.delivery_status || "Unknown",
        };
    } catch (error) {
        return {
            error: true,
            detail: error.message,
            order_status: "Unknown",
        };
    }
}

async function safeJson(res) {
    try {
        return await res.json();
    } catch {
        return await res.text();
    }
}
