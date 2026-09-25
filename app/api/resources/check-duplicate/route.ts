import { NextResponse } from "next/server";
import { requireAdministrator } from "@/lib/auth";
import { findDuplicateResourceNames } from "@/lib/resource-duplicates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!await requireAdministrator()) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const learningArea = String(body.learningArea || "").trim();
    const fileNames = Array.isArray(body.fileNames)
      ? body.fileNames.map((value: unknown) => String(value || "").trim()).filter(Boolean)
      : [];

    if (!learningArea || !fileNames.length) {
      return NextResponse.json({ error: "Subject and PDF filenames are required." }, { status: 400 });
    }

    const duplicates = await findDuplicateResourceNames(fileNames, learningArea);
    return NextResponse.json({ duplicate: duplicates.length > 0, duplicates });
  } catch {
    return NextResponse.json({ error: "Duplicate check failed." }, { status: 500 });
  }
}
