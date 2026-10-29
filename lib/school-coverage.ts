import { normalizedDistrict } from "./district";

export type SchoolCoverageRow = { district?: string | null; schoolName?: string | null; schoolId?: string | null; accounts: number | string };
// Every distinct entered ID counts; format issues are advisory, not exclusions.
export function countedSchoolId(value: unknown) {
  const id = String(value || "").trim();
  return id || null;
}
function standardSchoolId(value: unknown) {
  const id = countedSchoolId(value);
  return Boolean(id && /^[0-9]{6}$/.test(id) && id !== "000000");
}
function schoolIdentity(row: SchoolCoverageRow) {
  const id = countedSchoolId(row.schoolId);
  if (id === "000000") return `office:${normalizedDistrict(row.district || "").key || "UNASSIGNED"}`;
  if (id) return `id:${id}`;
  const name = String(row.schoolName || "").trim().replace(/\s+/g, " ").toUpperCase();
  return name ? `name:${JSON.stringify([normalizedDistrict(row.district || "").key || "UNASSIGNED", name])}` : null;
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
    const schoolKey = schoolIdentity(row) || "review:unidentified";
    const school = group.schools.get(schoolKey) || { key: schoolKey, schoolName: schoolId === "000000" ? `${district.label || "Unassigned district"} District Office` : schoolName, schoolIds: new Set<string>(), names: new Set<string>(), accounts: 0, needsReview: schoolId === "000000" ? !district.key : !standardSchoolId(schoolId) };
    if (schoolId) school.schoolIds.add(schoolId);
    school.names.add(schoolName);
    if (validId && validId !== "000000") {
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
  const offices = new Set<string>();
  let districtOfficeAccounts = 0, unassignedDistrictOfficeAccounts = 0;
  let reviewAccounts = 0;
  for (const row of rows) {
    const id = countedSchoolId(row.schoolId);
    if (id === "000000") {
      const district = normalizedDistrict(row.district || "");
      districtOfficeAccounts += Number(row.accounts || 0);
      if (district.key) offices.add(district.key); else unassignedDistrictOfficeAccounts += Number(row.accounts || 0);
      continue;
    }
    const identity = schoolIdentity(row);
    if (identity) ids.add(identity);
    if (!standardSchoolId(id)) reviewAccounts += Number(row.accounts || 0);
  }
  const districtCounts = groupRegisteredSchools(rows).filter((group) => group.key !== "UNASSIGNED").map((group) => ({
    district: group.district,
    accounts: group.schools.reduce((sum, school) => sum + school.accounts, 0),
    schools: group.schools.filter((school) => !school.key.startsWith("review:") && !school.key.startsWith("office:")).length,
  }));
  return { schools: ids.size, reviewAccounts, districtCounts, districtOffices: offices.size, districtOfficeAccounts, unassignedDistrictOfficeAccounts };
}
