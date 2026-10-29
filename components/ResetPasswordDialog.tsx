"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Props = { user: { id: string; username: string; name: string }; onClose: () => void; onReset: () => void };

export default function ResetPasswordDialog({ user, onClose, onReset }: Props) {
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const dialog = useRef<HTMLElement>(null);
  const submitting = useRef(false);
  const close = useRef(onClose);
  close.current = onClose;
  const id = useId();

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLInputElement>("input")?.focus();
    function keys(event: KeyboardEvent) {
      if (event.key === "Escape" && !submitting.current) close.current();
      if (event.key !== "Tab") return;
      const fields = [...(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled)") || [])];
      const first = fields[0], last = fields[fields.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", keys);
    return () => { document.removeEventListener("keydown", keys); document.body.style.overflow = overflow; previous?.focus(); };
  }, []);

  useEffect(() => {
    if (complete) dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
  }, [complete]);

  async function reset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || complete) return;
    if (password.length < 8) { setError("Password must have at least 8 characters."); return; }
    submitting.current = true;
    setSaving(true);
    setError("");
    try {
      const response = await fetch("/api/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: user.id, action: "reset", password }) });
      const result = await response.json();
      if (!response.ok || result.ok !== true) throw new Error(result.error || "Password could not be reset. Please try again.");
      setPassword("");
      setComplete(true);
      onReset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The user service is unavailable. Please try again.");
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  if (typeof document === "undefined") return null;
  return createPortal(<div className="password-reset-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting.current) onClose(); }}>
    <section className="password-reset-dialog" ref={dialog} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`} aria-busy={saving} tabIndex={-1}>
      <button className="password-reset-close" type="button" aria-label="Close password reset" disabled={saving} onClick={onClose}>×</button>
      {complete ? <div className="password-reset-success" role="status">
        <svg className="password-reset-check" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="29"/><path d="m18 33 9 9 19-21"/></svg>
        <h2 id={`${id}-title`}>Password has been reset.</h2>
        <p id={`${id}-description`}>{user.name || user.username} can now sign in with the new password.</p>
        <button className="password-reset-primary" type="button" onClick={onClose}>Close</button>
      </div> : <form onSubmit={reset}>
        <span className="password-reset-eyebrow">Account security</span>
        <h2 id={`${id}-title`}>Reset password</h2>
        <p id={`${id}-description`}>Set a new password for <strong>{user.name || user.username}</strong> ({user.username}).</p>
        <label htmlFor={`${id}-password`}>New password</label>
        <input id={`${id}-password`} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} disabled={saving} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`} />
        <small id={`${id}-hint`}>Use at least 8 characters. Existing sign-in sessions will end.</small>
        {error && <p id={`${id}-error`} className="password-reset-error" role="alert">{error}</p>}
        <div className="password-reset-actions"><button type="button" disabled={saving} onClick={onClose}>Cancel</button><button className="password-reset-primary" type="submit" disabled={saving}>{saving ? "Resetting…" : "Reset password"}</button></div>
      </form>}
    </section>
  </div>, document.body);
}
