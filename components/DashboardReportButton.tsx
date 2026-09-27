"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

type SchoolYear = { schoolYear: string; resources: number; previews: number; downloads: number; prints: number; totalActivity: number };
type ReportData = { students: number; teachers: number; totalUsers: number; districts: number; schools: number; resources: number; downloads: number; prints: number; schoolYears: SchoolYear[] };

const empty: ReportData = { students: 0, teachers: 0, totalUsers: 0, districts: 0, schools: 0, resources: 0, downloads: 0, prints: 0, schoolYears: [] };

export default function DashboardReportButton() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ReportData>(empty);
  const generatedAt = useMemo(() => new Date().toLocaleString("en-PH", { dateStyle: "long", timeStyle: "short" }), [open]);

  useEffect(() => setMounted(true), []);
  function showReport() {
    setOpen(true);
    setLoading(true);
    fetch("/api/stats", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setData({ ...empty, ...payload, schoolYears: Array.isArray(payload.schoolYears) ? payload.schoolYears : [] }))
      .catch(() => setData(empty))
      .finally(() => setLoading(false));
  }
  function printReport() {
    document.body.classList.add("dashboard-report-printing");
    const cleanup = () => document.body.classList.remove("dashboard-report-printing");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
  }

  const modal = open ? <div className="dashboard-report-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section className="dashboard-report-dialog" role="dialog" aria-modal="true" aria-labelledby="dashboard-report-title">
    <header><div className="dashboard-report-brand"><img src="/project-helps-logo.png" alt="Project HELPS"/><div><small>Schools Division of Cebu Province</small><h2 id="dashboard-report-title">Project HELPS Dashboard Report</h2><p>Generated {generatedAt}</p></div></div><button type="button" onClick={() => setOpen(false)} aria-label="Close dashboard report">×</button></header>
    {loading ? <div className="dashboard-report-loading"><i/><strong>Preparing live dashboard report…</strong></div> : <div className="dashboard-report-content">
      <section className="dashboard-report-intro"><div><span>Official analytics summary</span><h3>Program performance at a glance</h3><p>Consolidated user, coverage, resource, and activity figures from the live Project HELPS database.</p></div><b>LIVE DATA</b></section>
      <div className="dashboard-report-cards"><div><small>Registered users</small><strong>{data.totalUsers.toLocaleString()}</strong><span>{data.students.toLocaleString()} students · {data.teachers.toLocaleString()} personnel</span></div><div><small>Program reach</small><strong>{data.schools.toLocaleString()}</strong><span>schools across {data.districts.toLocaleString()} districts</span></div><div><small>Learning resources</small><strong>{data.resources.toLocaleString()}</strong><span>PDF resources available</span></div><div><small>Recorded engagement</small><strong>{(data.downloads + data.prints).toLocaleString()}</strong><span>{data.downloads.toLocaleString()} downloads · {data.prints.toLocaleString()} prints</span></div></div>
      <section className="dashboard-report-years"><div><h3>School-year activity</h3><span>Automatically grouped June–May</span></div><table><thead><tr><th>School year</th><th>Resources</th><th>Previews</th><th>Downloads</th><th>Prints</th><th>Total</th></tr></thead><tbody>{data.schoolYears.length ? data.schoolYears.map((year, index) => <tr key={year.schoolYear}><td><strong>SY {year.schoolYear}</strong>{index === 0 && <small>Current</small>}</td><td>{year.resources.toLocaleString()}</td><td>{year.previews.toLocaleString()}</td><td>{year.downloads.toLocaleString()}</td><td>{year.prints.toLocaleString()}</td><td><b>{year.totalActivity.toLocaleString()}</b></td></tr>) : <tr><td colSpan={6}>No school-year activity recorded yet.</td></tr>}</tbody></table></section>
      <footer className="dashboard-report-signature"><div><span>Prepared through</span><strong>Project HELPS Analytics</strong></div><p>Helping Every Learner Progress and Succeed.</p></footer>
    </div>}
    <div className="dashboard-report-actions"><button type="button" onClick={() => setOpen(false)}>Close</button><button type="button" onClick={printReport} disabled={loading}>Print / Save as PDF</button></div>
  </section></div> : null;

  return <><button className="dashboard-report-button" type="button" onClick={showReport}><span>▤</span><div><small>Analytics</small><strong>Dashboard Report</strong></div></button>{mounted && modal ? createPortal(modal, document.body) : null}</>;
}
