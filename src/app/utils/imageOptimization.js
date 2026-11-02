import imageCompression from "browser-image-compression"

export async function optimizeImage(file) {
    const options = {
        initialQuality: 0.85,

        maxWidthOrHeight: 1920,
        useWebWorker: true,

    }

    try {
        return await imageCompression(file, options)
    } catch (error) {
        console.error("Error compressing image:", error)
        return file // Return original file if compression fails
    }
}

