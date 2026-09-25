import { db } from "@/lib/db";

const normalized = (value: string) => value.trim().toLocaleLowerCase();

export async function findDuplicateResourceNames(fileNames: string[], learningArea: string) {
  const originals = new Map<string, string>();
  const duplicates = new Set<string>();

  for (const fileName of fileNames) {
    const key = normalized(fileName);
    if (!key) continue;
    if (originals.has(key)) duplicates.add(originals.get(key) || fileName.trim());
    else originals.set(key, fileName.trim());
  }

  const names = [...originals.keys()];
  if (names.length) {
    const placeholders = names.map(() => "?").join(",");
    const [rows] = await db.query<any[]>(
      `SELECT file_name FROM resources WHERE LOWER(TRIM(learning_area))=? AND LOWER(TRIM(file_name)) IN (${placeholders})`,
      [normalized(learningArea), ...names],
    );
    for (const row of rows) duplicates.add(row.file_name);
  }

  return [...duplicates].sort((a, b) => a.localeCompare(b));
}
