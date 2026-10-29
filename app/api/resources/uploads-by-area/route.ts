import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { summarizeLearningAreaUploads } from "@/lib/learning-area-uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET() {
  try {
    const [rows] = await db.query<any[]>(`SELECT learning_area AS learningArea,term,COUNT(*) AS uploads FROM resources GROUP BY learning_area,term ORDER BY learning_area,term`);
    return NextResponse.json(summarizeLearningAreaUploads(rows), { headers });
  } catch {
    return NextResponse.json({ error: "Upload counts are temporarily unavailable. Please try again." }, { status: 503, headers });
  }
}
