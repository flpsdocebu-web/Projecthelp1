import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { bcrypt } from "@/lib/auth";
import { db } from "@/lib/db";

export async function POST(request: Request) {
  const connection = await db.getConnection();
  try {
    const body = await request.json();
    const token = String(body.token || "");
    const password = String(body.password || "");
    if (!token || password.length < 8) {
      return NextResponse.json({ error: "A valid reset link and an 8-character password are required." }, { status: 400 });
    }
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await connection.beginTransaction();
    const [rows] = await connection.query<any[]>(
      "SELECT user_id FROM password_reset_tokens WHERE token_hash=? AND used_at IS NULL AND expires_at>NOW() FOR UPDATE",
      [tokenHash],
    );
    const reset = rows[0];
    if (!reset) {
      await connection.rollback();
      return NextResponse.json({ error: "This password-reset link is invalid, expired, or already used." }, { status: 400 });
    }
    await connection.execute("UPDATE users SET password_hash=?,suspended=0 WHERE id=?", [
      await bcrypt.hash(password, 12),
      reset.user_id,
    ]);
    await connection.execute("UPDATE password_reset_tokens SET used_at=NOW() WHERE token_hash=?", [tokenHash]);
    await connection.execute("DELETE FROM sessions WHERE user_id=?", [reset.user_id]);
    await connection.commit();
    return NextResponse.json({ ok: true });
  } catch (error) {
    await connection.rollback();
    console.error("Project HELPS password reset failed", {
      code: (error as { code?: string })?.code || "PASSWORD_RESET_ERROR",
    });
    return NextResponse.json({ error: "The password could not be reset. Please try again." }, { status: 500 });
  } finally {
    connection.release();
  }
}
