import { connectDB } from "@/app/lib/connectDB"

/** Convert Bangla digits to English & normalize phone */
function normalizePhoneNumber(phone = "") {
    const bengaliToEnglishMap = {
        '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
        '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9'
    }

    return phone
        .split("")
        .map(char => bengaliToEnglishMap[char] || char)
        .join("")
        .replace(/\D/g, "")
}

export const GET = async () => {
    try {
        const db = await connectDB()
        const ordersCollection = db.collection("orders")

        // 🔥 Only delivered orders with shippingCost = 70
        const orders = await ordersCollection.find(
            {
                shippingCost: 70,
                status: "delivered"
            },
            {
                projection: {
                    _id: 0,
                    "formData.name": 1,
                    "formData.phone": 1,
                    shippingCost: 1
                }
            }
        ).toArray()

        // CSV Header
        let csv = "Name,Phone,Shipping Cost\n"

        orders.forEach(order => {
            const name = order?.formData?.name?.trim() || ""
            const phone = normalizePhoneNumber(order?.formData?.phone || "")
            const cost = order.shippingCost

            csv += `"${name}","${phone}","${cost}"\n`
        })

        return new Response(csv, {
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": "attachment; filename=delivered-shipping-70.csv"
            }
        })
    } catch (error) {
        console.error("CSV export error:", error)
        return new Response("Failed to export CSV", { status: 500 })
    }
}
