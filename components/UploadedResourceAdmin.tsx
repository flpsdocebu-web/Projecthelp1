"use client";

import { useEffect, useMemo, useState } from "react";

type Resource = { id: string; title: string; learningArea: string; gradeLevel: string; term: string; fileName: string };

export default function UploadedResourceAdmin() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [message, setMessage] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const load = () => fetch("/api/resources", { cache: "no-store" }).then((response) => response.json()).then((data) => setResources(data.resources || [])).catch(() => setMessage("Resources could not be loaded."));

  useEffect(() => { load(); }, []);
  const groups = useMemo(() => {
    const map = new Map<string, Resource[]>();
    resources.forEach((resource) => map.set(resource.learningArea, [...(map.get(resource.learningArea) || []), resource]));
    return [...map.entries()];
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

  function toggle(subject: string) {
    setCollapsed((current) => {
      const next = new Set(current);
      next.has(subject) ? next.delete(subject) : next.add(subject);
      return next;
    });
  }

  return <article className="panel resource-admin-panel"><div className="resource-admin-head"><div><span className="eyebrow green">Resource management</span><h2>Uploaded Learning Resources</h2><p>Centralized PDFs sorted by subject.</p></div><button className="delete-all-button" disabled={!resources.length} onClick={removeAll}>Delete all resources</button></div>{message && <p className="resource-admin-message">{message}</p>}<div className="resource-subject-groups">{groups.map(([subject, items]) => <section className="resource-subject-group" key={subject}><button className="resource-subject-toggle" onClick={() => toggle(subject)}><span><strong>{subject}</strong><small>{items.length} uploaded PDFs</small></span><b>{collapsed.has(subject) ? "+" : "−"}</b></button>{!collapsed.has(subject) && <div className="resource-admin-list">{items.map((resource) => <div className="resource-admin-row" key={resource.id}><span className="pdf-admin-icon">PDF</span><div><strong>{resource.title}</strong><span>{resource.gradeLevel} · {resource.term}</span><small>{resource.fileName}</small></div><button onClick={() => remove(resource)}>Delete</button></div>)}</div>}</section>)}</div></article>;
}
