"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import ResourceCard from "@/components/ResourceCard";
import AccountGreeting from "@/components/AccountGreeting";
import { learningAreaLabel, resourceTermLabel } from "@/lib/learning-area-uploads";

type LibraryResource = { id?: string; grade: string; subject: string; title: string; pages: number; color: string; uploaded?: boolean; term?: string };
type UploadRecord = { id: string; title: string; learningArea: string; gradeLevel: string; term: string; fileName: string };

const starter: LibraryResource[] = [];
const termOrder = ["Term 1", "Term 2", "Term 3", "Full Year"];
const uploadColors = ["linear-gradient(145deg,#16765c,#45aa7c)", "linear-gradient(145deg,#145a8f,#3c91c8)", "linear-gradient(145deg,#74509b,#ad78c7)", "linear-gradient(145deg,#a86718,#dfa63c)"];
const normalizeTerm = resourceTermLabel;
const normalizeSubject = learningAreaLabel;
const normalizeGrade = (value?: string) => String(value || "").trim().toUpperCase() === "SPED" ? "SNED" : String(value || "").trim();

export default function Library() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [grade, setGrade] = useState("All grade levels");
  const [term, setTerm] = useState("All terms");
  const [uploaded, setUploaded] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("subject")) setSubject(normalizeSubject(params.get("subject")));
    if (params.get("term")) setTerm(normalizeTerm(params.get("term")));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function loadUploads() {
      if (inFlight) return;
      inFlight = true; setLoading(true);
      try {
        const response = await fetch("/api/resources", { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !Array.isArray(result.resources)) throw new Error("Resource inventory unavailable.");
        if (controller.signal.aborted) return;
        setUploaded((result.resources as UploadRecord[]).map((record, index) => ({
        id: record.id,
        grade: normalizeGrade(record.gradeLevel),
        subject: normalizeSubject(record.learningArea),
        title: record.title,
        pages: 0,
        term: normalizeTerm(record.term),
        uploaded: true,
        color: uploadColors[index % uploadColors.length],
        })));
        setError("");
      } catch { if (!controller.signal.aborted) setError("Learning Resources could not be refreshed. This is a loading error, not confirmation that a term has no uploads. Please retry."); }
      finally { inFlight = false; if (!controller.signal.aborted) setLoading(false); }
    }
    void loadUploads();
    const timer = window.setInterval(loadUploads, 30000);
    window.addEventListener("focus", loadUploads);
    return () => { controller.abort(); window.clearInterval(timer); window.removeEventListener("focus", loadUploads); };
  }, [refresh]);

  const resources = useMemo(() => [...uploaded, ...starter], [uploaded]);
  const subjects = useMemo(() => ["All subjects", ...Array.from(new Set(["ACADEMICS", "Kindergarten - Literacy", "Kindergarten - Numeracy", "MAKABANSA", "MATHEMATICS - REGULAR", "MATHEMATICS - SPS", "Reading and Literacy and Language", "SNED", "SNED - Care Skills", "SNED - Life Skills", "TLE - Agriculture and Fishery Arts", "TLE - Family and Consumer Science", "TLE - Industrial Arts", "TLE - Information and Communications Technology", ...resources.map((resource) => resource.subject)])).sort((a, b) => a.localeCompare(b))], [resources]);
  const grades = useMemo(() => ["All grade levels", ...Array.from(new Set(["SNED", ...resources.map((resource) => resource.grade)])).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))], [resources]);
  const filtered = useMemo(() => resources.filter((resource) =>
    (subject === "All subjects" || resource.subject === subject) &&
    (grade === "All grade levels" || resource.grade === grade) &&
    (term === "All terms" || normalizeTerm(resource.term) === term) &&
    `${resource.title} ${resource.grade} ${resource.subject} ${resource.term || ""}`.toLowerCase().includes(query.toLowerCase())), [resources, query, subject, grade, term]);
  const availableTerms = resources.some((resource) => resource.term === "Other / unspecified") ? [...termOrder,"Other / unspecified"] : termOrder;
  const visibleTerms = term === "All terms" ? availableTerms : [term];
  const grouped = useMemo(() => Array.from(new Set(filtered.map((resource) => resource.subject))).sort((a, b) => a.localeCompare(b)).map((name) => ({
    name,
    resources: filtered.filter((resource) => resource.subject === name).sort((a, b) => a.title.localeCompare(b.title)),
  })), [filtered]);

  function clearFilters() { setQuery(""); setSubject("All subjects"); setGrade("All grade levels"); setTerm("All terms"); }

  return <main className="subpage"><Header compact/><AccountGreeting/>
    <section className="library-hero"><span className="eyebrow green">Resource library</span><h1>Find the right Learning Activity Sheet</h1><p>Browse resources arranged clearly by learning area and term.</p><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a topic, grade, term, or keyword..."/></div></section>
    <section className="library-content">
      <aside><strong>Filter resources</strong><label>Learning area<select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((option) => <option key={option}>{option}</option>)}</select></label><label>Grade level<select value={grade} onChange={(event) => setGrade(event.target.value)}>{grades.map((option) => <option key={option}>{option}</option>)}</select></label><label>Term<select value={term} onChange={(event) => setTerm(event.target.value)}><option>All terms</option>{availableTerms.map((option) => <option key={option}>{option}</option>)}</select></label><button className="btn soft" onClick={clearFilters}>Clear filters</button><button className="btn soft" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>{loading ? "Refreshing…" : "Refresh resources"}</button></aside>
      <div className="results"><div className="results-head"><div><strong>{error ? "Counts unavailable" : loading && !uploaded.length ? "Loading resources…" : `${filtered.length} resources`}</strong><span> · {grade} · {term}</span>{!error && uploaded.length > 0 && <small className="library-sync-note">● {uploaded.length} administrator upload{uploaded.length === 1 ? "" : "s"} synced · refreshes every 30 seconds</small>}</div><span className="alphabetical-sort">A–Z by subject</span></div>
        {error && <p className="area-upload-error" role="alert">{error}</p>}
        {loading && !uploaded.length && <p role="status">Loading learning resources…</p>}
        {!error && grouped.length ? <div className="learning-area-list">{grouped.map((group) => <section className="learning-area-section" key={group.name}>
          <header className="learning-area-heading"><div><span>Learning Area</span><h2>{group.name}</h2></div><small>{group.resources.length} resource{group.resources.length === 1 ? "" : "s"}</small></header>
          <div className="term-container-list">{visibleTerms.map((termName) => {
            const termResources = group.resources.filter((resource) => normalizeTerm(resource.term) === termName);
            return <section className={`term-resource-container ${termResources.length ? "" : "empty"}`} key={termName}>
              <header><div><span>Learning period</span><h3>{termName}</h3></div><strong>{termResources.length} resource{termResources.length === 1 ? "" : "s"}</strong></header>
              {termResources.length ? <div className="resource-grid">{termResources.map((resource) => <ResourceCard item={resource} key={resource.id || resource.title}/>)}</div> : <p>No Learning Activity Sheets uploaded for {termName}.</p>}
            </section>;
          })}</div>
        </section>)}</div> : !loading && !error ? <div className="library-empty-state"><strong>No learning resources found</strong><span>Try changing the search or filters.</span></div> : null}
      </div>
    </section>
  </main>;
}
