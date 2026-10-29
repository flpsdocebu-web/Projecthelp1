import catalog from "@/data/registration-schools.json";
import { normalizedDistrict } from "./district";
import type { SchoolCoverageRow } from "./school-coverage";

type AuditRow = SchoolCoverageRow & { role: "school" | "student" };
const nameKey = (value: unknown) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ").toUpperCase();
const references = catalog.schools.map((school) => ({ ...school, districtKey: normalizedDistrict(school.district || "").key }));
const byId = new Map<string, typeof references>();
for (const school of references) {
  const entries = byId.get(school.schoolId) || []; entries.push(school); byId.set(school.schoolId, entries);
}

export function auditSchoolAssignments(rows: AuditRow[]) {
  const summary = { source: catalog.source, sourceSchoolYear: catalog.sourceSchoolYear, totalAccounts: 0, matchedAccounts: 0, reviewAccounts: 0, districtOfficeAccounts: 0, unassignedOfficeAccounts: 0 };
  const issues: { district: string; schoolName: string; schoolId: string; role: string; accounts: number; reason: string; reference: string[] }[] = [];
  for (const row of rows) {
    const accounts = Number(row.accounts || 0), id = String(row.schoolId || "").trim();
    const district = normalizedDistrict(row.district || "");
    summary.totalAccounts += accounts;
    if (id === "000000") {
      summary.districtOfficeAccounts += accounts;
      if (!district.key) {
        summary.unassignedOfficeAccounts += accounts;
        issues.push({ district: "Not assigned", schoolName: String(row.schoolName || "District office"), schoolId: id, role: row.role, accounts, reason: "District office has no assigned district", reference: [] });
      }
      continue;
    }
    const matches = id ? byId.get(id) || [] : [];
    let reason = "";
    if (!id) reason = "School ID missing";
    else if (!matches.length) reason = "School ID not found in supplied school list";
    else if (matches.length > 1) reason = "School ID is shared by multiple entries in the source list";
    else if (!matches[0].districtKey || !matches[0].schoolName.trim()) reason = "Source school entry is incomplete";
    else if (matches[0].districtKey !== district.key) reason = "District differs from supplied school list";
    else if (nameKey(matches[0].schoolName) !== nameKey(row.schoolName)) reason = "School name differs from supplied school list";
    if (!reason) { summary.matchedAccounts += accounts; continue; }
    summary.reviewAccounts += accounts;
    issues.push({ district: district.label || "Not assigned", schoolName: String(row.schoolName || "Not specified"), schoolId: id, role: row.role, accounts, reason,
      reference: matches.map((school) => `${school.schoolName || "Name missing"} · ${normalizedDistrict(school.district || "").label || "District missing"} · ID ${school.schoolId}`),
    });
  }
  return { summary, issues: issues.sort((a, b) => a.district.localeCompare(b.district) || a.schoolName.localeCompare(b.schoolName)) };
}
