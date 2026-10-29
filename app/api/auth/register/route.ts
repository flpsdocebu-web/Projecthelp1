import { NextResponse } from "next/server";
import { bcrypt, randomUUID } from "@/lib/auth";
import { db } from "@/lib/db";
import { officialDistrict } from "@/lib/district";
import { selectedRegistrationSchool } from "@/lib/registration-schools";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    let body;
    try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid registration information." }, { status: 400 }); }
    if (!body || typeof body !== "object" || Array.isArray(body) || !["school", "student"].includes(body.role)) return NextResponse.json({ error: "Select a school or student account." }, { status: 400 });
    const role = body.role, username = String(body.username || "").trim(), email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || ""), name = String(body.name || "").trim(), lrn = String(body.lrn || "").trim();
    const district = officialDistrict(String(body.district || ""));
    if (!username || !email || !name || password.length < 8) return NextResponse.json({ error: "Complete every required field. Password must contain at least 8 characters." }, { status: 400 });
    if (!district) return NextResponse.json({ error: "Select a valid district from the official list." }, { status: 400 });
    const school = selectedRegistrationSchool(body.schoolKey, district);
    if (!school) return NextResponse.json({ error: "Select a school from the list for your district. Refresh the page if you do not see the school dropdown." }, { status: 400 });
    if ((body.schoolName !== undefined && body.schoolName !== school.schoolName) || (body.schoolId !== undefined && body.schoolId !== school.schoolId)) return NextResponse.json({ error: "School details do not match the school list. Please select your school again." }, { status: 400 });
    if (role === "student" && !/^\d{12}$/.test(lrn)) return NextResponse.json({ error: "LRN must be 12 digits." }, { status: 400 });
    await db.execute(`INSERT INTO users(id,role,username,email,password_hash,full_name,district,school_name,school_id,lrn) VALUES(?,?,?,?,?,?,?,?,?,?)`, [randomUUID(), role, username, email, await bcrypt.hash(password, 12), name, school.district, school.schoolName, school.schoolId, role === "student" ? lrn : null]);
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error: any) {
    if (error?.code === "ER_DUP_ENTRY") return NextResponse.json({ error: "Username, email, or LRN is already registered." }, { status: 409 });
    console.error("Project HELPS registration failed", { code: error?.code || "REGISTRATION_ERROR" });
    return NextResponse.json({ error: "Registration service is temporarily unavailable." }, { status: 503, headers: { "Retry-After": "5" } });
  }
}
