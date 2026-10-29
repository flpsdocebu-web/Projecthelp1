import { normalizedDistrict } from "./district";

export type SchoolCoverageRow = { district?: string | null; schoolName?: string | null; schoolId?: string | null; accounts: number | string };
// Format validation only: an official school registry is still needed to verify identity.
export function countedSchoolId(value: unknown) {
  const id = String(value || "").trim();
  return /^[0-9]{6}$/.test(id) && id !== "000000" ? id : null;
}
export function groupRegisteredSchools(rows: SchoolCoverageRow[]) {
  const groups = new Map<string, { key: string; district: string; schools: Map<string, { key: string; schoolName: string; schoolIds: Set<string>; names: Set<string>; accounts: number; needsReview: boolean }> }>();
  const idDistricts = new Map<string, Set<string>>();
  const nameIds = new Map<string, Set<string>>();
  for (const row of rows) {
    const schoolName = String(row.schoolName || "").trim() || "School name not specified";
    const district = normalizedDistrict(row.district || "");
    const key = district.key || "UNASSIGNED";
    const group = groups.get(key) || { key, district: district.label || "District not assigned", schools: new Map() };
    const schoolId = String(row.schoolId || "").trim();
    const validId = countedSchoolId(schoolId);
    const schoolKey = validId ? `id:${validId}` : `review:${schoolName.toUpperCase()}:${schoolId}`;
    const school = group.schools.get(schoolKey) || { key: schoolKey, schoolName, schoolIds: new Set<string>(), names: new Set<string>(), accounts: 0, needsReview: !validId };
    if (schoolId) school.schoolIds.add(schoolId);
    school.names.add(schoolName);
    if (validId) {
      const districts = idDistricts.get(validId) || new Set<string>(); districts.add(key); idDistricts.set(validId, districts);
      const nameKey = `${key}:${schoolName.toUpperCase()}`;
      const ids = nameIds.get(nameKey) || new Set<string>(); ids.add(validId); nameIds.set(nameKey, ids);
    }
    school.accounts += Number(row.accounts || 0);
    group.schools.set(schoolKey, school); groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({ key: group.key, district: group.district, schools: [...group.schools.values()].map((school) => ({
    ...school, schoolIds: [...school.schoolIds].sort(), names: [...school.names].sort(),
    needsReview: school.needsReview || [...school.schoolIds].some((id) => (idDistricts.get(id)?.size || 0) > 1) || [...school.names].some((name) => (nameIds.get(`${group.key}:${name.toUpperCase()}`)?.size || 0) > 1),
  })).sort((a, b) => a.schoolName.localeCompare(b.schoolName)) })).sort((a, b) => a.district.localeCompare(b.district));
}

export function schoolCoverageSummary(rows: SchoolCoverageRow[]) {
  const ids = new Set<string>();
  let reviewAccounts = 0;
  for (const row of rows) {
    const id = countedSchoolId(row.schoolId);
    if (id) ids.add(id); else reviewAccounts += Number(row.accounts || 0);
  }
  const districtCounts = groupRegisteredSchools(rows).filter((group) => group.key !== "UNASSIGNED").map((group) => ({
    district: group.district,
    accounts: group.schools.reduce((sum, school) => sum + school.accounts, 0),
    schools: group.schools.filter((school) => school.key.startsWith("id:")).length,
  }));
  return { schools: ids.size, reviewAccounts, districtCounts };
}
