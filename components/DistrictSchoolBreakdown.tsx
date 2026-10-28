"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { normalizedDistrict } from "@/lib/district";

type District = { district: string; accounts: number; schools: number };
type SchoolGroup = { key: string; district: string; schools: { schoolName: string; schoolIds: string[]; accounts: number }[] };
const colors = ["#238d67", "#1d73b7", "#8c55b4", "#e09a25", "#d85b62", "#2a9eae", "#6674c8", "#75a83e"];

export default function DistrictSchoolBreakdown({ districts }: { districts: District[] }) {
  const [metric, setMetric] = useState<"schools" | "accounts">("schools");
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState("");
  const lastLoaded = useRef(0), request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function loadSchools() {
    if (request.current || Date.now() - lastLoaded.current < 30000) return;
    const controller = new AbortController(); request.current = controller;
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/schools/by-district", { cache: "no-store", signal: controller.signal });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Unable to load school names.");
      if (!controller.signal.aborted) { setGroups(result.districts); lastLoaded.current = Date.now(); }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load school names."); }
    finally { if (!controller.signal.aborted) { request.current = null; setLoading(false); } }
  }
  const rows = [...districts];
  const unassigned = groups.find((group) => group.key === "UNASSIGNED");
  if (unassigned) rows.push({ district: unassigned.district, schools: unassigned.schools.length, accounts: unassigned.schools.reduce((sum, school) => sum + school.accounts, 0) });
  const maximum = Math.max(1, ...rows.map((district) => district[metric]));
  return <div className="district-school-breakdown">
    <div className="district-school-heading"><strong>Registered schools by district</strong><p>Select a district to see its school names and School IDs.</p></div>
    <div className="district-school-controls"><label>Show<select value={metric} onChange={(event) => setMetric(event.target.value as "schools" | "accounts")}><option value="schools">Schools</option><option value="accounts">Accounts</option></select></label><label>Find district<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search district…" /></label></div>
    {rows.filter((district) => district.district.toLowerCase().includes(search.toLowerCase().trim())).map((district, index) => {
      const key = district.district === "District not assigned" ? "UNASSIGNED" : normalizedDistrict(district.district).key;
      const group = groups.find((entry) => entry.key === key);
      return <details className="district-school-entry" key={district.district} style={{ "--district-color": colors[index % colors.length] } as CSSProperties} onToggle={(event) => { if (event.currentTarget.open) void loadSchools(); }}>
        <summary><span><strong>{district.district}</strong><small>{district.schools.toLocaleString()} schools · {district.accounts.toLocaleString()} accounts</small><i><em style={{ width: `${district[metric] / maximum * 100}%` }} /></i></span><b aria-label={`${district[metric]} ${metric}`}>{district[metric].toLocaleString()}</b><span className="district-school-chevron" aria-hidden="true">⌄</span></summary>
        <div className="district-school-list">{loading && <p role="status">Loading registered schools…</p>}{error && <p role="alert">{error} <button type="button" onClick={() => void loadSchools()}>Retry</button></p>}{!loading && !error && <>{group?.schools.length ? <ul>{group.schools.map((school) => <li key={school.schoolName}><strong>{school.schoolName}</strong><small>School ID: {school.schoolIds.join(", ") || "Not specified"}</small>{school.schoolIds.length > 1 && <em>Multiple School IDs registered under this name</em>}</li>)}</ul> : <p>No registered school names found in this district.</p>}</>}</div>
      </details>;
    })}
    {!rows.some((district) => district.district.toLowerCase().includes(search.toLowerCase().trim())) && <p className="district-school-empty">No matching districts.</p>}
    <p className="district-school-note">Counts use registered school names within each district. School lists include active teacher/school accounts.</p>
  </div>;
}
