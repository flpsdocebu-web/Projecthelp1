"use client";

import { useEffect, useId, useRef, useState } from "react";

export function ProfileAvatar({ name, src, large = false }: { name: string; src?: string | null; large?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "U";
  return <span className={`profile-avatar${large ? " profile-avatar-large" : ""}`}>{src && !failed ? <img src={src} alt={`${name}'s profile picture`} onError={() => setFailed(true)} /> : <span aria-label="Default profile picture">{initials}</span>}</span>;
}

export default function ProfileAccountMenu({ user, photoVersion, onEdit }: { user: { name: string; username: string; role: string; hasPhoto?: boolean }; photoVersion: number; onEdit: () => void }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), trigger = useRef<HTMLButtonElement>(null), edit = useRef<HTMLButtonElement>(null);
  const id = useId();
  const role = user.role === "administrator" ? "Administrator" : user.role === "school" ? "School account" : "Learner account";
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div className="profile-account-menu" ref={root} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); } }}>
    <button ref={trigger} type="button" className="profile-menu-trigger" aria-expanded={open} aria-controls={id} aria-label={`Signed in as ${user.name || user.username}. Profile options`} onClick={() => setOpen(true)} onKeyDown={(event) => { if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); window.setTimeout(() => edit.current?.focus(), 0); } }}>
      <ProfileAvatar name={user.name || user.username} src={user.hasPhoto ? `/api/profile/photo?v=${photoVersion}` : null} />
      <span className="profile-signed-label"><small>Signed in as</small><strong>{user.name || user.username}</strong></span><span aria-hidden="true">⌄</span>
    </button>
    {open && <div className="profile-popover-wrap" id={id}><div className="profile-popover"><div><strong>{user.name || user.username}</strong><small>{role} · @{user.username}</small></div><button ref={edit} type="button" onClick={() => { setOpen(false); trigger.current?.focus(); onEdit(); }}><span aria-hidden="true">✎</span> Edit profile</button></div></div>}
  </div>;
}
