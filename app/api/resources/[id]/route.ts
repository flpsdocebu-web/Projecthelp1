import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { currentUser, requireAdministrator } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;
  const [rows] = await db.query<any[]>("SELECT file_name,mime_type,pdf_data FROM resources WHERE id=? LIMIT 1", [id]);
  const row = rows[0];
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });
  return new NextResponse(row.pdf_data, { headers: { "Content-Type": row.mime_type, "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.file_name)}`, "Cache-Control": "private, no-store" } });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAdministrator()) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  const { pin } = await request.json().catch(() => ({ pin: "" }));
  const expected = process.env.ADMIN_DELETE_PIN || "";
  const suppliedBuffer = Buffer.from(String(pin || ""));
  const expectedBuffer = Buffer.from(expected);
  if (!expected || suppliedBuffer.length !== expectedBuffer.length || !timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    return NextResponse.json({ error: "Incorrect security PIN." }, { status: 403 });
  }
  const { id } = await params;
  await db.execute("DELETE FROM resources WHERE id=?", [id]);
  return NextResponse.json({ ok: true });
}
