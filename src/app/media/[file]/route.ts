import { mediaResponse } from "@/lib/media";

// GET /media/<id>.webp — uploaded images (see src/lib/media.ts). Public, like on the storefront.
export async function GET(_request: Request, ctx: RouteContext<"/media/[file]">) {
  const { file } = await ctx.params;
  try {
    return (await mediaResponse(file)) ?? new Response("Not found", { status: 404 });
  } catch (error) {
    console.error("Serving media failed", error);
    return new Response("Couldn't load the file", { status: 500 });
  }
}
