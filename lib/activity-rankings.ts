import { normalizedDistrict } from "./district";

export type ActivityLocation = { district?: string | null; schoolName?: string | null; schoolId?: string | null };
export type LocationActivity = ActivityLocation & { downloads: number | string; prints: number | string };
export type LocationRanking = { key: string; name: string; district: string; schoolId: string; downloads: number; prints: number; total: number };

const clean = (value?: string | null) => String(value || "").normalize("NFKC").trim().replace(/\s+/g, " ");
const nameKey = (value?: string | null) => clean(value).toUpperCase();

export function buildActivityRankings(rows: LocationActivity[], profiles: ActivityLocation[]) {
  const byId = new Map<string, ActivityLocation[]>();
  const byName = new Map<string, ActivityLocation[]>();
  for (const profile of profiles) {
    const id = nameKey(profile.schoolId), name = nameKey(profile.schoolName);
    if (id) byId.set(id, [...(byId.get(id) || []), profile]);
    if (name) byName.set(name, [...(byName.get(name) || []), profile]);
  }
  const districts = new Map<string, LocationRanking>();
  const schools = new Map<string, LocationRanking>();
  const summary = { downloads: 0, prints: 0, total: 0, withoutDistrict: 0, withoutSchool: 0 };
  function add(map: Map<string, LocationRanking>, item: Omit<LocationRanking, "downloads" | "prints" | "total">, downloads: number, prints: number) {
    const previous = map.get(item.key);
    map.set(item.key, { ...item, downloads: (previous?.downloads || 0) + downloads, prints: (previous?.prints || 0) + prints, total: (previous?.total || 0) + downloads + prints });
  }
  for (const row of rows) {
    const downloads = Number(row.downloads || 0), prints = Number(row.prints || 0);
    if (!Number.isFinite(downloads) || !Number.isFinite(prints) || downloads < 0 || prints < 0) throw new Error("Invalid activity totals");
    if (!downloads && !prints) continue;
    let district = normalizedDistrict(row.district || "");
    const candidates = nameKey(row.schoolId)
      ? byId.get(nameKey(row.schoolId)) || []
      : (byName.get(nameKey(row.schoolName)) || []).filter((profile) => !district.key || normalizedDistrict(profile.district || "").key === district.key);
    // Fill missing details only when the registered school can be identified unambiguously.
    const schoolIds = new Set(candidates.map((profile) => nameKey(profile.schoolId)).filter(Boolean));
    const districtKeys = new Set(candidates.map((profile) => normalizedDistrict(profile.district || "").key).filter(Boolean));
    const match = schoolIds.size <= 1 && districtKeys.size <= 1
      ? candidates.find((profile) => profile.schoolId && profile.district && profile.schoolName) || candidates[0]
      : undefined;
    if (!district.key && match) district = normalizedDistrict(match.district || "");
    const schoolId = clean(row.schoolId || match?.schoolId);
    const schoolName = clean(match?.schoolName || row.schoolName);
    const total = downloads + prints;
    summary.downloads += downloads; summary.prints += prints; summary.total += total;
    if (district.key) add(districts, { key: district.key, name: district.label, district: district.label, schoolId: "" }, downloads, prints);
    else summary.withoutDistrict += total;
    if (schoolId || schoolName) {
      const key = schoolId ? `id:${nameKey(schoolId)}` : `name:${district.key}|${nameKey(schoolName)}`;
      add(schools, { key, name: schoolName || `School ${schoolId}`, district: district.label, schoolId }, downloads, prints);
    } else summary.withoutSchool += total;
  }
  const ranked = (map: Map<string, LocationRanking>) => [...map.values()].sort((a, b) => b.total - a.total || b.downloads - a.downloads || a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
  return { districts: ranked(districts), schools: ranked(schools), summary };
}
