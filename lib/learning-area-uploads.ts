export type LearningAreaUpload = { learningArea: string; term1: number; term2: number; term3: number; fullYear: number; other: number; total: number };
export type UploadSummary = { areas: LearningAreaUpload[]; totals: Omit<LearningAreaUpload, "learningArea"> };

export function learningAreaLabel(value: unknown) {
  const name = String(value || "").trim();
  if (name.toUpperCase() === "MATHEMATICS") return "MATHEMATICS - SPS";
  if (name.toUpperCase() === "SPED") return "SNED";
  if (name.toUpperCase() === "KINDERGARTEN") return "Kindergarten - Literacy";
  return name || "Learning area not specified";
}

const emptyCounts = () => ({ term1: 0, term2: 0, term3: 0, fullYear: 0, other: 0, total: 0 });
export function summarizeLearningAreaUploads(rows: { learningArea: unknown; term: unknown; uploads: number | string }[]): UploadSummary {
  const areas = new Map<string, LearningAreaUpload>();
  const totals = emptyCounts();
  for (const row of rows) {
    const count = Number(row.uploads);
    if (!Number.isSafeInteger(count) || count < 0) throw new Error("Invalid upload count.");
    const name = learningAreaLabel(row.learningArea), key = name.toUpperCase();
    const area = areas.get(key) || { learningArea: name, ...emptyCounts() };
    const term = String(row.term || "").trim();
    const match = term.match(/^(?:term\s*)?([123])$/i);
    const bucket = /^full\s*year$/i.test(term) ? "fullYear" : match ? `term${match[1]}` as "term1" | "term2" | "term3" : "other";
    area[bucket] += count; area.total += count;
    totals[bucket] += count; totals.total += count;
    areas.set(key, area);
  }
  return { areas: [...areas.values()].sort((a, b) => a.learningArea.localeCompare(b.learningArea)), totals };
}
