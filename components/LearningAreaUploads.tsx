"use client";

import { useEffect, useId, useMemo, useState } from "react";
import type { UploadSummary } from "@/lib/learning-area-uploads";
import LearningAreaUploadTable from "@/components/LearningAreaUploadTable";
import LearningAreaUploadReport, { type UploadReportSnapshot } from "@/components/LearningAreaUploadReport";

export default function LearningAreaUploads() {
  const id = useId();
  const [summary, setSummary] = useState<UploadSummary | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0), [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState("");
  const [loadedAt, setLoadedAt] = useState("");
  const [report, setReport] = useState<UploadReportSnapshot | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    let inFlight = false;
    async function load() {
      if (inFlight) return;
      inFlight = true; setLoading(true);
      try {
        const response = await fetch("/api/resources/uploads-by-area", { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load upload counts.");
        if (!controller.signal.aborted) {
          setSummary(result); setError("");
          setLoadedAt(new Date().toISOString());
          setUpdatedAt(new Date().toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }));
        }
      } catch {
        if (!controller.signal.aborted) setError("Unable to refresh upload counts. Please try again.");
      } finally { inFlight = false; if (!controller.signal.aborted) setLoading(false); }
    }
    void load();
    const timer = window.setInterval(load, 30000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [refresh]);
  const visible = useMemo(() => summary?.areas.filter((area) => area.learningArea.toLowerCase().includes(search.trim().toLowerCase())) || [], [summary, search]);
  const visibleTotals = useMemo(() => visible.reduce((total, row) => ({ term1: total.term1 + row.term1, term2: total.term2 + row.term2, term3: total.term3 + row.term3, fullYear: total.fullYear + row.fullYear, other: total.other + row.other, total: total.total + row.total }), { term1: 0, term2: 0, term3: 0, fullYear: 0, other: 0, total: 0 }), [visible]);
  const hasOther = Boolean(summary?.totals.other);
  return <section className="learning-area-uploads" aria-labelledby={`${id}-title`}>
    <header><div><small>Uploaded learning resources</small><h3 id={`${id}-title`}>Uploads by learning area and term</h3><p>Current resource inventory · all upload dates</p></div>{summary && <span className="area-upload-total">{summary.totals.total.toLocaleString()} resources</span>}</header>
    {error && <p className="area-upload-error" role="alert">{error}{summary && " Showing the last successfully loaded counts."}</p>}
    {!summary && loading && <p role="status">Loading learning-area uploads…</p>}
    {summary && <>
      <div className="area-upload-term-totals">{([['Term 1', summary.totals.term1], ['Term 2', summary.totals.term2], ['Term 3', summary.totals.term3], ['Full Year', summary.totals.fullYear]] as const).map(([label, value]) => <div key={label}><small>{label}</small><strong>{value.toLocaleString()}</strong></div>)}</div>
      <div className="area-upload-controls"><label htmlFor={`${id}-search`}>Find learning area<input id={`${id}-search`} type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search learning areas…" /></label><div className="area-upload-control-buttons"><button type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)}>{loading ? "Refreshing…" : "Refresh counts"}</button><button type="button" className="area-upload-generate" disabled={loading || Boolean(error) || !loadedAt} onClick={() => setReport({ summary, loadedAt, generatedAt: new Date().toISOString() })}>Generate report</button></div></div>
      <LearningAreaUploadTable areas={visible} totals={visibleTotals} hasOther={hasOther} totalLabel={search.trim() ? "Visible total" : "Total uploads"} emptyMessage={summary.areas.length ? "No learning areas match your search." : "No resources have been uploaded yet."} />
      <p className="area-upload-note">Names follow the Learning Resources menu. Legacy Mathematics, SPED, and Kindergarten uploads use their current displayed labels.{hasOther && " Unrecognized terms remain visible in Other / unspecified."}</p>
      <div className="area-upload-status"><span>{visible.length} of {summary.areas.length} learning areas</span><span>Refreshes every 30 seconds{updatedAt ? ` · Updated ${updatedAt} Manila time` : ""}</span></div>
    </>}
    {!summary && !loading && error && <button type="button" onClick={() => setRefresh((value) => value + 1)}>Retry</button>}
    {report && <LearningAreaUploadReport snapshot={report} onClose={() => setReport(null)} />}
  </section>;
}
