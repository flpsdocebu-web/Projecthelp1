import catalog from "@/data/registration-schools.json";
import { officialDistrict } from "./district";

export type RegistrationSchool = { key: string; district: string; schoolName: string; schoolId: string };
export const REGISTRATION_SCHOOL_SOURCE = catalog.source;

// Keep source rows separate: repeated IDs are not permission to merge school names.
const schools: RegistrationSchool[] = catalog.schools.flatMap((row) => {
  const district = officialDistrict(row.district || "");
  if (!district || !row.schoolName.trim() || !row.schoolId.trim()) return [];
  return [{ key: row.key, district, schoolName: row.schoolName, schoolId: row.schoolId }];
});
const byKey = new Map(schools.map((school) => [school.key, school]));

export function registrationSchoolsForDistrict(value: string) {
  const district = officialDistrict(value);
  if (!district) return [];
  return schools.filter((school) => school.district === district)
    .sort((a, b) => a.schoolName.localeCompare(b.schoolName) || a.schoolId.localeCompare(b.schoolId));
}

export function selectedRegistrationSchool(key: unknown, districtValue: unknown) {
  if (typeof key !== "string" || typeof districtValue !== "string") return null;
  const district = officialDistrict(districtValue);
  const school = byKey.get(key);
  return school && school.district === district ? school : null;
}
