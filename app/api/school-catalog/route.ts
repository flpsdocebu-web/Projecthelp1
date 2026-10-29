import { NextResponse } from "next/server";
import { officialDistrict } from "@/lib/district";
import { registrationSchoolsForDistrict } from "@/lib/registration-schools";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const district = officialDistrict(new URL(request.url).searchParams.get("district") || "");
  if (!district) return NextResponse.json({ error: "Select a district from the list." }, { status: 400 });
  return NextResponse.json({ district, schools: registrationSchoolsForDistrict(district) }, { headers: { "Cache-Control": "no-store" } });
}
