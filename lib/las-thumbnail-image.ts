import sharp from "sharp";
import { createHash } from "node:crypto";

export const MAX_THUMBNAIL_BYTES = 5 * 1024 * 1024;
export class ThumbnailInputError extends Error {}

export async function prepareThumbnail(buffer: Buffer) {
  if (!buffer.length || buffer.length > MAX_THUMBNAIL_BYTES) throw new ThumbnailInputError("Choose an image no larger than 5 MB.");
  try {
    const image = sharp(buffer, { limitInputPixels: 20_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (!["png", "jpeg", "webp"].includes(metadata.format || "") || (metadata.pages || 1) > 1) throw new ThumbnailInputError("Choose a still PNG, JPG, or WebP image.");
    if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 60) throw new ThumbnailInputError("Choose an image at least 100 pixels wide and 60 pixels high.");
    const { data, info } = await image.rotate().resize({ width: 1600, height: 1000, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height, version: createHash("sha256").update(data).digest("hex") };
  } catch (error) {
    if (error instanceof ThumbnailInputError) throw error;
    throw new ThumbnailInputError("This image could not be read. Choose a valid PNG, JPG, or WebP image (up to 20 megapixels).");
  }
}
