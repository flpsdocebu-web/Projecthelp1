"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { UploadSummary } from "@/lib/learning-area-uploads";
import LearningAreaUploadTable from "@/components/LearningAreaUploadTable";

export type UploadReportSnapshot = { summary: UploadSummary; generatedAt: string; loadedAt: string };
const dateLabel = (value: string) => new Date(value).toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" });
export default function LearningAreaUploadReport({ snapshot, onClose }: { snapshot: UploadReportSnapshot; onClose: () => void }) {
  const id = useId();
  const dialog = useRef<HTMLElement>(null), close = useRef(onClose);
  close.current = onClose;
  const [printing, setPrinting] = useState(false), [error, setError] = useState("");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; dialog.current?.focus();
    const cleanupPrint = () => { document.body.classList.remove("learning-area-report-printing"); setPrinting(false); };
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab") return;
      const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") || [])];
      const first = buttons[0], last = buttons[buttons.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keys); window.addEventListener("afterprint", cleanupPrint);
    return () => { document.removeEventListener("keydown", keys); window.removeEventListener("afterprint", cleanupPrint); document.body.classList.remove("learning-area-report-printing"); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  async function printReport() {
    setError(""); setPrinting(true);
    try {
      if (document.fonts) await document.fonts.ready;
      await Promise.all([...(dialog.current?.querySelectorAll<HTMLImageElement>("img") || [])].map((image) => image.decode().catch(() => {})));
      if (!dialog.current?.isConnected) { setPrinting(false); return; }
      document.body.classList.add("learning-area-report-printing");
      window.print();
    } catch {
      document.body.classList.remove("learning-area-report-printing"); setPrinting(false); setError("The print dialog could not be opened. Please try again.");
    }
  }
  if (typeof document === "undefined") return null;
  const { summary } = snapshot;
  return createPortal(<div className="area-upload-report-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><section ref={dialog} className="area-upload-report-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
    <div className="area-upload-report-toolbar"><strong>Report preview</strong><button type="button" aria-label="Close learning-area report" onClick={onClose}>×</button></div>
    <div className="area-upload-report-content"><article className="area-upload-report-paper">
      <header className="area-upload-report-heading"><img src="/project-helps-logo.png" alt="Project HELPS" /><div><p>Department of Education</p><p>Schools Division of Cebu Province</p><strong>Project HELPS</strong><h2 id={`${id}-title`}>Learning-area Upload Report</h2></div></header>
      <dl className="area-upload-report-meta"><div><dt>Generated</dt><dd>{dateLabel(snapshot.generatedAt)} · Manila time</dd></div><div><dt>Counts loaded</dt><dd>{dateLabel(snapshot.loadedAt)} · Manila time</dd></div><div><dt>Coverage</dt><dd>All learning areas · current uploaded resources · all upload dates</dd></div><div><dt>Total resources</dt><dd>{summary.totals.total.toLocaleString()} across {summary.areas.length} learning areas</dd></div></dl>
      <LearningAreaUploadTable areas={summary.areas} totals={summary.totals} hasOther={Boolean(summary.totals.other)} />
      <p className="area-upload-report-note">Counts represent current resource records, not downloads or prints. Names follow the Learning Resources menu. This report is a fixed snapshot; later uploads are reflected when a new report is generated.</p>
    </article></div>
    {error && <p className="area-upload-report-error" role="alert">{error}</p>}
    <div className="area-upload-report-actions"><span>A4 print layout · use your printer or Save as PDF</span><button type="button" onClick={onClose}>Close</button><button type="button" onClick={() => void printReport()} disabled={printing}>{printing ? "Print dialog open…" : "Print / Save as PDF"}</button></div>
  </section></div>, document.body);
}
