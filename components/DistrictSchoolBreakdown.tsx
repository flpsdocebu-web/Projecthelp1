"use client";

import { CSSProperties, useEffect, useRef, useState } from "react";
import { normalizedDistrict } from "@/lib/district";

type District = { district: string; accounts: number; schools: number };
type SchoolGroup = { key: string; district: string; schools: { key: string; schoolName: string; schoolIds: string[]; names: string[]; accounts: number; needsReview: boolean }[] };
const colors = ["#238d67", "#1d73b7", "#8c55b4", "#e09a25", "#d85b62", "#2a9eae", "#6674c8", "#75a83e"];
type AssignmentAudit = { summary: { source: string; sourceSchoolYear: string; totalAccounts: number; matchedAccounts: number; reviewAccounts: number; districtOfficeAccounts: number; unassignedOfficeAccounts: number }; issues: { district: string; schoolName: string; schoolId: string; role: string; accounts: number; reason: string; reference: string[] }[] };

export default function DistrictSchoolBreakdown({ districts }: { districts: District[] }) {
  const [metric, setMetric] = useState<"schools" | "accounts">("schools");
  const [search, setSearch] = useState("");
  const [groups, setGroups] = useState<SchoolGroup[]>([]);
  const [audit, setAudit] = useState<AssignmentAudit | null>(null);
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
      if (!controller.signal.aborted) { setGroups(result.districts); setAudit(result.audit); lastLoaded.current = Date.now(); }
    } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load school names."); }
    finally { if (!controller.signal.aborted) { request.current = null; setLoading(false); } }
  }
  const rows = [...districts];
  const unassigned = groups.find((group) => group.key === "UNASSIGNED");
  if (unassigned) rows.push({ district: unassigned.district, schools: unassigned.schools.filter((school) => !school.key.startsWith("review:") && !school.key.startsWith("office:")).length, accounts: unassigned.schools.reduce((sum, school) => sum + school.accounts, 0) });
  const maximum = Math.max(1, ...rows.map((district) => district[metric]));
  return <div className="district-school-breakdown">
    <div className="district-school-heading"><strong>Registered schools by district</strong><p>Select a district to see its schools and district office accounts. ID 000000 is excluded from school totals.</p></div>
    <div className="district-school-controls"><label>Show<select value={metric} onChange={(event) => setMetric(event.target.value as "schools" | "accounts")}><option value="schools">Schools</option><option value="accounts">Accounts</option></select></label><label>Find district<input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search district…" /></label></div>
    {rows.filter((district) => district.district.toLowerCase().includes(search.toLowerCase().trim())).map((district, index) => {
      const key = district.district === "District not assigned" ? "UNASSIGNED" : normalizedDistrict(district.district).key;
      const group = groups.find((entry) => entry.key === key);
      return <details className="district-school-entry" key={district.district} style={{ "--district-color": colors[index % colors.length] } as CSSProperties} onToggle={(event) => { if (event.currentTarget.open) void loadSchools(); }}>
        <summary><span><strong>{district.district}</strong><small>{district.schools.toLocaleString()} schools · {district.accounts.toLocaleString()} accounts</small><i><em style={{ width: `${district[metric] / maximum * 100}%` }} /></i></span><b aria-label={`${district[metric]} ${metric}`}>{district[metric].toLocaleString()}</b><span className="district-school-chevron" aria-hidden="true">⌄</span></summary>
        <div className="district-school-list">{loading && <p role="status">Loading registered schools…</p>}{error && <p role="alert">{error} <button type="button" onClick={() => void loadSchools()}>Retry</button></p>}{!loading && !error && <>{group?.schools.length ? <ul>{group.schools.map((school) => <li key={school.key}><strong>{school.schoolName}</strong><small>School ID: {school.schoolIds.join(", ") || "Not specified"}</small><small>{school.accounts.toLocaleString()} account{school.accounts === 1 ? "" : "s"}</small>{school.names.length > 1 && <small>Registered name variations: {school.names.join(" · ")}</small>}{school.key.startsWith("office:") && <em>District office · counted separately, not as a school.</em>}{school.needsReview && <em>Needs review: missing/invalid ID, conflicting district, or the same name registered with different IDs.</em>}{school.key.startsWith("review:") && <em>Not included in the school count.</em>}</li>)}</ul> : <p>No registered schools found in this district.</p>}</>}</div>
      </details>;
    })}
    {!rows.some((district) => district.district.toLowerCase().includes(search.toLowerCase().trim())) && <p className="district-school-empty">No matching districts.</p>}
    <p className="district-school-note">Each distinct entered School ID counts separately, except 000000, which identifies a district office. Without an ID, school name and district are a provisional fallback. Different IDs are not combined because of similar names. The same ID across districts counts once division-wide; district totals may overlap. Entries with neither a name nor ID remain uncounted. No accounts or activity records are merged or deleted.</p>
    <details className="school-assignment-audit" onToggle={(event) => { if (event.currentTarget.open) void loadSchools(); }}>
      <summary>Check accounts against school list</summary>
      {loading && <p role="status">Checking school assignments…</p>}
      {error && <p role="alert">{error} <button type="button" onClick={() => void loadSchools()}>Retry</button></p>}
      {!loading && !error && audit && <>
        <p>Active teacher/school and student accounts compared with {audit.summary.source} (SY {audit.summary.sourceSchoolYear}). This check does not change records. A school absent from this older reference is not automatically invalid.</p>
        <dl><div><dt>School assignments match</dt><dd>{audit.summary.matchedAccounts.toLocaleString()}</dd></div><div><dt>School assignments to review</dt><dd>{audit.summary.reviewAccounts.toLocaleString()}</dd></div><div><dt>District office accounts · ID 000000</dt><dd>{audit.summary.districtOfficeAccounts.toLocaleString()}</dd></div></dl>
        <button type="button" onClick={() => { lastLoaded.current = 0; void loadSchools(); }}>Refresh check</button>
        {audit.issues.length ? <ul>{audit.issues.map((issue, index) => <li key={`${issue.district}:${issue.schoolId}:${issue.role}:${index}`}><strong>{issue.schoolName}</strong><small>{issue.district} · ID {issue.schoolId || "Missing"} · {issue.accounts.toLocaleString()} {issue.role === "student" ? "student" : "teacher/school"} account{issue.accounts === 1 ? "" : "s"}</small><span>{issue.reason}</span>{issue.reference.map((reference) => <small key={reference}>Reference: {reference}</small>)}</li>)}</ul> : <p>No school-assignment differences found.</p>}
      </>}
    </details>
  </div>;
}
