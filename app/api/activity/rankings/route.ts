import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/auth";
import { db } from "@/lib/db";
import { ActivityLocation, buildActivityRankings, LocationActivity } from "@/lib/activity-rankings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!await requireAdministrator()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const dateParts = new Intl.DateTimeFormat("en", { timeZone: "Asia/Manila", year: "numeric", month: "numeric" }).formatToParts(new Date());
  const year = Number(dateParts.find((part) => part.type === "year")?.value);
  const month = Number(dateParts.find((part) => part.type === "month")?.value);
  const currentStart = year - (month < 6 ? 1 : 0);
  const schoolYear = new URL(request.url).searchParams.get("schoolYear") || `${currentStart}-${currentStart + 1}`;
  const parts = /^(\d{4})-(\d{4})$/.exec(schoolYear);
  if (!parts || Number(parts[1]) < 2000 || Number(parts[1]) > currentStart || Number(parts[2]) !== Number(parts[1]) + 1) {
    return NextResponse.json({ error: "Choose a valid school year." }, { status: 400 });
  }
  const start = `${parts[1]}-06-01`, end = `${parts[2]}-06-01`;
  try {
    const [[rows], [profiles]] = await Promise.all([
      db.query<any[]>(`SELECT u.district, u.school_name AS schoolName, u.school_id AS schoolId,
        SUM(a.action='download') downloads, SUM(a.action='print') prints
        FROM resource_activity a LEFT JOIN users u ON u.id=a.user_id
        WHERE a.action IN ('download','print') AND a.created_at>=? AND a.created_at<?
        GROUP BY a.user_id,u.district,u.school_name,u.school_id`, [start, end]),
      db.query<any[]>(`SELECT DISTINCT district,school_name AS schoolName,school_id AS schoolId
        FROM users WHERE role='school' AND (NULLIF(TRIM(school_name),'') IS NOT NULL OR NULLIF(TRIM(school_id),'') IS NOT NULL)
        ORDER BY school_name,district,school_id`),
    ]);
    return NextResponse.json({ schoolYear, start, end, ...buildActivityRankings(rows as LocationActivity[], profiles as ActivityLocation[]), updatedAt: new Date().toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch {
    return NextResponse.json({ error: "Unable to load district and school activity. Please try again." }, { status: 503, headers: { "Cache-Control": "private, no-store" } });
  }
}
