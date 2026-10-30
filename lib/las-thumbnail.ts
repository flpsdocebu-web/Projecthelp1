import { db } from "@/lib/db";

export const DEFAULT_LAS_THUMBNAIL = { url: "/phelps-resource-cover.png", width: 1532, height: 876, custom: false };
export const thumbnailTable = `CREATE TABLE IF NOT EXISTS las_thumbnail (
  id TINYINT UNSIGNED PRIMARY KEY,
  image_data MEDIUMBLOB NOT NULL,
  image_version CHAR(64) NOT NULL,
  width INT UNSIGNED NOT NULL,
  height INT UNSIGNED NOT NULL,
  updated_by CHAR(36) NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`;

export function thumbnailDetails(row: { image_version: string; width: number; height: number }) {
  return { url: `/api/las-thumbnail/image?v=${row.image_version}`, width: row.width, height: row.height, custom: true };
}

export async function readThumbnail(withImage = false) {
  try {
    const [rows] = await db.query<any[]>(`SELECT image_version,width,height${withImage ? ",image_data" : ""} FROM las_thumbnail WHERE id=1`);
    return rows[0] || null;
  } catch (error) {
    // Older deployments keep their default cover until the first administrator upload.
    if ((error as { code?: string }).code === "ER_NO_SUCH_TABLE") return null;
    throw error;
  }
}
