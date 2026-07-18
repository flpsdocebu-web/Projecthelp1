"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const reportStats = [["Student users","0"],["Teacher users","0"],["PDF downloads","0"],["Printed files","0"],["Schools","0"],["Districts","0"],["Coverage","0%"]];

export default function DashboardReport() {
  const [open,setOpen] = useState(false);
  const [mounted,setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", escape);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", escape); };
  }, [open]);
  function downloadCsv() {
    const rows = [["Project HELPS Dashboard Report"],["Generated",new Date().toLocaleString()],[],["Metric","Total"],...reportStats];
    const csv = rows.map(row => row.map(cell => `"${String(cell).replaceAll('"','""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    link.download = "project-helps-dashboard-report.csv";
    link.click();
    URL.revokeObjectURL(link.href);
  }
  const dialog = open ? <div className="report-modal-backdrop" onMouseDown={() => setOpen(false)}><section className="report-dialog" role="dialog" aria-modal="true" aria-labelledby="report-title" onMouseDown={event => event.stopPropagation()}><header className="report-dialog-head"><span className="account-icon report-icon" aria-hidden="true">▤</span><div><small>Project HELPS analytics</small><h2 id="report-title">Dashboard Report</h2></div><button type="button" onClick={() => setOpen(false)} aria-label="Close report">×</button></header><div className="report-content"><div className="report-meta"><span>Report generated</span><strong>{new Date().toLocaleString()}</strong></div><div className="report-stat-grid">{reportStats.map(([label,value]) => <div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div><section><h3>Most downloaded resources</h3><div className="empty-report-state">No resource activity has been recorded yet.</div></section></div><footer className="report-actions"><button type="button" onClick={() => window.print()}>Print report</button><button type="button" onClick={downloadCsv}>Download CSV</button></footer></section></div> : null;
  return <><button type="button" onClick={() => setOpen(true)}>View report →</button>{mounted && dialog ? createPortal(dialog, document.body) : null}</>;
}
