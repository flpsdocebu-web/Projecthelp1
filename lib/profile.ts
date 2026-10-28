import { db } from "./db";
import { officialDistrict } from "./district";

let photoTable: Promise<unknown> | undefined;
export function ensureProfilePhotos() {
  if (!photoTable) photoTable = db.execute(`CREATE TABLE IF NOT EXISTS user_profile_photos (
    user_id CHAR(36) PRIMARY KEY, photo MEDIUMBLOB NOT NULL, mime_type VARCHAR(30) NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_profile_photo_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`).catch((error) => { photoTable = undefined; throw error; });
  return photoTable;
}

export type Profile = { username: string; email: string; name: string; role: "administrator" | "school" | "student"; district: string; schoolName: string; schoolId: string; lrn: string; hasPhoto: boolean };

export async function readProfile(userId: string, executor: Pick<typeof db, "query"> = db): Promise<Profile | null> {
  const [rows] = await executor.query<any[]>(`SELECT u.username,u.email,u.full_name AS name,u.role,
    u.district,u.school_name AS schoolName,u.school_id AS schoolId,u.lrn,
    EXISTS(SELECT 1 FROM user_profile_photos p WHERE p.user_id=u.id) AS hasPhoto FROM users u WHERE u.id=?`, [userId]);
  const row = rows[0];
  return row ? { username: row.username, email: row.email, name: row.name, role: row.role, district: row.district || "", schoolName: row.schoolName || "", schoolId: row.schoolId || "", lrn: row.lrn || "", hasPhoto: Boolean(row.hasPhoto) } : null;
}

export class ProfileInputError extends Error {}
export function validateProfile(input: Record<string, unknown>, role: string) {
  if ("id" in input || "role" in input) throw new ProfileInputError("Account identity and access cannot be changed here.");
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const schoolId = typeof input.schoolId === "string" ? input.schoolId.trim() : "";
  const districtValue = typeof input.district === "string" ? input.district.trim() : "";
  const district = officialDistrict(districtValue);
  if (!name || name.length > 190) throw new ProfileInputError("Enter your name using 190 characters or fewer.");
  if (schoolId.length > 80) throw new ProfileInputError("School ID must be 80 characters or fewer.");
  if (!district && (districtValue || role !== "administrator")) throw new ProfileInputError("Select a district from the official list.");
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";
  const confirmPassword = typeof input.confirmPassword === "string" ? input.confirmPassword : "";
  if (newPassword || confirmPassword || currentPassword) {
    if (!currentPassword) throw new ProfileInputError("Enter your current password to change it.");
    if (newPassword.length < 8 || Buffer.byteLength(newPassword, "utf8") > 72) throw new ProfileInputError("Use a new password with at least 8 characters and no more than 72 UTF-8 bytes.");
    if (newPassword !== confirmPassword) throw new ProfileInputError("The new passwords do not match.");
    if (newPassword === currentPassword) throw new ProfileInputError("Choose a password different from your current password.");
  }
  let photo: { bytes: Buffer; mime: string } | null | undefined;
  if (input.photo === null) photo = null;
  else if (input.photo !== undefined) {
    if (typeof input.photo !== "string") throw new ProfileInputError("Choose a JPG, PNG, or WebP photo.");
    const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.photo);
    if (!match || match[2].length > 1_400_000) throw new ProfileInputError("Choose a JPG, PNG, or WebP photo smaller than 1 MB.");
    const bytes = Buffer.from(match[2], "base64"), mime = match[1];
    const valid = mime === "image/jpeg" ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
      : mime === "image/png" ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
    if (!valid || bytes.length > 1_048_576 || bytes.length < 16) throw new ProfileInputError("This photo is not a supported image. Please choose another photo.");
    photo = { bytes, mime };
  }
  return { name, schoolId, district, currentPassword, newPassword, photo };
}
