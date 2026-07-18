"use client";

import { FormEvent, useEffect, useState } from "react";

type AccountType = "school" | "student" | null;
type SavedUser = { username: string; password: string; role: "administrator" | "school" | "student"; name: string; email?: string; district?: string; schoolName?: string; schoolId?: string; lrn?: string; suspended?: boolean };

export default function Login() {
  const defaultAdminUsername = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_USERNAME;
  const defaultAdminPassword = process.env.NEXT_PUBLIC_DEFAULT_ADMIN_PASSWORD;
  const [showPassword, setShowPassword] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!accountType) return;
    const form = document.querySelector<HTMLFormElement>(".account-dialog form");
    if (form) form.noValidate = true;
  }, [accountType]);

  function logIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") || "").trim();
    const password = String(data.get("password") || "");

    if (defaultAdminUsername && defaultAdminPassword && username === defaultAdminUsername && password === defaultAdminPassword) {
      sessionStorage.setItem("helps_session", JSON.stringify({ username, role: "administrator" }));
      const returnTo = sessionStorage.getItem("helps_return_to") || "/dashboard/";
      sessionStorage.removeItem("helps_return_to");
      window.location.href = returnTo;
      return;
    }

    const users: SavedUser[] = JSON.parse(localStorage.getItem("helps_users") || "[]");
    const user = users.find((item) => item.username === username && item.password === password);
    if (user) {
      if (user.suspended) { setError("This account is currently suspended. Please contact the administrator."); return; }
      sessionStorage.setItem("helps_session", JSON.stringify({ username: user.username, role: user.role, name: user.name }));
      const requested = sessionStorage.getItem("helps_return_to") || (user.role === "administrator" ? "/dashboard/" : "/library/");
      sessionStorage.removeItem("helps_return_to");
      window.location.href = user.role !== "administrator" && (requested === "/dashboard/" || requested === "/users/") ? "/library/" : requested;
      return;
    }
    setError("Incorrect username or password. Please try again.");
  }

  function createAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const requiredFields = accountType === "school"
      ? ["district", "schoolId", "schoolName", "fullName", "email", "newUsername", "newPassword", "confirmPassword"]
      : ["lrn", "schoolName", "fullName", "email", "newUsername", "newPassword", "confirmPassword"];
    if (requiredFields.some((field) => !String(data.get(field) || "").trim())) {
      setError("Please complete all required fields.");
      return;
    }
    const password = String(data.get("newPassword") || "");
    const confirm = String(data.get("confirmPassword") || "");
    const username = String(data.get("newUsername") || "").trim();
    const email = String(data.get("email") || "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError("Please enter a valid email address."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    if (accountType === "student" && !/^\d{12}$/.test(String(data.get("lrn") || "").trim())) { setError("LRN must be 12 digits."); return; }
    const users: SavedUser[] = JSON.parse(localStorage.getItem("helps_users") || "[]");
    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) { setError("That username is already registered."); return; }
    if (users.some((user) => user.email?.toLowerCase() === email)) { setError("That email address is already registered."); return; }
    users.push({ username, password, role: accountType!, name: String(data.get("fullName") || ""), email, district: String(data.get("district") || ""), schoolName: String(data.get("schoolName") || ""), schoolId: String(data.get("schoolId") || ""), lrn: String(data.get("lrn") || "") });
    localStorage.setItem("helps_users", JSON.stringify(users));
    window.dispatchEvent(new Event("helps-data-updated"));
    setAccountType(null);
    setMessage("Account created successfully. You may now log in.");
    event.currentTarget.reset();
  }

  function resetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    const username = String(data.get("recoveryUsername") || "").trim();
    const accountRole = String(data.get("recoveryRole") || "");
    const identifier = String(data.get("recoveryIdentifier") || "").trim();
    const newPassword = String(data.get("recoveryPassword") || "");
    const confirmPassword = String(data.get("recoveryConfirmPassword") || "");
    if (!username || !accountRole || !identifier || !newPassword || !confirmPassword) { setError("Please complete all required fields."); return; }
    if (username.toLowerCase() === "administrator") { setError("The primary administrator password cannot be reset here. Please contact the system administrator."); return; }
    if (newPassword.length < 8) { setError("New password must contain at least 8 characters."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    const users: SavedUser[] = JSON.parse(localStorage.getItem("helps_users") || "[]");
    const index = users.findIndex((user) => user.username.toLowerCase() === username.toLowerCase() && user.role === accountRole);
    if (index < 0) { setError("Account not found. Check the username and account type."); return; }
    const user = users[index];
    const savedIdentifier = user.role === "student" ? user.lrn : user.schoolId;
    if (!savedIdentifier || savedIdentifier.trim().toLowerCase() !== identifier.toLowerCase()) {
      setError(user.role === "student" ? "The LRN does not match this account." : "The School ID does not match this account.");
      return;
    }
    users[index] = { ...user, password: newPassword };
    localStorage.setItem("helps_users", JSON.stringify(users));
    window.dispatchEvent(new Event("helps-data-updated"));
    setShowRecovery(false);
    setMessage("Password reset successfully. You may now log in with your new password.");
    event.currentTarget.reset();
  }

  return (
    <main className="reference-login">
      <div className="login-decoration top-ring" aria-hidden="true"/><div className="login-decoration bottom-ring" aria-hidden="true"/>
      <span className="login-dot dot-one" aria-hidden="true"/><span className="login-dot dot-two" aria-hidden="true"/>
      <section className="reference-login-card" aria-labelledby="login-title">
        <div className="login-logo-wrap"><img src="/project-helps-logo.png" alt="Project HELPS"/></div>
        <h1 id="login-title" className="sr-only">Log in to Project HELPS</h1>
        <form className="reference-login-form" onSubmit={logIn}>
          <label><span>Username</span><input name="username" type="text" placeholder="e.g. school.admin" autoComplete="username" required/></label>
          <label><span className="password-label"><span>Password</span><button className="forgot-password-link" type="button" onClick={() => { setError(""); setMessage(""); setShowRecovery(true); }}>Forgot password?</button></span><span className="password-field"><input name="password" type={showPassword ? "text" : "password"} placeholder="Enter your password" autoComplete="current-password" required/><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? "◉" : "◌"}</button></span></label>
          {error && !accountType && <p className="form-alert error" role="alert">{error}</p>}
          {message && <p className="form-alert success" role="status">{message}</p>}
          <button className="reference-login-button" type="submit">Log in <span>→</span></button>
        </form>
        <div className="account-balloon">
          <span className="balloon-tip" aria-hidden="true"/>
          <strong>Create an account</strong><p>Select the type of account you want to register.</p>
          <div><button onClick={() => {setError("");setAccountType("school")}}><span className="account-icon school-icon">▣</span><span><b>School Account</b><small>For teachers and school staff</small></span></button><button onClick={() => {setError("");setAccountType("student")}}><span className="account-icon person-icon">♙</span><span><b>Student Account</b><small>For registered learners</small></span></button></div>
        </div>
        <div className="reference-security-note"><span aria-hidden="true">♢</span><p>Created accounts are saved only in this browser for this demonstration.</p></div>
      </section>
      <p className="reference-footer">© 2026 Project HELPS · SDO Cebu Province</p>

      {accountType && <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title"><section className="account-dialog"><header><span className={`account-icon ${accountType === "school" ? "school-icon" : "person-icon"}`}>{accountType === "school" ? "▣" : "♙"}</span><div><small>Project HELPS registration</small><h2 id="account-dialog-title">Create {accountType === "school" ? "School" : "Student"} Account</h2></div><button type="button" onClick={() => setAccountType(null)} aria-label="Close dialog">×</button></header><form onSubmit={createAccount}>
        {accountType === "school" ? <><div className="dialog-grid"><label>District<input name="district" required placeholder="Enter district"/></label><label>School ID<input name="schoolId" required placeholder="Enter School ID"/></label></div><label>School Name<input name="schoolName" required placeholder="Official school name"/></label><label>Name <small>(Firstname Lastname)</small><input name="fullName" required placeholder="Juan Dela Cruz"/></label></> : <><label>LRN <small>(Must be 12-digit number)</small><input name="lrn" required inputMode="numeric" pattern="[0-9]{12}" minLength={12} maxLength={12} placeholder="000000000000"/></label><label>School Name<input name="schoolName" required placeholder="Official school name"/></label><label>Student Name <small>(Firstname Lastname)</small><input name="fullName" required placeholder="Juan Dela Cruz"/></label></>}
        <label>Email Address<input name="email" type="email" required placeholder="name@example.com" autoComplete="email"/></label><label>Username<input name="newUsername" required minLength={4} placeholder="Choose a username"/></label><div className="dialog-grid"><label>Password<input name="newPassword" type="password" required minLength={8} placeholder="At least 8 characters"/></label><label>Confirm Password<input name="confirmPassword" type="password" required minLength={8} placeholder="Repeat password"/></label></div>
        {error && <p className="form-alert error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" onClick={() => setAccountType(null)}>Cancel</button><button type="submit">Create Account →</button></div>
      </form></section></div>}
      {showRecovery && <div className="account-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="recovery-dialog-title"><section className="account-dialog recovery-dialog"><header><span className="account-icon school-icon">↻</span><div><small>Secure account recovery</small><h2 id="recovery-dialog-title">Reset your password</h2></div><button type="button" onClick={() => { setShowRecovery(false); setError(""); }} aria-label="Close dialog">×</button></header><form onSubmit={resetPassword} noValidate>
        <p className="recovery-help">Verify your registered account details, then choose a new password.</p>
        <label>Account Type<select name="recoveryRole" required defaultValue=""><option value="" disabled>Select account type</option><option value="school">Teacher / School Account</option><option value="student">Student Account</option></select></label>
        <label>Username<input name="recoveryUsername" required placeholder="Enter your registered username" autoComplete="username"/></label>
        <label>LRN or School ID <small>(Students: 12-digit LRN · Teachers: School ID)</small><input name="recoveryIdentifier" required placeholder="Enter your LRN or School ID"/></label>
        <div className="dialog-grid"><label>New Password<input name="recoveryPassword" type="password" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password"/></label><label>Confirm New Password<input name="recoveryConfirmPassword" type="password" required minLength={8} placeholder="Repeat new password" autoComplete="new-password"/></label></div>
        {error && <p className="form-alert error" role="alert">{error}</p>}<div className="dialog-actions"><button type="button" onClick={() => { setShowRecovery(false); setError(""); }}>Cancel</button><button type="submit">Reset Password →</button></div>
      </form></section></div>}
    </main>
  );
}
