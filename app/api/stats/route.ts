import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizedDistrict } from "@/lib/district";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const schoolYearStart = `DATE(CONCAT(YEAR(CURRENT_DATE) - (MONTH(CURRENT_DATE) < 6), '-06-01'))`;
  const [[counts], [months], [districtRows], [schoolYearRows]] = await Promise.all([
    db.query<any[]>(`SELECT SUM(role='student') students,SUM(role='school') teachers,COUNT(DISTINCT CASE WHEN role='school' THEN school_name END) schools,(SELECT COUNT(*) FROM resources) resources,(SELECT COUNT(*) FROM resource_activity WHERE action='download') downloads,(SELECT COUNT(*) FROM resource_activity WHERE action='print') prints FROM users WHERE suspended=0`),
    db.query<any[]>(`SELECT DATE_FORMAT(created_at,'%Y-%m') month,SUM(action='download') downloads,SUM(action='print') prints FROM resource_activity WHERE created_at>=${schoolYearStart} GROUP BY month ORDER BY month`),
    db.query<any[]>(`SELECT district,school_name AS schoolName FROM users WHERE role='school' AND suspended=0 AND district IS NOT NULL`),
    db.query<any[]>(`SELECT CONCAT(YEAR(created_at)-(MONTH(created_at)<6),'-',YEAR(created_at)-(MONTH(created_at)<6)+1) schoolYear,COUNT(DISTINCT resource_id) resources,SUM(action='preview') previews,SUM(action='download') downloads,SUM(action='print') prints,COUNT(*) totalActivity,MIN(created_at) firstActivity,MAX(created_at) lastActivity FROM resource_activity GROUP BY schoolYear ORDER BY schoolYear DESC`),
  ]);

  const districtMap = new Map<string, { district: string; accounts: number; schoolNames: Set<string> }>();
  for (const row of districtRows) {
    const normalized = normalizedDistrict(row.district);
    if (!normalized.key) continue;
    const current = districtMap.get(normalized.key) || { district: normalized.label, accounts: 0, schoolNames: new Set<string>() };
    current.accounts += 1;
    if (row.schoolName) current.schoolNames.add(String(row.schoolName).trim().toUpperCase());
    districtMap.set(normalized.key, current);
  }

  const districtCounts = Array.from(districtMap.values())
    .map(({ district, accounts, schoolNames }) => ({ district, accounts, schools: schoolNames.size }))
    .sort((a, b) => a.district.localeCompare(b.district));
  const schoolYears = schoolYearRows.map((row) => ({
    schoolYear: String(row.schoolYear),
    resources: Number(row.resources || 0),
    previews: Number(row.previews || 0),
    downloads: Number(row.downloads || 0),
    prints: Number(row.prints || 0),
    totalActivity: Number(row.totalActivity || 0),
    firstActivity: row.firstActivity,
    lastActivity: row.lastActivity,
  }));
  const c = counts[0] || {};

  return NextResponse.json({
    students: Number(c.students || 0),
    teachers: Number(c.teachers || 0),
    districts: districtCounts.length,
    schools: Number(c.schools || 0),
    resources: Number(c.resources || 0),
    downloads: Number(c.downloads || 0),
    prints: Number(c.prints || 0),
    months,
    schoolYears,
    districtCounts,
    totalUsers: Number(c.students || 0) + Number(c.teachers || 0),
  });
}
