import { readThumbnail } from "@/lib/las-thumbnail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const row = await readThumbnail(true);
    if (!row) return Response.redirect(new URL("/phelps-resource-cover.png", request.url), 307);
    return new Response(new Uint8Array(row.image_data), { headers: {
      "Content-Type": "image/webp", "X-Content-Type-Options": "nosniff",
      "Cache-Control": "public, max-age=300", "ETag": `"${row.image_version}"`,
    } });
  } catch { return new Response("Thumbnail unavailable", { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
