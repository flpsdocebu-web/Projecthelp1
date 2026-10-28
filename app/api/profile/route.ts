import { NextResponse } from "next/server";
import { bcrypt, currentSessionTokenHash, currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ProfileInputError, readProfile, validateProfile } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };

export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to view your profile." }, { status: 401, headers });
  try { return NextResponse.json({ profile: await readProfile(user.id) }, { headers }); }
  catch { return NextResponse.json({ error: "Your profile is temporarily unavailable. Please try again." }, { status: 503, headers }); }
}

export async function PATCH(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in to edit your profile." }, { status: 401, headers });
  if (request.headers.get("sec-fetch-site") === "cross-site" || !request.headers.get("content-type")?.startsWith("application/json")) return NextResponse.json({ error: "Invalid profile request." }, { status: 403, headers });
  let connection;
  try {
    const reader = request.body?.getReader();
    if (!reader) throw new ProfileInputError("No profile information was supplied.");
    const chunks: Uint8Array[] = []; let length = 0;
    while (true) { const chunk = await reader.read(); if (chunk.done) break; length += chunk.value.byteLength; if (length > 16_384) { await reader.cancel(); throw new ProfileInputError("The profile information is too large."); } chunks.push(chunk.value); }
    let body;
    try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch { throw new ProfileInputError("Invalid profile information."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new ProfileInputError("Invalid profile information.");
    const changes = validateProfile(body, user.role);
    connection = await db.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query<any[]>("SELECT password_hash,school_name AS schoolName FROM users WHERE id=? FOR UPDATE", [user.id]);
    if (!rows[0]) throw new ProfileInputError("This account is no longer available.");
    const schoolName = changes.schoolName === undefined ? rows[0].schoolName : changes.schoolName || null;
    if (changes.newPassword) {
      if (!await bcrypt.compare(changes.currentPassword, rows[0].password_hash)) throw new ProfileInputError("Your current password is incorrect.");
      const passwordHash = await bcrypt.hash(changes.newPassword, 12);
      await connection.execute("UPDATE users SET full_name=?,school_name=?,school_id=?,district=?,password_hash=? WHERE id=?", [changes.name, schoolName, changes.schoolId || null, changes.district, passwordHash, user.id]);
      const sessionHash = await currentSessionTokenHash();
      await connection.execute("DELETE FROM sessions WHERE user_id=? AND token_hash<>?", [user.id, sessionHash || ""]);
    } else await connection.execute("UPDATE users SET full_name=?,school_name=?,school_id=?,district=? WHERE id=?", [changes.name, schoolName, changes.schoolId || null, changes.district, user.id]);
    const profile = await readProfile(user.id, connection);
    await connection.commit();
    return NextResponse.json({ profile, passwordChanged: Boolean(changes.newPassword) }, { headers });
  } catch (error) {
    if (connection) { try { await connection.rollback(); } catch { /* The connection may already be unavailable. */ } }
    return NextResponse.json({ error: error instanceof ProfileInputError ? error.message : "Unable to save your profile. Please try again." }, { status: error instanceof ProfileInputError ? 400 : 503, headers });
  } finally { connection?.release(); }
}
