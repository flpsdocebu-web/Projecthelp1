import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID, requireAdministrator } from "@/lib/auth";
import { findDuplicateResourceNames } from "@/lib/resource-duplicates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const [rows] = await db.query<any[]>(
    `SELECT id,title,learning_area AS learningArea,grade_level AS gradeLevel,term,file_name AS fileName,file_size AS fileSize,created_at AS createdAt
     FROM resources ORDER BY learning_area,grade_level,title`,
  );
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

    const pdfFiles = files.filter((file) => file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf"));
    if (!pdfFiles.length) return NextResponse.json({ error: "Please select PDF files only." }, { status: 400 });

    for (const file of pdfFiles) {
      if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: `${file.name} exceeds the 15 MB database upload limit.` }, { status: 413 });
      }
    }

    const duplicates = await findDuplicateResourceNames(pdfFiles.map((file) => file.name), learningArea);
    if (duplicates.length) {
      return NextResponse.json({
        error: `Duplicate upload blocked. ${duplicates.join(", ")} already exists under ${learningArea}.`,
        code: "DUPLICATE_RESOURCE",
        duplicates,
        learningArea,
      }, { status: 409 });
    }

    const created = [];
    for (const file of pdfFiles) {
      const id = randomUUID();
      const title = file.name.replace(/\.pdf$/i, "");
      const buffer = Buffer.from(await file.arrayBuffer());
      await db.execute(
        `INSERT INTO resources(id,title,learning_area,grade_level,term,file_name,mime_type,file_size,pdf_data,created_by)
         VALUES(?,?,?,?,?,?,?,?,?,?)`,
        [id, title, learningArea, gradeLevel, term, file.name, "application/pdf", file.size, buffer, admin.id],
      );
      created.push({ id, title, learningArea, gradeLevel, term, fileName: file.name });
    }

    return NextResponse.json({ resources: created }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "PDF upload failed." }, { status: 500 });
  }
}
