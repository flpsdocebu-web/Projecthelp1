"use client";

import { useEffect, useMemo, useState } from "react";

type Resource = { id: string; title: string; learningArea: string; gradeLevel: string; term: string; fileName: string };
const termOrder = ["Term 1", "Term 2", "Term 3"] as const;

function normalizedTerm(value: string) {
  const match = String(value || "").match(/[1-3]/);
  return match ? `Term ${match[0]}` : "Term 1";
}

export default function UploadedResourceAdmin() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [collapsedTerms, setCollapsedTerms] = useState<Set<string>>(new Set());
  const load = () => fetch("/api/resources", { cache: "no-store" }).then((response) => response.json()).then((data) => setResources(data.resources || [])).catch(() => setMessage("Resources could not be loaded."));

  useEffect(() => { load(); }, []);
  const termGroups = useMemo(() => {
    return termOrder.map((term) => {
      const termResources = resources.filter((resource) => normalizedTerm(resource.term) === term);
      const subjects = new Map<string, Resource[]>();
      termResources.forEach((resource) => subjects.set(resource.learningArea, [...(subjects.get(resource.learningArea) || []), resource]));
      return { term, resources: termResources, subjects: [...subjects.entries()].sort(([a], [b]) => a.localeCompare(b)) };
    });
  }, [resources]);

  async function remove(resource: Resource) {
    const pin = prompt(`Enter the administrator security PIN to delete “${resource.title}”.`);
    if (pin === null) return;
    if (!confirm(`Delete “${resource.title}” permanently?`)) return;
    const response = await fetch(`/api/resources/${resource.id}`, { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const result = await response.json().catch(() => ({}));
    if (response.ok) {
      setMessage(`Deleted ${resource.title}.`);
      load();
    } else setMessage(result.error || "Resource could not be deleted.");
  }

  async function removeAll() {
    const pin = prompt("Enter the administrator security PIN.");
    if (pin === null) return;
    if (!confirm(`Delete all ${resources.length} resources permanently?`)) return;
    const response = await fetch("/api/resources/delete-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pin }) });
    const result = await response.json();
    setMessage(response.ok ? "All uploaded resources were deleted." : result.error || "Deletion failed.");
    if (response.ok) load();
  }

  function toggle(groupKey: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  }

  function toggleTerm(term: string) {
    setCollapsedTerms((current) => {
      const next = new Set(current);
      next.has(term) ? next.delete(term) : next.add(term);
      return next;
    });
  }

  return <article className="panel resource-admin-panel"><div className="resource-admin-head"><div><span className="eyebrow green">Resource management</span><h2>Uploaded Learning Resources</h2><p>Centralized PDFs organized by term and subject.</p></div><button className="delete-all-button" disabled={!resources.length} onClick={removeAll}>Delete all resources</button></div>{message && <p className="resource-admin-message">{message}</p>}<div className="admin-term-list">{termGroups.map(({ term, resources: termResources, subjects }) => { const termCollapsed = collapsedTerms.has(term); return <section className={`admin-term-container ${termResources.length ? "" : "empty"} ${termCollapsed ? "collapsed" : ""}`} key={term}><button className="admin-term-toggle" onClick={() => toggleTerm(term)} aria-expanded={!termCollapsed}><span><small>Learning resource period</small><strong>{term}</strong></span><span className="admin-term-summary"><small>{termResources.length} PDF{termResources.length === 1 ? "" : "s"}</small><b>{termCollapsed ? "+" : "−"}</b></span></button>{!termCollapsed && (subjects.length ? <div className="resource-subject-groups">{subjects.map(([subject, items]) => { const groupKey = `${term}::${subject}`; return <section className="resource-subject-group" key={groupKey}><button className="resource-subject-toggle" onClick={() => toggle(groupKey)} aria-expanded={!collapsed.has(groupKey)}><span><strong>{subject}</strong><small>{items.length} uploaded PDF{items.length === 1 ? "" : "s"}</small></span><b>{collapsed.has(groupKey) ? "+" : "−"}</b></button>{!collapsed.has(groupKey) && <div className="resource-admin-list">{items.map((resource) => <div className="resource-admin-row" key={resource.id}><span className="pdf-admin-icon">PDF</span><div><strong>{resource.title}</strong><span>{resource.gradeLevel} · {normalizedTerm(resource.term)}</span><small>{resource.fileName}</small></div><button onClick={() => remove(resource)}>Delete</button></div>)}</div>}</section>})}</div> : <p>No learning resources uploaded for {term}.</p>)}</section>})}</div></article>;
}
