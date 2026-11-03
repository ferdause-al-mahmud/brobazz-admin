import { uploadResponse } from "@/lib/media";

// GET /uploads/<file> — images uploaded in the media library, read from UPLOAD_DIR (see src/lib/media.ts).
// Public, like on the storefront. In production nginx can serve this path directly instead.
export async function GET(_request: Request, ctx: RouteContext<"/uploads/[file]">) {
  const { file } = await ctx.params;
  try {
    return (await uploadResponse(file)) ?? new Response("Not found", { status: 404 });
  } catch (error) {
    console.error("Serving upload failed", error);
    return new Response("Couldn't load the file", { status: 500 });
  }
}
