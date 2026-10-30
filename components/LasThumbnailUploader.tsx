"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { useLasThumbnail } from "./LasThumbnailProvider";

export default function LasThumbnailUploader() {
  const { thumbnail, setThumbnail } = useLasThumbnail();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const id = useId();

  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selected: File | undefined) {
    setMessage(""); setError(""); setFile(null);
    if (!selected) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(selected.type)) { setError("Choose a PNG, JPG, or WebP image."); return; }
    if (selected.size > 5 * 1024 * 1024) { setError("Choose an image no larger than 5 MB."); return; }
    setFile(selected);
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || submitting.current) return;
    submitting.current = true;
    setSaving(true); setError(""); setMessage("");
    try {
      const form = new FormData(); form.append("image", file);
      const response = await fetch("/api/las-thumbnail", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.thumbnail) throw new Error(result.error || "The thumbnail could not be saved. Please try again.");
      setThumbnail(result.thumbnail);
      setFile(null);
      if (input.current) input.current.value = "";
      setMessage("Thumbnail updated. All LAS covers now use the new image. Open Learning Resources pages update within 30 seconds.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "The thumbnail could not be saved. Please try again."); }
    finally { submitting.current = false; setSaving(false); }
  }

  return <section className="las-thumbnail-panel" aria-labelledby={`${id}-title`}>
    <header><div><span>Resource appearance</span><h2 id={`${id}-title`}>LAS thumbnail</h2><p>Upload one cover image for all Learning Resources / LAS cards.</p></div><b>Administrator only</b></header>
    <div className="las-thumbnail-content">
      <div className="las-thumbnail-preview"><span>{file ? "New thumbnail preview · not yet saved" : "Current thumbnail"}</span><div className="helps-resource-cover"><img className="helps-resource-cover-art" src={preview || thumbnail.url} alt={file ? "Selected LAS thumbnail preview" : "Current LAS thumbnail"}/><div className="helps-resource-cover-details"><span className="helps-resource-cover-subject">Learning area / Subject</span><div className="helps-resource-cover-meta"><strong>Grade level</strong><span className="helps-resource-cover-term">Term 1</span></div><small>Learning Activity Sheet</small></div></div></div>
      <form onSubmit={upload} aria-busy={saving}>
        <label htmlFor={`${id}-file`}>Choose thumbnail image</label><input ref={input} id={`${id}-file`} type="file" accept="image/png,image/jpeg,image/webp" disabled={saving} onChange={(event) => selectFile(event.target.files?.[0])} aria-describedby={`${id}-help`}/>
        <p id={`${id}-help`}>PNG, JPG, or WebP · maximum 5 MB · up to 20 megapixels. A landscape design works best. The full image is displayed without cropping.</p>
        {file && <strong className="las-thumbnail-filename">{file.name}</strong>}
        <div className="las-thumbnail-note">Applies to every LAS cover on the home page and Learning Resources. Subject, grade level, and term stay visible below the artwork. PDFs and resource records are not changed.</div>
        {error && <p className="las-thumbnail-error" role="alert">{error}</p>}
        {message && <p className="las-thumbnail-success" role="status">{message}</p>}
        <button type="submit" disabled={!file || saving}>{saving ? "Uploading and saving…" : "Upload and apply thumbnail"}</button>
      </form>
    </div>
  </section>;
}
