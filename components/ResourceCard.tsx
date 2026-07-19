"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Resource = { id?: string; grade: string; subject: string; title: string; pages: number; color: string; uploaded?: boolean; term?: string };
type PdfPage = { getViewport: (options: { scale: number }) => { width: number; height: number }; render: (options: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> } };
type PdfDocument = { numPages: number; getPage: (page: number) => Promise<PdfPage> };

export default function ResourceCard({ item }: { item: Resource }) {
  const [preview, setPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState<"print" | "download" | "">("");
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(item.pages);
  const [turning, setTurning] = useState<"next" | "previous" | "">("");
  const [viewerSize, setViewerSize] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState("");
  const documentRef = useRef<PdfDocument | null>(null);
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  function sendToLogin() {
    sessionStorage.setItem("helps_return_to", "/library1/");
    window.location.href = "/login1/";
  }

  async function fetchPdfBlob() {
    if (!item.uploaded || !item.id) throw new Error("This PDF file is unavailable.");
    const response = await fetch(`/api/resources/${item.id}`, { cache: "no-store", credentials: "same-origin" });
    if (response.status === 401) {
      sendToLogin();
      throw new Error("Login required.");
    }
    if (!response.ok) throw new Error("PDF file is unavailable.");
    return response.blob();
  }

  function recordActivity(action: "download" | "print" | "preview") {
    if (item.id) fetch("/api/activity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ resourceId: item.id, action }) }).catch(() => {});
  }

  async function requireLogin() {
    try {
      const response = await fetch("/api/auth/session", { cache: "no-store" });
      const { user } = response.ok ? await response.json() : { user: null };
      if (!user) return sendToLogin();
      setPreview(true);
    } catch {
      sendToLogin();
    }
  }

  async function downloadPdf() {
    setActionBusy("download");
    try {
      const blob = await fetchPdfBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${item.title}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      recordActivity("download");
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (reason) {
      if (reason instanceof Error && reason.message !== "Login required.") setError(reason.message);
    } finally {
      setActionBusy("");
    }
  }

  function printBlob(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const frame = document.createElement("iframe");
    frame.className = "pdf-print-frame";
    frame.src = url;
    document.body.appendChild(frame);
    frame.onload = () => window.setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => { frame.remove(); URL.revokeObjectURL(url); }, 3000);
    }, 350);
  }

  async function printPdf() {
    setActionBusy("print");
    try {
      const blob = downloadUrl ? await fetch(downloadUrl).then((response) => response.blob()) : await fetchPdfBlob();
      printBlob(blob);
      recordActivity("print");
    } catch (reason) {
      if (reason instanceof Error && reason.message !== "Login required.") setError(reason.message);
    } finally {
      setActionBusy("");
    }
  }

  useEffect(() => {
    if (!preview) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setPreview(false); };
    window.addEventListener("keydown", close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", close); };
  }, [preview]);

  useEffect(() => {
    if (!preview || !item.uploaded || !item.id) return;
    let active = true;
    let objectUrl = "";
    setLoading(true);
    setError("");
    documentRef.current = null;
    (async () => {
      try {
        const blob = await fetchPdfBlob();
        objectUrl = URL.createObjectURL(blob);
        if (active) setDownloadUrl(objectUrl);
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
        const pdf = await pdfjs.getDocument({ data: await blob.arrayBuffer() }).promise as unknown as PdfDocument;
        if (!active) return;
        documentRef.current = pdf;
        setPages(pdf.numPages);
        setPage(1);
        recordActivity("preview");
      } catch (reason) {
        if (active && reason instanceof Error && reason.message !== "Login required.") setError(reason.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); setDownloadUrl(""); };
  }, [preview, item.id, item.uploaded]);

  useEffect(() => {
    if (!preview) return;
    const resize = () => setViewerSize((value) => value + 1);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [preview]);

  useEffect(() => {
    if (!preview || !item.uploaded || !documentRef.current || !rightCanvasRef.current) return;
    let active = true;
    async function renderPage(pageNumber: number, canvas: HTMLCanvasElement | null, spread: boolean) {
      if (!canvas || !documentRef.current) return;
      const pdfPage = await documentRef.current.getPage(pageNumber);
      const base = pdfPage.getViewport({ scale: 1 });
      const totalWidth = Math.max(300, Math.min(1000, window.innerWidth - 180));
      const availableWidth = spread ? totalWidth / 2 : Math.min(880, totalWidth);
      const availableHeight = Math.max(330, window.innerHeight - 195);
      const viewport = pdfPage.getViewport({ scale: Math.min(availableWidth / base.width, availableHeight / base.height) });
      if (!active) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const context = canvas.getContext("2d");
      if (context) await pdfPage.render({ canvasContext: context, viewport }).promise;
    }
    (async () => {
      try {
        const spread = page > 1;
        await Promise.all([spread ? renderPage(page - 1, leftCanvasRef.current, true) : Promise.resolve(), renderPage(page, rightCanvasRef.current, spread)]);
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "This PDF page could not be rendered.");
      }
    })();
    return () => { active = false; };
  }, [preview, page, pages, item.uploaded, viewerSize]);

  function turn(direction: "next" | "previous") {
    const target = direction === "next" ? page + 1 : page - 1;
    if (target < 1 || target > pages || turning) return;
    setTurning(direction);
    window.setTimeout(() => { setPage(target); setTurning(""); }, 240);
  }

  const viewer = preview ? <div className="modal-backdrop pdf-flipbook-backdrop" role="dialog" aria-modal="true" onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(false); }}><div className="preview-modal pdf-flipbook-modal"><div className="modal-head"><div><strong>{item.title}</strong><small>{loading ? "Opening PDF…" : error ? "PDF unavailable" : `PDF preview · ${pages} page${pages === 1 ? "" : "s"}`}</small></div><button onClick={() => setPreview(false)} aria-label="Close">×</button></div><div className="flipbook real-flipbook">{loading ? <div className="pdf-loading">Loading PDF…</div> : error ? <div className="pdf-error"><strong>Unable to display this PDF</strong><span>{error}</span></div> : <><button className="page-arrow previous" disabled={page <= 1} onClick={() => turn("previous")} aria-label="Previous page">‹</button><div className={`book-spread ${page === 1 ? "cover-only" : "open-book"} ${turning ? `turn-${turning}` : ""}`}>{page > 1 && <div className="pdf-page left-page"><canvas ref={leftCanvasRef} /><span className="sheet-page-number">{page - 1}</span></div>}<div className="pdf-page right-page"><canvas ref={rightCanvasRef} /><span className="sheet-page-number">{page}</span></div></div><button className="page-arrow next" disabled={page >= pages} onClick={() => turn("next")} aria-label="Next page">›</button><div className="page-count">{page === 1 ? `Page 1 of ${pages}` : `Pages ${page - 1}–${page} of ${pages}`}</div></>}</div><div className="modal-actions"><button className="btn ghost dark" disabled={loading || actionBusy === "print"} onClick={printPdf}>{actionBusy === "print" ? "Preparing…" : "Print all PDF pages"}</button><button className="btn primary" disabled={loading || actionBusy === "download"} onClick={downloadPdf}>{actionBusy === "download" ? "Preparing…" : "Download PDF"}</button></div></div></div> : null;

  return <><article className="resource-card"><div className="sheet-cover" style={{ background: item.color }}><span>{item.subject}</span><strong>{item.grade}</strong><small>{item.term ? `${item.term} · ` : ""}Learning Activity Sheet</small><div className="cover-wave" /></div><div className="resource-body"><div className="tag-row"><span className="tag">{item.subject}</span><span>{item.uploaded ? "PDF" : `${item.pages} pages`}</span></div><h3>{item.title}</h3><p>Curriculum-aligned activity sheet with guided exercises and learner-friendly instructions.</p><div className="resource-actions"><button className="btn soft" onClick={requireLogin}>Preview</button><button className="btn ghost dark" disabled={actionBusy === "print"} onClick={printPdf}>Print</button><button className="icon-btn" title="Download PDF" aria-label={`Download ${item.title}`} disabled={actionBusy === "download"} onClick={downloadPdf}>⇩</button></div>{error && !preview && <small className="resource-action-error">{error}</small>}</div></article>{viewer ? createPortal(viewer, document.body) : null}</>;
}
