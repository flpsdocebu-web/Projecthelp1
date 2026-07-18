import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPasswordResetEmail } from "@/lib/passwordResetEmail";
import { mailIsConfigured, sendMail } from "@/lib/mailer";

const publicMessage = "If the account exists, a password-reset link has been sent to its registered email address.";

export async function POST(request: Request) {
  try {
    if (!mailIsConfigured()) {
      return NextResponse.json(
        { error: "Password-reset email is not configured yet. Please contact the Project HELPS technical team." },
        { status: 503 },
      );
    }
    const body = await request.json();
    const identifier = String(body.identifier || "").trim().toLowerCase();
    if (!identifier) return NextResponse.json({ error: "Enter your username or email address." }, { status: 400 });

    const [users] = await db.query<any[]>(
      "SELECT id,email FROM users WHERE LOWER(username)=? OR LOWER(email)=? LIMIT 1",
      [identifier, identifier],
    );
    const user = users[0];
    if (!user) return NextResponse.json({ ok: true, message: publicMessage });

    const [recent] = await db.query<any[]>(
      "SELECT created_at FROM password_reset_tokens WHERE user_id=? AND created_at>DATE_SUB(NOW(),INTERVAL 2 MINUTE) LIMIT 1",
      [user.id],
    );
    if (recent.length) return NextResponse.json({ ok: true, message: publicMessage });

    const token = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");
    await db.execute("DELETE FROM password_reset_tokens WHERE user_id=? OR expires_at<NOW()", [user.id]);
    await db.execute(
      "INSERT INTO password_reset_tokens(token_hash,user_id,expires_at) VALUES(?,?,DATE_ADD(NOW(),INTERVAL 60 MINUTE))",
      [tokenHash, user.id],
    );

    const configuredUrl = process.env.APP_URL?.trim().replace(/\/$/, "");
    const origin = configuredUrl || new URL(request.url).origin;
    const email = createPasswordResetEmail({
      resetPasswordLink: `${origin}/reset-password/?token=${encodeURIComponent(token)}`,
    });
    try {
      await sendMail({ to: user.email, ...email });
    } catch (error) {
      await db.execute("DELETE FROM password_reset_tokens WHERE token_hash=?", [tokenHash]);
      throw error;
    }
    return NextResponse.json({ ok: true, message: publicMessage });
  } catch (error) {
    console.error("Project HELPS password-reset request failed", {
      code: (error as { code?: string })?.code || "EMAIL_SEND_ERROR",
    });
    return NextResponse.json(
      { error: "The reset email could not be sent. Please try again later or contact technical support." },
      { status: 503 },
    );
  }
}
