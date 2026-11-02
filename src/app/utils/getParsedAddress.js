export async function getParsedAddress(address) {
    try {
        const response = await fetch("/api/address-parse", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ address }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error?.message || "Failed to parse address");
        }

        const result = await response.json();
        return result?.data; // Return just the parsed address data
    } catch (error) {
        console.error("Error parsing address:", error.message);
        return null; // or throw error if you want to handle it higher up
    }
}
