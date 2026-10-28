"use client";

import { FormEvent, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CEBU_DISTRICTS_ALPHABETICAL } from "@/lib/district";
import type { Profile } from "@/lib/profile";

export default function ProfileEditor({ onClose, onSaved }: { onClose: () => void; onSaved: (profile: Profile) => void }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState(""), [schoolId, setSchoolId] = useState(""), [district, setDistrict] = useState("");
  const [currentPassword, setCurrentPassword] = useState(""), [newPassword, setNewPassword] = useState(""), [confirmPassword, setConfirmPassword] = useState("");
  const [changePassword, setChangePassword] = useState(false), [showPasswords, setShowPasswords] = useState(false);
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(true);
  const [error, setError] = useState(""), [success, setSuccess] = useState("");
  const dialog = useRef<HTMLElement>(null);
  const closeRef = useRef(onClose), busyRef = useRef(false);
  closeRef.current = onClose; busyRef.current = busy;
  const id = useId();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/profile", { cache: "no-store", signal: controller.signal }).then(async (response) => { const result = await response.json(); if (!response.ok || !result.profile) throw new Error(result.error || "Unable to load your profile."); return result.profile as Profile; }).then((value) => { setProfile(value); setName(value.name); setSchoolId(value.schoolId); setDistrict(value.district); }).catch((cause) => { if (!controller.signal.aborted) setError(cause.message || "Unable to load your profile."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden"; dialog.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) closeRef.current();
      if (event.key !== "Tab") return;
      const elements = [...(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]') || [])].filter((element) => element.offsetParent !== null);
      const first = elements[0], last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); return; }
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keys); previous?.focus(); };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    if (changePassword && newPassword !== confirmPassword) { setError("The new passwords do not match."); return; }
    setBusy(true);
    try {
      const response = await fetch("/api/profile", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, schoolId, district, ...(changePassword ? { currentPassword, newPassword, confirmPassword } : {}) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Your profile could not be saved.");
      setProfile(result.profile); onSaved(result.profile);
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword(""); setChangePassword(false); setShowPasswords(false);
      setSuccess(result.passwordChanged ? "Profile and password updated. Your other sessions have been signed out." : "Your profile has been updated successfully.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Your profile could not be saved."); }
    finally { setBusy(false); }
  }
  if (typeof document === "undefined") return null;
  return createPortal(<div className="profile-editor-backdrop" onMouseDown={(event) => { if (event.currentTarget === event.target && !busyRef.current) onClose(); }}><section ref={dialog} className="profile-editor" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} tabIndex={-1}>
    <header><div><small>Your Project HELPS account</small><h2 id={`${id}-title`}>Edit profile</h2><p>Keep your personal and school information up to date.</p></div><button type="button" aria-label="Close profile" disabled={busy} onClick={onClose}>×</button></header>
    {loading ? <div className="profile-loading" role="status">Loading your profile…</div> : <form onSubmit={save}>
      <div className="profile-editor-content">
        {error && <p className="profile-alert error" role="alert">{error}</p>}{success && <p className="profile-alert success" role="status">{success}</p>}
        {profile && <>
        <div className="profile-account-summary"><div><small>Username</small><strong>{profile.username}</strong></div><div><small>Account type</small><strong>{profile.role === "administrator" ? "Administrator" : profile.role === "school" ? "School account" : "Learner account"}</strong></div><div><small>Email address</small><strong>{profile.email}</strong></div>{profile.schoolName && <div><small>School</small><strong>{profile.schoolName}</strong></div>}{profile.lrn && <div><small>LRN</small><strong>{profile.lrn}</strong></div>}</div>
        <fieldset disabled={busy}><legend>Personal &amp; school information</legend><label>Full name<input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} maxLength={190} required /></label><div className="profile-field-grid"><label>School ID<input value={schoolId} onChange={(event) => setSchoolId(event.target.value)} maxLength={80} /></label><label>District<select value={district} onChange={(event) => setDistrict(event.target.value)} required={profile.role !== "administrator"}><option value="">{profile.role === "administrator" ? "Not assigned" : "Select district"}</option>{district && !CEBU_DISTRICTS_ALPHABETICAL.includes(district as typeof CEBU_DISTRICTS_ALPHABETICAL[number]) && <option value={district}>{district} (choose an official district)</option>}{CEBU_DISTRICTS_ALPHABETICAL.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div></fieldset>
        <fieldset disabled={busy} className="profile-password-section"><legend>Account security</legend><label className="profile-password-toggle"><input type="checkbox" checked={changePassword} onChange={(event) => setChangePassword(event.target.checked)} /><span>Change my password</span></label>{changePassword && <><p>Confirm your current password. Your other signed-in sessions will be closed after saving.</p><label>Current password<input type={showPasswords ? "text" : "password"} autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required /></label><div className="profile-field-grid"><label>New password<input type={showPasswords ? "text" : "password"} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} minLength={8} required /></label><label>Confirm new password<input type={showPasswords ? "text" : "password"} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} minLength={8} required /></label></div><label className="profile-password-toggle"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /><span>Show passwords</span></label><small>At least 8 characters. Use a password you do not use elsewhere.</small></>}</fieldset></>}
      </div><footer><button type="button" disabled={busy} onClick={onClose}>Close</button><button type="submit" disabled={busy || !profile}>{busy ? "Saving…" : "Save changes"}</button></footer>
    </form>}
  </section></div>, document.body);
}
