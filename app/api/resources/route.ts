import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { requireAdministrator, randomUUID } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET() {
  const [rows] = await db.query<any[]>(`SELECT id,title,learning_area AS learningArea,grade_level AS gradeLevel,term,file_name AS fileName,file_size AS fileSize,created_at AS createdAt FROM resources ORDER BY learning_area,grade_level,title`);
  return NextResponse.json({ resources: rows });
}

export async function POST(request: Request) {
  const admin = await requireAdministrator();
  if (!admin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  try {
    const data = await request.formData();
    const files = data.getAll("files").filter((item): item is File => item instanceof File);
    const learningArea = String(data.get("learningArea") || "").trim();
    const gradeLevel = String(data.get("gradeLevel") || "").trim();
    const term = String(data.get("term") || "").trim();

    if (!files.length || !learningArea || !gradeLevel || !term) {
      return NextResponse.json({ error: "Subject, grade, term, and PDF files are required." }, { status: 400 });
    }

    const prepared: Array<{ file: File; buffer: Buffer; hash: string }> = [];
    const batchHashes = new Set<string>();
    const duplicates = new Set<string>();

    for (const file of files) {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        return NextResponse.json({ error: `${file.name} is not a PDF file.` }, { status: 400 });
      }
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: `${file.name} exceeds the 15 MB database upload limit.` }, { status: 413 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const hash = createHash("sha256").update(buffer).digest("hex");
      if (batchHashes.has(hash)) duplicates.add(file.name);
      batchHashes.add(hash);
      prepared.push({ file, buffer, hash });
    }

    for (const item of prepared) {
      const [matches] = await db.query<any[]>(
        `SELECT file_name AS fileName FROM resources
         WHERE SHA2(pdf_data,256)=?
            OR (LOWER(file_name)=LOWER(?) AND learning_area=? AND grade_level=? AND term=?)
         LIMIT 1`,
        [item.hash, item.file.name, learningArea, gradeLevel, term],
      );
      if (matches.length) duplicates.add(item.file.name);
    }

    if (duplicates.size) {
      const names = [...duplicates];
      return NextResponse.json(
        { error: `Duplicate upload blocked: ${names.join(", ")}`, duplicates: names },
        { status: 409 },
      );
    }

    const created = [];
    for (const { file, buffer } of prepared) {
      const id = randomUUID();
      const title = file.name.replace(/\.pdf$/i, "");
      await db.execute(
        `INSERT INTO resources(id,title,learning_area,grade_level,term,file_name,mime_type,file_size,pdf_data,created_by) VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [id, title, learningArea, gradeLevel, term, file.name, "application/pdf", file.size, buffer, admin.id],
      );
      created.push({ id, title, learningArea, gradeLevel, term, fileName: file.name });
    }

    return NextResponse.json({ resources: created }, { status: 201 });
  } catch (error) {
    console.error("Project HELPS PDF upload failed", error);
    return NextResponse.json({ error: "PDF upload failed." }, { status: 500 });
  }
}
