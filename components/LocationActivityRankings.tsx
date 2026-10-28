"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { LocationRanking } from "@/lib/activity-rankings";

type Metric = "total" | "downloads" | "prints";
type RankingData = { schoolYear: string; districts: LocationRanking[]; schools: LocationRanking[]; summary: { downloads: number; prints: number; total: number; withoutDistrict: number; withoutSchool: number } };
const labels: Record<Metric, string> = { total: "Combined activity", downloads: "Downloads", prints: "Prints" };

export default function LocationActivityRankings({ currentSchoolYear, schoolYears }: { currentSchoolYear: string; schoolYears: string[] }) {
  const id = useId();
  const [schoolYear, setSchoolYear] = useState(currentSchoolYear);
  const [data, setData] = useState<RankingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"districts" | "schools">("districts");
  const [metric, setMetric] = useState<Metric>("total");
  const [search, setSearch] = useState("");
  const [limit, setLimit] = useState(10);
  const years = [...new Set([currentSchoolYear, schoolYear, ...schoolYears])].sort().reverse();
  const report = data?.schoolYear === schoolYear ? data : null;

  useEffect(() => {
    let controller: AbortController | undefined;
    const load = async () => {
      controller?.abort();
      controller = new AbortController();
      const signal = controller.signal;
      try {
        const response = await fetch(`/api/activity/rankings?schoolYear=${encodeURIComponent(schoolYear)}`, { cache: "no-store", signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to refresh activity rankings.");
        if (!signal.aborted) { setData(result); setError(""); }
      } catch (cause) {
        if (!signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to refresh activity rankings.");
      } finally { if (!signal.aborted) setLoading(false); }
    };
    setLoading(true); setError("");
    void load();
    const timer = window.setInterval(load, 30_000);
    return () => { window.clearInterval(timer); controller?.abort(); };
  }, [schoolYear]);
  useEffect(() => setLimit(10), [scope, metric, search, schoolYear]);

  const ranked = useMemo(() => {
    const order = (rows: LocationRanking[]) => [...rows].sort((a, b) => b[metric] - a[metric] || b.total - a.total || a.name.localeCompare(b.name) || a.key.localeCompare(b.key));
    return { districts: order(report?.districts || []), schools: order(report?.schools || []) };
  }, [report, metric]);
  const visible = ranked[scope].map((row, index) => ({ ...row, rank: index + 1 })).filter((row) => `${row.name} ${row.district} ${row.schoolId}`.toLowerCase().includes(search.trim().toLowerCase()));
  const maximum = Math.max(1, ...ranked[scope].map((row) => row[metric]));

  return <section className="location-rankings" aria-labelledby={`${id}-title`} aria-busy={loading}>
    <header className="location-rankings-heading"><div><small>LAS / Activity Sheets</small><h3 id={`${id}-title`}>District &amp; school activity</h3><p>See where learning resources are downloaded and printed most.</p></div><label>School year<select value={schoolYear} onChange={(event) => setSchoolYear(event.target.value)}>{years.map((year) => <option key={year} value={year}>SY {year}</option>)}</select></label></header>
    {error && <p className="location-ranking-error" role="alert">{error}{report && " Showing the last available figures."}</p>}
    {loading && !report ? <p className="location-ranking-message" role="status">Loading district and school activity…</p> : report && <>
      <div className="location-leaders">{(["districts", "schools"] as const).map((kind) => { const leader = ranked[kind][0]; return <article key={kind}><small>{kind === "districts" ? "Leading district" : "Leading school"}</small><strong>{leader && leader[metric] > 0 ? leader.name : "No activity yet"}</strong>{kind === "schools" && leader && <span>{leader.district || "District not specified"}</span>}<b>{(leader?.[metric] || 0).toLocaleString()} <span>{labels[metric].toLowerCase()}</span></b></article>; })}</div>
      <div className="location-ranking-controls"><div className="location-ranking-switch" role="group" aria-label="Rank by location"><button type="button" aria-pressed={scope === "districts"} onClick={() => setScope("districts")}>Districts <span>{report.districts.length}</span></button><button type="button" aria-pressed={scope === "schools"} onClick={() => setScope("schools")}>Schools <span>{report.schools.length}</span></button></div><label>Rank by<select value={metric} onChange={(event) => setMetric(event.target.value as Metric)}>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
      <label className="location-ranking-search"><span>Find a {scope === "districts" ? "district" : "school"}</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={scope === "districts" ? "Search district…" : "Search school, district, or school ID…"} /></label>
      <div className="location-ranking-table"><table><caption className="sr-only">{scope === "districts" ? "District" : "School"} rankings for SY {schoolYear}, ordered by {labels[metric].toLowerCase()}</caption><thead><tr><th scope="col">Rank</th><th scope="col">{scope === "districts" ? "District" : "School"}</th><th scope="col" aria-sort={metric === "downloads" ? "descending" : undefined}>Downloads</th><th scope="col" aria-sort={metric === "prints" ? "descending" : undefined}>Prints</th><th scope="col" aria-sort={metric === "total" ? "descending" : undefined}>Total</th></tr></thead><tbody>{visible.slice(0, limit).map((row) => <tr key={row.key}><td><span className={`location-rank location-rank-${row.rank <= 3 ? row.rank : "other"}`}>{row.rank}</span></td><th scope="row"><strong>{row.name}</strong>{scope === "schools" && <small>{row.district || "District not specified"}{row.schoolId && ` · ID ${row.schoolId}`}</small>}<span className="location-ranking-bar" aria-hidden="true"><i style={{ width: `${row[metric] / maximum * 100}%` }} /></span></th><td>{row.downloads.toLocaleString()}</td><td>{row.prints.toLocaleString()}</td><td><b>{row.total.toLocaleString()}</b></td></tr>)}{!visible.length && <tr><td colSpan={5} className="location-ranking-message">{search ? "No matching locations found." : "No recorded downloads or prints for this school year yet."}</td></tr>}</tbody></table></div>
      <footer className="location-ranking-footer"><span>Showing {Math.min(limit, visible.length)} of {visible.length} {scope} · refreshes every 30 seconds</span>{visible.length > limit && <button type="button" onClick={() => setLimit((value) => value + 10)}>Show more</button>}</footer>
      <p className="location-ranking-note">Counts are recorded download and print actions, including repeat use, based on users’ current school profiles. Previews are excluded.{report.summary.withoutDistrict > 0 && ` ${report.summary.withoutDistrict.toLocaleString()} actions have no district assigned.`}{report.summary.withoutSchool > 0 && ` ${report.summary.withoutSchool.toLocaleString()} actions have no school assigned.`}</p>
    </>}
  </section>;
}
