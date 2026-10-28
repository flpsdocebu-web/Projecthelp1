"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function ForgotPasswordHelp() {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null), dialog = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const controls = dialog.current?.querySelectorAll<HTMLElement>("button,a[href]");
      if (!controls?.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", keys);
    return () => { document.body.style.overflow = overflow; document.removeEventListener("keydown", keys); trigger.current?.focus(); };
  }, [open]);

  return <><button ref={trigger} className="forgot-password-link" type="button" onClick={() => setOpen(true)}>Forgot password?</button>{open && createPortal(<div className="password-help-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}><section ref={dialog} className="password-help-dialog" role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-describedby={`${id}-message`} tabIndex={-1}>
    <button className="password-help-close" type="button" aria-label="Close password help" onClick={() => setOpen(false)}>×</button>
    <span className="password-help-icon" aria-hidden="true">?</span>
    <h2 id={`${id}-title`}>Forgot your password?</h2>
    <p id={`${id}-message`}>Please contact <strong>Mr. Daniel P. Reyes</strong> for assistance with resetting your password.</p>
    <a className="password-help-facebook" href="https://www.facebook.com/dan.rey0888" target="_blank" rel="noopener noreferrer">Contact on Facebook <span aria-hidden="true">↗</span><span className="sr-only"> (opens in a new tab)</span></a>
    <button className="password-help-done" type="button" onClick={() => setOpen(false)}>Close</button>
  </section></div>, document.body)}</>;
}
