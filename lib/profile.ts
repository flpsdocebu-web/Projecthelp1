import { db } from "./db";
import { officialDistrict } from "./district";

export type Profile = { username: string; email: string; name: string; role: "administrator" | "school" | "student"; district: string; schoolName: string; schoolId: string; lrn: string };

export async function readProfile(userId: string, executor: Pick<typeof db, "query"> = db): Promise<Profile | null> {
  const [rows] = await executor.query<any[]>(`SELECT u.username,u.email,u.full_name AS name,u.role,
    u.district,u.school_name AS schoolName,u.school_id AS schoolId,u.lrn FROM users u WHERE u.id=?`, [userId]);
  const row = rows[0];
  return row ? { username: row.username, email: row.email, name: row.name, role: row.role, district: row.district || "", schoolName: row.schoolName || "", schoolId: row.schoolId || "", lrn: row.lrn || "" } : null;
}

export class ProfileInputError extends Error {}
export function validateProfile(input: Record<string, unknown>, role: string) {
  if ("id" in input || "role" in input) throw new ProfileInputError("Account identity and access cannot be changed here.");
  if ("photo" in input) throw new ProfileInputError("Profile pictures are no longer supported. Refresh the page and try again.");
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
  return { name, schoolId, district, currentPassword, newPassword };
}
