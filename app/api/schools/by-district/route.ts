import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/auth";
import { db } from "@/lib/db";
import { groupRegisteredSchools } from "@/lib/school-coverage";
import { auditSchoolAssignments } from "@/lib/school-assignment-audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  if (!await requireAdministrator()) return NextResponse.json({ error: "Administrator access required." }, { status: 403, headers });
  try {
    const [rows] = await db.query<any[]>(`SELECT role,district,school_name AS schoolName,school_id AS schoolId,COUNT(*) accounts
      FROM users WHERE role IN ('school','student') AND suspended=0
      GROUP BY role,district,school_name,school_id ORDER BY district,school_name,school_id`);
    return NextResponse.json({ districts: groupRegisteredSchools(rows.filter((row) => row.role === "school")), audit: auditSchoolAssignments(rows) }, { headers });
  } catch { return NextResponse.json({ error: "Unable to load the school list. Please try again." }, { status: 503, headers }); }
}
