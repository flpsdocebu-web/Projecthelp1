"use client";

import { FormEvent, useState } from "react";

type AccountType = "school" | "student" | null;

export default function Login() {
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: String(data.get("username") || "").trim(),
          password: String(data.get("password") || ""),
        }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "Unable to log in.");
      const requested = sessionStorage.getItem("helps_return_to") ||
        (result.user.role === "administrator" ? "/dashboard/" : "/library/");
      sessionStorage.removeItem("helps_return_to");
      window.location.href = result.user.role !== "administrator" &&
        (requested === "/dashboard/" || requested === "/users/")
        ? "/library/"
        : requested;
    } catch {
      setError("Login service is temporarily unavailable.");
    }
  }

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSendingReset(true);
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: String(data.get("identifier") || "").trim() }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "The reset email could not be sent.");
      setForgotPassword(false);
      setMessage(result.message);
    } catch {
      setError("The password-reset service is temporarily unavailable.");
    } finally {
      setSendingReset(false);
    }
  }

  async function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("newPassword") || "");
    const confirmation = String(data.get("confirmPassword") || "");
    const lrn = String(data.get("lrn") || "").trim();
    if (password !== confirmation) return setError("Passwords do not match.");
    if (accountType === "student" && !/^\d{12}$/.test(lrn)) return setError("LRN must be 12 digits.");
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: accountType,
          username: String(data.get("newUsername") || "").trim(),
          password,
          email: String(data.get("email") || "").trim(),
          name: String(data.get("fullName") || "").trim(),
          district: String(data.get("district") || "").trim(),
          schoolName: String(data.get("schoolName") || "").trim(),
          schoolId: String(data.get("schoolId") || "").trim(),
          lrn,
        }),
      });
      const result = await response.json();
      if (!response.ok) return setError(result.error || "Account could not be created.");
      form.reset();
      setAccountType(null);
      setMessage("Account created successfully. You may now log in.");
    } catch {
      setError("Registration service is temporarily unavailable.");
    }
  }

  return (
    <main className="reference-login">
      <div className="login-decoration top-ring" />
      <div className="login-decoration bottom-ring" />
      <section className="reference-login-card">
        <div className="login-logo-wrap"><img src="/project-helps-logo.png" alt="Project HELPS" /></div>
        <h1 className="sr-only">Log in to Project HELPS</h1>
        <form className="reference-login-form" onSubmit={logIn}>
          <label><span>Username</span><input name="username" placeholder="e.g. school.admin" autoComplete="username" required /></label>
          <label>
            <span className="password-label">
              <span>Password</span>
              <button className="forgot-password-link" type="button" onClick={() => { setError(""); setMessage(""); setForgotPassword(true); }}>
                Forgot password?
              </button>
            </span>
            <span className="password-field">
              <input name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" required />
              <button type="button" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? "●" : "○"}
              </button>
            </span>
          </label>
          {error && !accountType && !forgotPassword && <p className="form-alert error">{error}</p>}
          {message && <p className="form-alert success">{message}</p>}
          <button className="reference-login-button">Log in <span>→</span></button>
        </form>
        <div className="account-balloon">
          <span className="balloon-tip" />
          <strong>Create an account</strong>
          <p>Select the type of account you want to register.</p>
          <div>
            <button type="button" onClick={() => { setError(""); setAccountType("school"); }}>
              <span className="account-icon school-icon">▣</span><span><b>School Account</b><small>For teachers and school staff</small></span>
            </button>
            <button type="button" onClick={() => { setError(""); setAccountType("student"); }}>
              <span className="account-icon person-icon">♙</span><span><b>Student Account</b><small>For registered learners</small></span>
            </button>
          </div>
        </div>
        <div className="reference-security-note"><span>♢</span><p>Accounts use encrypted passwords and secure server-side sessions.</p></div>
      </section>

      {forgotPassword && (
        <div className="account-modal-backdrop">
          <section className="account-dialog forgot-dialog">
            <header><div><small>Account recovery</small><h2>Reset your password</h2></div><button type="button" onClick={() => setForgotPassword(false)}>×</button></header>
            <form onSubmit={requestPasswordReset}>
              <p>Enter the username or email address registered to your account. We will email a secure link that expires in 60 minutes.</p>
              <label>Username or Email Address<input name="identifier" autoComplete="username" required autoFocus /></label>
              {error && <p className="form-alert error">{error}</p>}
              <div className="dialog-actions"><button type="button" onClick={() => setForgotPassword(false)}>Cancel</button><button type="submit" disabled={sendingReset}>{sendingReset ? "Sending…" : "Send reset link →"}</button></div>
            </form>
          </section>
        </div>
      )}

      {accountType && (
        <div className="account-modal-backdrop">
          <section className="account-dialog">
            <header><span className={`account-icon ${accountType === "school" ? "school-icon" : "person-icon"}`}>{accountType === "school" ? "▣" : "♙"}</span><div><small>Project HELPS registration</small><h2>Create {accountType === "school" ? "School" : "Student"} Account</h2></div><button type="button" onClick={() => setAccountType(null)}>×</button></header>
            <form onSubmit={createAccount}>
              {accountType === "school" ? <><div className="dialog-grid"><label>District<input name="district" required /></label><label>School ID<input name="schoolId" required /></label></div><label>School Name<input name="schoolName" required /></label><label>Name (Firstname Lastname)<input name="fullName" required /></label></> : <><label>LRN (Must be 12 digits)<input name="lrn" inputMode="numeric" pattern="[0-9]{12}" minLength={12} maxLength={12} required /></label><label>School Name<input name="schoolName" required /></label><label>Student Name (Firstname Lastname)<input name="fullName" required /></label></>}
              <label>Email Address<input name="email" type="email" required /></label>
              <label>Username<input name="newUsername" minLength={4} required /></label>
              <div className="dialog-grid"><label>Password<input name="newPassword" type="password" minLength={8} required /></label><label>Confirm Password<input name="confirmPassword" type="password" minLength={8} required /></label></div>
              {error && <p className="form-alert error">{error}</p>}
              <div className="dialog-actions"><button type="button" onClick={() => setAccountType(null)}>Cancel</button><button type="submit">Create Account →</button></div>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
