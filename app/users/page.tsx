"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import Header from "@/components/Header";

type User = {
  id: string;
  username: string;
  email: string;
  role: "administrator" | "school" | "student";
  name: string;
  district?: string;
  schoolName?: string;
  suspended: boolean;
};

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Users could not be loaded.");
      setUsers(result.users || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Users could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function action(body: Record<string, unknown>, method = "PATCH") {
    const id = String(body.id || "action");
    setBusyId(id);
    setMessage("");
    try {
      const response = await fetch("/api/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      setMessage(response.ok ? "Account updated successfully." : result.error || "Update failed.");
      if (response.ok) await load();
    } catch {
      setMessage("The account service is unavailable. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    setBusyId("create");
    setMessage("");
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await response.json();
      setMessage(response.ok ? "Division Personnel administrator created." : result.error || "Creation failed.");
      if (response.ok) {
        form.reset();
        await load();
      }
    } catch {
      setMessage("The account service is unavailable. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  function table(title: string, role: User["role"]) {
    const rows = users.filter((user) => user.role === role);
    return (
      <section className="user-table-section">
        <div className="user-section-heading">
          <h2>{title}</h2>
          <span>{rows.length} {rows.length === 1 ? "account" : "accounts"}</span>
        </div>
        <div className="user-table-wrap">
          <div className="user-table">
            <div className="user-table-head">
              <span>Name</span><span>Username</span><span>District / School</span><span>Actions</span>
            </div>
            {rows.length === 0 ? (
              <div className="user-empty">No {title.toLowerCase()} found.</div>
            ) : rows.map((user) => (
              <div className="user-table-row" key={user.id}>
                <span data-label="Name"><b>{user.name}</b><small>{user.email}</small></span>
                <span data-label="Username"><b>{user.username}</b>{user.suspended && <small className="suspended-label">Suspended</small>}</span>
                <span data-label="District / School">{user.district || "—"}<small>{user.schoolName || ""}</small></span>
                <span className="user-actions" data-label="Actions">
                  <button type="button" disabled={busyId === user.id} onClick={() => {
                    const password = prompt("Enter a new password (minimum 8 characters)");
                    if (password) void action({ id: user.id, action: "reset", password });
                  }}>Reset</button>
                  <button type="button" disabled={busyId === user.id} onClick={() => void action({ id: user.id, action: "suspend", suspended: !user.suspended })}>{user.suspended ? "Activate" : "Suspend"}</button>
                  <button className="danger" type="button" disabled={busyId === user.id} onClick={() => confirm(`Delete ${user.username}?`) && void action({ id: user.id }, "DELETE")}>Delete</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <AdminGuard>
      <main className="dashboard user-management">
        <Header compact />
        <section className="user-shell">
          <div className="user-page-head">
            <div><span className="eyebrow green">Administration</span><h1>User Management</h1><p>Centralized MySQL accounts and access controls.</p></div>
            <div className="user-total"><strong>{users.length}</strong><span>Total accounts</span></div>
          </div>
          {message && <p className="user-message" role="status">{message}</p>}
          <section className="personnel-create">
            <div><span className="eyebrow green">Administrator access</span><h2>Create Division Personnel</h2><p>Add an authorized division administrator.</p></div>
            <form onSubmit={create}>
              <label>Name<input name="name" autoComplete="name" required /></label>
              <label>Email<input name="email" type="email" autoComplete="email" required /></label>
              <label>Username<input name="username" autoComplete="username" required /></label>
              <label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required /></label>
              <button type="submit" disabled={busyId === "create"}>{busyId === "create" ? "Creating…" : "Create administrator account"}</button>
            </form>
          </section>
          {loading ? <div className="user-loading">Loading user accounts…</div> : <>{table("Student Accounts", "student")}{table("Teacher / School Accounts", "school")}{table("Division Personnel", "administrator")}</>}
        </section>
      </main>
    </AdminGuard>
  );
}
