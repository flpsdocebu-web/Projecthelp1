"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password") || "");
    const confirmation = String(data.get("confirmation") || "");
    if (password !== confirmation) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "The password could not be reset.");
      setComplete(true);
    } catch {
      setError("The password-reset service is temporarily unavailable.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="reference-login reset-password-page">
      <section className="reference-login-card">
        <div className="login-logo-wrap"><img src="/project-helps-logo.png" alt="Project HELPS" /></div>
        {complete ? (
          <div className="reset-complete">
            <h1>Password updated</h1>
            <p>Your password was changed successfully. All previous sessions were signed out.</p>
            <Link className="reference-login-button" href="/login/">Return to log in →</Link>
          </div>
        ) : (
          <form className="reference-login-form" onSubmit={submit}>
            <h1>Create a new password</h1>
            <p className="reset-help">Use at least eight characters.</p>
            <label>New Password<input name="password" type="password" minLength={8} required /></label>
            <label>Confirm New Password<input name="confirmation" type="password" minLength={8} required /></label>
            {!token && <p className="form-alert error">The reset link is missing its security token.</p>}
            {error && <p className="form-alert error">{error}</p>}
            <button className="reference-login-button" disabled={!token || submitting}>
              {submitting ? "Updating…" : "Update password →"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>;
}
