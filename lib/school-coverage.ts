import { normalizedDistrict } from "./district";

export type SchoolCoverageRow = { district?: string | null; schoolName?: string | null; schoolId?: string | null; accounts: number | string };
export function groupRegisteredSchools(rows: SchoolCoverageRow[]) {
  const groups = new Map<string, { key: string; district: string; schools: Map<string, { schoolName: string; schoolIds: Set<string>; accounts: number }> }>();
  for (const row of rows) {
    const schoolName = String(row.schoolName || "").trim();
    if (!schoolName) continue;
    const district = normalizedDistrict(row.district || "");
    const key = district.key || "UNASSIGNED";
    const group = groups.get(key) || { key, district: district.label || "District not assigned", schools: new Map() };
    const schoolKey = schoolName.toUpperCase();
    const school = group.schools.get(schoolKey) || { schoolName, schoolIds: new Set<string>(), accounts: 0 };
    const schoolId = String(row.schoolId || "").trim();
    if (schoolId) school.schoolIds.add(schoolId);
    school.accounts += Number(row.accounts || 0);
    group.schools.set(schoolKey, school); groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ key: group.key, district: group.district, schools: [...group.schools.values()].map((school) => ({ ...school, schoolIds: [...school.schoolIds].sort() })).sort((a, b) => a.schoolName.localeCompare(b.schoolName)) })).sort((a, b) => a.district.localeCompare(b.district));
}
