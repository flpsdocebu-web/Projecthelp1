import { NextResponse } from "next/server";
import { requireAdministrator, bcrypt, randomUUID } from "@/lib/auth";
import { db } from "@/lib/db";
export async function GET() { if (!await requireAdministrator())
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); const [rows] = await db.query<any[]>(`SELECT u.id,u.username,u.email,u.full_name AS name,u.role,COALESCE(u.district,(SELECT s.district FROM users s WHERE s.role='school' AND s.school_name=u.school_name AND s.district IS NOT NULL LIMIT 1)) district,u.school_name AS schoolName,u.school_id AS schoolId,u.lrn,u.suspended,u.created_at AS createdAt,EXISTS(SELECT 1 FROM sessions active_session WHERE active_session.user_id=u.id AND active_session.expires_at>NOW() AND active_session.created_at>=DATE_SUB(NOW(),INTERVAL 90 SECOND)) AS online FROM users u ORDER BY u.role,district,u.full_name`); return NextResponse.json({ users: rows }); }
export async function POST(request: Request) { if (!await requireAdministrator())
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); try {
    const b = await request.json();
    if (!b.name || !b.username || !b.email || String(b.password || "").length < 8)
        return NextResponse.json({ error: "Name, email, username, and an 8-character password are required." }, { status: 400 });
    await db.execute("INSERT INTO users(id,role,username,email,password_hash,full_name) VALUES(?,?,?,?,?,?)", [randomUUID(), "administrator", b.username, b.email, await bcrypt.hash(b.password, 12), b.name]);
    return NextResponse.json({ ok: true }, { status: 201 });
}
catch {
    return NextResponse.json({ error: "Account could not be created." }, { status: 400 });
} }
export async function PATCH(request: Request) { const admin = await requireAdministrator(); if (!admin)
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); const b = await request.json(); if (b.id === admin.id && b.action === "suspend")
    return NextResponse.json({ error: "You cannot suspend your own session." }, { status: 400 }); if (b.action === "suspend")
    await db.execute("UPDATE users SET suspended=? WHERE id=?", [Boolean(b.suspended), b.id]);
else if (b.action === "reset") {
    if (String(b.password || "").length < 8)
        return NextResponse.json({ error: "Password must have at least 8 characters." }, { status: 400 });
    await db.execute("UPDATE users SET password_hash=? WHERE id=?", [await bcrypt.hash(b.password, 12), b.id]);
    await db.execute("DELETE FROM sessions WHERE user_id=?", [b.id]);
} return NextResponse.json({ ok: true }); }
export async function DELETE(request: Request) { const admin = await requireAdministrator(); if (!admin)
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 }); const { id } = await request.json(); if (id === admin.id)
    return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 }); await db.execute("DELETE FROM users WHERE id=?", [id]); return NextResponse.json({ ok: true }); }
