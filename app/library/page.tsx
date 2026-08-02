"use client";

import { useEffect, useMemo, useState } from "react";
import Header from "@/components/Header";
import ResourceCard from "@/components/ResourceCard";

type LibraryResource = { id?: string; grade: string; subject: string; title: string; pages: number; color: string; uploaded?: boolean; term?: string };
type UploadRecord = { id: string; title: string; learningArea: string; gradeLevel: string; term: string; fileName: string };

const starter: LibraryResource[] = [];
const termOrder = ["Term 1", "Term 2", "Term 3"];
const uploadColors = ["linear-gradient(145deg,#16765c,#45aa7c)", "linear-gradient(145deg,#145a8f,#3c91c8)", "linear-gradient(145deg,#74509b,#ad78c7)", "linear-gradient(145deg,#a86718,#dfa63c)"];
const normalizeTerm = (value?: string) => {
  const match = String(value || "").match(/[123]/);
  return match ? `Term ${match[0]}` : "Term 1";
};

export default function Library() {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("All subjects");
  const [grade, setGrade] = useState("All grade levels");
  const [term, setTerm] = useState("All terms");
  const [uploaded, setUploaded] = useState<LibraryResource[]>([]);

  function loadUploads() {
    fetch("/api/resources", { cache: "no-store" })
      .then((response) => response.json())
      .then(({ resources = [] }: { resources: UploadRecord[] }) => setUploaded(resources.map((record, index) => ({
        id: record.id,
        grade: record.gradeLevel,
        subject: record.learningArea,
        title: record.title,
        pages: 0,
        term: normalizeTerm(record.term),
        uploaded: true,
        color: uploadColors[index % uploadColors.length],
      }))))
      .catch(() => setUploaded([]));
  }

  useEffect(() => { loadUploads(); }, []);

  const resources = useMemo(() => [...uploaded, ...starter], [uploaded]);
  const subjects = useMemo(() => ["All subjects", ...Array.from(new Set(resources.map((resource) => resource.subject))).sort((a, b) => a.localeCompare(b))], [resources]);
  const grades = useMemo(() => ["All grade levels", ...Array.from(new Set(resources.map((resource) => resource.grade))).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))], [resources]);
  const filtered = useMemo(() => resources.filter((resource) =>
    (subject === "All subjects" || resource.subject === subject) &&
    (grade === "All grade levels" || resource.grade === grade) &&
    (term === "All terms" || normalizeTerm(resource.term) === term) &&
    `${resource.title} ${resource.grade} ${resource.subject} ${resource.term || ""}`.toLowerCase().includes(query.toLowerCase())), [resources, query, subject, grade, term]);
  const visibleTerms = term === "All terms" ? termOrder : [term];
  const grouped = useMemo(() => Array.from(new Set(filtered.map((resource) => resource.subject))).sort((a, b) => a.localeCompare(b)).map((name) => ({
    name,
    resources: filtered.filter((resource) => resource.subject === name).sort((a, b) => a.title.localeCompare(b.title)),
  })), [filtered]);

  function clearFilters() { setQuery(""); setSubject("All subjects"); setGrade("All grade levels"); setTerm("All terms"); }

  return <main className="subpage"><Header compact/>
    <section className="library-hero"><span className="eyebrow green">Resource library</span><h1>Find the right Learning Activity Sheet</h1><p>Browse resources arranged clearly by learning area and term.</p><div className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search for a topic, grade, term, or keyword..."/></div></section>
    <section className="library-content">
      <aside><strong>Filter resources</strong><label>Learning area<select value={subject} onChange={(event) => setSubject(event.target.value)}>{subjects.map((option) => <option key={option}>{option}</option>)}</select></label><label>Grade level<select value={grade} onChange={(event) => setGrade(event.target.value)}>{grades.map((option) => <option key={option}>{option}</option>)}</select></label><label>Term<select value={term} onChange={(event) => setTerm(event.target.value)}><option>All terms</option>{termOrder.map((option) => <option key={option}>{option}</option>)}</select></label><button className="btn soft" onClick={clearFilters}>Clear filters</button></aside>
      <div className="results"><div className="results-head"><div><strong>{filtered.length} resources</strong><span> arranged by learning area and term</span>{uploaded.length > 0 && <small className="library-sync-note">● {uploaded.length} administrator upload{uploaded.length === 1 ? "" : "s"} synced</small>}</div><span className="alphabetical-sort">A–Z by subject</span></div>
        {grouped.length ? <div className="learning-area-list">{grouped.map((group) => <section className="learning-area-section" key={group.name}>
          <header className="learning-area-heading"><div><span>Learning Area</span><h2>{group.name}</h2></div><small>{group.resources.length} resource{group.resources.length === 1 ? "" : "s"}</small></header>
          <div className="term-container-list">{visibleTerms.map((termName) => {
            const termResources = group.resources.filter((resource) => normalizeTerm(resource.term) === termName);
            return <section className={`term-resource-container ${termResources.length ? "" : "empty"}`} key={termName}>
              <header><div><span>Learning period</span><h3>{termName}</h3></div><strong>{termResources.length} resource{termResources.length === 1 ? "" : "s"}</strong></header>
              {termResources.length ? <div className="resource-grid">{termResources.map((resource) => <ResourceCard item={resource} key={resource.id || resource.title}/>)}</div> : <p>No Learning Activity Sheets uploaded for {termName}.</p>}
            </section>;
          })}</div>
        </section>)}</div> : <div className="library-empty-state"><strong>No learning resources found</strong><span>Try changing the search or filters.</span></div>}
      </div>
    </section>
  </main>;
}
