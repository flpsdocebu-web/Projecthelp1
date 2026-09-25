"use client";

import { FormEvent, useEffect, useState } from "react";
import { createPortal } from "react-dom";

type Resource = { id: string; title: string; learningArea: string; gradeLevel: string; term: string; fileName: string };
type UploadProgress = { percent: number; completed: number; total: number };
type DuplicateWarning = { learningArea: string; fileNames: string[] };

const subjects = ["SNED", "KINDERGARTEN", "ENGLISH", "MAKABANSA", "MATHEMATICS - REGULAR", "MATHEMATICS - SPS", "SCIENCE", "SCIENCE - SPS", "FILIPINO", "MUSIC & ARTS", "PHYSICAL EDUCATION & HEALTH", "Reading and Literacy and Language", "EPP", "Technology and Livelihood Education (TLE)", "GMRC", "VALUES EDUCATION (VE)", "Edukasyong Pantahanan at Pangkabuhayan (EPP)", "Araling Panlipunan (AP)", "Alternative Learning System (ALS)", "Effective Communication", "General Mathematics", "General Science", "Life and Career Skills", "Pag-aaral ng Kasaysayan at Lipunang Pilipino", "ELECTIVES", "TECHPRO"].sort((a, b) => a.localeCompare(b));
const grades = ["Kindergarten", ...Array.from({ length: 12 }, (_, index) => `Grade ${index + 1}`), "Alternative Learning System"];
const terms = ["Term 1", "Term 2", "Term 3", "Full Year"];

export default function UploadResourceManager() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [uploads, setUploads] = useState<Resource[]>([]);
  const [message, setMessage] = useState("");
  const [selectedCount, setSelectedCount] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<UploadProgress>({ percent: 0, completed: 0, total: 0 });
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateWarning | null>(null);
  const [uploadComplete, setUploadComplete] = useState<number | null>(null);

  const load = () => fetch("/api/resources", { cache: "no-store" }).then((response) => response.json()).then((data) => setUploads(data.resources || [])).catch(() => {});
  useEffect(() => { setMounted(true); load(); }, []);

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("resourceFile") as HTMLInputElement;
    const files = Array.from(input.files || []);
    const total = files.length;
    if (!total) return;
    const data = new FormData(form);
    const learningArea = String(data.get("learningArea") || "").trim();
    files.forEach((file) => data.append("files", file));
    data.delete("resourceFile");
    setProgress({ percent: 0, completed: 0, total });

    try {
      setMessage("Checking filenames and subject for duplicates…");
      const duplicateResponse = await fetch("/api/resources/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ learningArea, fileNames: files.map((file) => file.name) }),
      });
      const duplicateResult = await duplicateResponse.json();
      if (!duplicateResponse.ok) throw new Error(duplicateResult.error || "Duplicate check failed.");
      if (duplicateResult.duplicate) {
        const fileNames = Array.isArray(duplicateResult.duplicates) ? duplicateResult.duplicates : ["A selected file"];
        setMessage("");
        setDuplicateWarning({ learningArea, fileNames });
        return;
      }

      setUploading(true);
      setMessage("Uploading PDFs securely…");
      const result = await new Promise<{ resources?: Resource[]; error?: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open("POST", "/api/resources");
        request.upload.onprogress = (uploadEvent) => {
          if (!uploadEvent.lengthComputable) return;
          const percent = Math.min(99, Math.round((uploadEvent.loaded / uploadEvent.total) * 100));
          const completed = Math.min(total - 1, Math.floor((percent / 100) * total));
          setProgress({ percent, completed, total });
        };
        request.onload = () => {
          let body: { resources?: Resource[]; error?: string; code?: string; duplicates?: string[]; learningArea?: string } = {};
          try { body = JSON.parse(request.responseText || "{}"); } catch {}
          if (request.status >= 200 && request.status < 300) resolve(body);
          else if (request.status === 409 && body.code === "DUPLICATE_RESOURCE" && body.duplicates?.length) {
            setDuplicateWarning({ learningArea: body.learningArea || learningArea, fileNames: body.duplicates });
            reject(new Error(""));
          } else reject(new Error(body.error || "Upload failed."));
        };
        request.onerror = () => reject(new Error("Upload failed. Check your connection and try again."));
        request.send(data);
      });
      const uploadedCount = result.resources?.length || total;
      setProgress({ percent: 100, completed: uploadedCount, total });
      setMessage(`${uploadedCount} PDF file${uploadedCount === 1 ? "" : "s"} uploaded successfully.`);
      setUploadComplete(uploadedCount);
      form.reset();
      setSelectedCount(0);
      await load();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed.";
      setMessage(errorMessage);
    } finally {
      setUploading(false);
    }
  }

  const termCounts = terms.map((term) => ({ term, count: uploads.filter((resource) => resource.term.trim().toLowerCase() === term.toLowerCase()).length }));
  const duplicateDialog = duplicateWarning && mounted ? createPortal(
    <div className="duplicate-warning-backdrop" role="presentation">
      <section className="duplicate-warning-dialog" role="alertdialog" aria-modal="true" aria-labelledby="duplicate-warning-title">
        <div className="duplicate-warning-symbol" aria-hidden="true">!</div>
        <small>Upload stopped</small>
        <h2 id="duplicate-warning-title">Duplicate file detected</h2>
        <p>The following PDF file{duplicateWarning.fileNames.length === 1 ? " is" : "s are"} already uploaded under <strong>{duplicateWarning.learningArea}</strong>:</p>
        <ul>{duplicateWarning.fileNames.map((fileName) => <li key={fileName}>{fileName}</li>)}</ul>
        <p className="duplicate-warning-help">Rename the file or select the correct subject before uploading again.</p>
        <button type="button" autoFocus onClick={() => setDuplicateWarning(null)}>Okay, review files</button>
      </section>
    </div>, document.body,
  ) : null;
  const uploadCompleteDialog = uploadComplete !== null && mounted ? createPortal(
    <div className="upload-complete-backdrop" role="presentation">
      <section className="upload-complete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="upload-complete-title">
        <div className="upload-complete-symbol" aria-hidden="true">✓</div>
        <small>Learning resources saved</small>
        <h2 id="upload-complete-title">Upload Complete – 100%</h2>
        <p><strong>{uploadComplete}</strong> PDF file{uploadComplete === 1 ? " was" : "s were"} uploaded successfully.</p>
        <div className="upload-complete-meter" aria-label="Upload progress 100 percent"><i /></div>
        <button type="button" autoFocus onClick={() => { setUploadComplete(null); setOpen(false); }}>Close</button>
      </section>
    </div>, document.body,
  ) : null;
  const dialog = open && mounted ? createPortal(
    <div className="upload-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !uploading) setOpen(false); }}>
      <section className="account-dialog upload-dialog">
        <header><span className="account-icon upload-icon">⇧</span><div><small>Central resource management</small><h2>Upload Learning Resources</h2></div><button disabled={uploading} onClick={() => setOpen(false)}>×</button></header>
        <div className="upload-dialog-scroll"><form onSubmit={upload}>
          <p className="auto-title-note">Select one or many PDFs. Titles are generated from filenames and stored in MySQL.</p>
          <div className="dialog-grid"><label>Subject<select name="learningArea" required defaultValue="" disabled={uploading}><option value="" disabled>Select subject</option>{subjects.map((subject) => <option key={subject}>{subject}</option>)}</select></label><label>Grade Level<select name="gradeLevel" required defaultValue="" disabled={uploading}><option value="" disabled>Select grade</option>{grades.map((grade) => <option key={grade}>{grade}</option>)}</select></label></div>
          <label>Term<select name="term" required defaultValue="" disabled={uploading}><option value="" disabled>Select term</option>{terms.map((term) => <option key={term}>{term}</option>)}</select></label>
          <label className="file-drop">PDF Learning Activity Sheets<input name="resourceFile" type="file" accept="application/pdf,.pdf" multiple required disabled={uploading} onChange={(event) => { const count = event.target.files?.length || 0; setSelectedCount(count); setProgress({ percent: 0, completed: 0, total: count }); }}/><span>{selectedCount ? `${selectedCount} PDF files selected` : "Choose PDF files"}</span><small>PDF only · maximum 15 MB per file</small></label>
          {(uploading || progress.percent > 0) && <div className="batch-upload-progress" aria-live="polite"><div><strong>{uploading ? "Uploading PDF batch" : "Batch upload complete"}</strong><span>{progress.completed}/{progress.total} files · {progress.percent}%</span></div><i><em style={{ width: `${progress.percent}%` }} /></i></div>}
          {message && <p className={`form-alert ${message.includes("successfully") ? "success" : "error"}`}>{message}</p>}
          <div className="dialog-actions"><button type="button" disabled={uploading} onClick={() => setOpen(false)}>Close</button><button type="submit" disabled={uploading}>{uploading ? `Uploading ${progress.completed}/${progress.total}…` : "Upload PDF Batch →"}</button></div>
        </form></div>
      </section>
    </div>, document.body,
  ) : null;

  return <><div className="upload-manager"><div className="upload-manager-summary"><div><small>Uploaded resources</small><strong>{uploads.length}</strong></div><button className="btn primary" onClick={() => { setMessage(""); setDuplicateWarning(null); setUploadComplete(null); setProgress({ percent: 0, completed: 0, total: 0 }); setOpen(true); }}>＋ Upload new resource</button></div><div className="upload-term-counts" aria-label="Uploaded resources by term">{termCounts.map(({ term, count }) => <div key={term}><small>{term}</small><strong>{count}</strong><span>Resources uploaded</span></div>)}</div></div>{dialog}{duplicateDialog}{uploadCompleteDialog}</>;
}
