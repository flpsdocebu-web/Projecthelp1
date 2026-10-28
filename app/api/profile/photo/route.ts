import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { ensureProfilePhotos } from "@/lib/profile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET() {
  const user = await currentUser();
  if (!user) return new NextResponse(null, { status: 401, headers });
  try {
    await ensureProfilePhotos();
    const [rows] = await db.query<any[]>("SELECT photo,mime_type FROM user_profile_photos WHERE user_id=?", [user.id]);
    if (!rows[0]) return new NextResponse(null, { status: 404, headers });
    return new NextResponse(new Uint8Array(rows[0].photo), { headers: { ...headers, "Content-Type": rows[0].mime_type, "Content-Security-Policy": "default-src 'none'; sandbox" } });
  } catch { return new NextResponse(null, { status: 503, headers }); }
}
