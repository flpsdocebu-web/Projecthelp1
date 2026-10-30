import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/auth";
import { db } from "@/lib/db";
import { DEFAULT_LAS_THUMBNAIL, readThumbnail, thumbnailDetails, thumbnailTable } from "@/lib/las-thumbnail";
import { MAX_THUMBNAIL_BYTES, prepareThumbnail, ThumbnailInputError } from "@/lib/las-thumbnail-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };

export async function GET() {
  try {
    const row = await readThumbnail();
    return NextResponse.json({ thumbnail: row ? thumbnailDetails(row) : DEFAULT_LAS_THUMBNAIL }, { headers });
  } catch {
    return NextResponse.json({ error: "Thumbnail settings are temporarily unavailable." }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  const admin = await requireAdministrator();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers });
  if (request.headers.get("sec-fetch-site") === "cross-site" || !request.headers.get("content-type")?.startsWith("multipart/form-data")) return NextResponse.json({ error: "Invalid thumbnail upload request." }, { status: 403, headers });
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new ThumbnailInputError("Choose an image to upload.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_THUMBNAIL_BYTES + 128 * 1024) { await reader.cancel(); throw new ThumbnailInputError("Choose an image no larger than 5 MB."); }
      chunks.push(chunk.value);
    }
    let form: FormData;
    try { form = await new Response(new Uint8Array(Buffer.concat(chunks)), { headers: { "Content-Type": request.headers.get("content-type")! } }).formData(); }
    catch { throw new ThumbnailInputError("Invalid image upload. Please select the image again."); }
    const file = form.get("image");
    if (!(file instanceof File)) throw new ThumbnailInputError("Choose one PNG, JPG, or WebP image.");
    const image = await prepareThumbnail(Buffer.from(await file.arrayBuffer()));
    await db.execute(thumbnailTable);
    await db.execute(`INSERT INTO las_thumbnail(id,image_data,image_version,width,height,updated_by) VALUES(1,?,?,?,?,?)
      ON DUPLICATE KEY UPDATE image_data=VALUES(image_data),image_version=VALUES(image_version),width=VALUES(width),height=VALUES(height),updated_by=VALUES(updated_by),updated_at=CURRENT_TIMESTAMP`,
    [image.data, image.version, image.width, image.height, admin.id]);
    return NextResponse.json({ thumbnail: thumbnailDetails({ image_version: image.version, width: image.width, height: image.height }) }, { headers });
  } catch (error) {
    return NextResponse.json({ error: error instanceof ThumbnailInputError ? error.message : "The thumbnail could not be saved. Your current cover is unchanged. Please try again." }, { status: error instanceof ThumbnailInputError ? 400 : 503, headers });
  }
}
