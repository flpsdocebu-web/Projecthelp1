"use client";

import { FormEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import Header from "@/components/Header";
import ExportUsersExcel from "@/components/ExportUsersExcel";
import UserActionIcon from "@/components/UserActionIcon";
import { normalizedDistrict } from "@/lib/district";

type User = {
  id: string;
  username: string;
  email: string;
  role: "administrator" | "school" | "student";
  name: string;
  district?: string;
  schoolName?: string;
  schoolId?: string;
  lrn?: string;
  suspended: boolean;
  online: boolean;
  createdAt?: string;
};

function accountDistrict(value: string | undefined, role: User["role"]) {
  if (!value?.trim()) {
    const label = role === "administrator" ? "Division-wide" : "District not specified";
    return { key: label.toUpperCase(), label };
  }
  return normalizedDistrict(value);
}

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const pendingLoads = useRef(0);
  const loadError = useRef<string | null>(null);
  const searchId = useId();
  const [districtFilter, setDistrictFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const searchPending = search !== appliedSearch;
  const searchBusy = loading || refreshing || searchPending;
  useEffect(() => {
    if (search === appliedSearch) return;
    const timer = window.setTimeout(() => setAppliedSearch(search), 300);
    return () => window.clearTimeout(timer);
  }, [search, appliedSearch]);

  const districtOptions = useMemo(() => {
    const districts = new Map<string, string>();
    users.forEach((user) => {
      if (user.role === "administrator") return;
      const district = accountDistrict(user.district, user.role);
      districts.set(district.key, district.label);
    });
    return Array.from(districts, ([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = appliedSearch.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const district = accountDistrict(user.district, user.role);
      const matchesSearch = !term || [user.name, user.username, user.email, user.schoolName, user.lrn, user.schoolId]
        .some((value) => value?.toLocaleLowerCase().includes(term));
      const matchesDistrict = districtFilter === "all" || district.key === districtFilter;
      const matchesStatus = statusFilter === "all"
        || (statusFilter === "online" && user.online && !user.suspended)
        || (statusFilter === "active" && !user.suspended)
        || (statusFilter === "suspended" && user.suspended);
      return matchesSearch && matchesDistrict && matchesStatus;
    });
  }, [districtFilter, appliedSearch, statusFilter, users]);

  const filtersActive = Boolean(search.trim()) || districtFilter !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setAppliedSearch("");
    setDistrictFilter("all");
    setStatusFilter("all");
  }

  const load = useCallback(async () => {
    pendingLoads.current += 1;
    setRefreshing(true);
    try {
      const response = await fetch("/api/users", { cache: "no-store" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Users could not be loaded.");
      setUsers(result.users || []);
      const previousError = loadError.current;
      if (previousError) setMessage((current) => current === previousError ? "" : current);
      loadError.current = null;
      setIsError(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Users could not be loaded.";
      loadError.current = errorMessage;
      setMessage(errorMessage);
      setIsError(true);
    } finally {
      pendingLoads.current -= 1;
      if (pendingLoads.current === 0) setRefreshing(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = window.setInterval(load, 30_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  async function action(body: Record<string, unknown>, method = "PATCH") {
    const key = String(body.id || "action");
    setBusy(key);
    setMessage("");
    try {
      const response = await fetch("/api/users", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json();
      setMessage(response.ok ? "Account updated successfully." : result.error || "Update failed.");
      setIsError(!response.ok);
      if (response.ok) await load();
    } catch {
      setMessage("The user service is unavailable. Please try again.");
      setIsError(true);
    } finally {
      setBusy(null);
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy("create");
    setMessage("");
    try {
      const response = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form))) });
      const result = await response.json();
      setMessage(response.ok ? "Division Personnel administrator created." : result.error || "Account could not be created.");
      setIsError(!response.ok);
      if (response.ok) { form.reset(); await load(); }
    } catch {
      setMessage("The user service is unavailable. Please try again.");
      setIsError(true);
    } finally {
      setBusy(null);
    }
  }

  function accountTable(title: string, description: string, role: User["role"]) {
    const totalRows = users.filter((user) => user.role === role).length;
    const rows = filteredUsers.filter((user) => user.role === role);
    const grouped = Array.from(rows.reduce((map, user) => {
      const district = accountDistrict(user.district, role);
      const current = map.get(district.key) || { label: district.label, users: [] };
      map.set(district.key, { label: current.label, users: [...current.users, user] });
      return map;
    }, new Map<string, { label: string; users: User[] }>())).sort(([, a], [, b]) => a.label.localeCompare(b.label));
    const created = (value?: string) => value ? new Date(value).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "—";

    return <section className="user-table-card">
      <header><div><h2>{title}</h2><p>{description}</p></div><strong aria-label={`${rows.length} displayed out of ${totalRows} accounts`}>{filtersActive ? `${rows.length}/${totalRows}` : rows.length}</strong></header>
      {rows.length === 0 ? <div className="user-table-empty">{loading ? "Loading accounts…" : filtersActive ? "No accounts match the selected filters." : `No ${title.toLowerCase()} found.`}</div> :
        <div className="district-account-groups">{grouped.map(([districtKey, district]) =>
          <section className="district-account-container" key={districtKey}>
            <header><div><small>District</small><h3>{district.label}</h3></div><span className="district-header-actions"><strong>{district.users.length} account{district.users.length === 1 ? "" : "s"}</strong><ExportUsersExcel users={district.users} districtName={district.label} compact disabled={searchBusy}/></span></header>
            <div className="user-table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Email</th><th>School</th><th>Date and time created</th><th>Status</th><th>Actions</th></tr></thead><tbody>
              {district.users.map((user) => <tr key={user.id}>
                <td><strong>{user.name || "—"}</strong>{user.lrn && <small className="account-detail">LRN: {user.lrn}</small>}</td>
                <td>{user.username}</td><td>{user.email}</td>
                <td>{user.schoolName || "—"}{user.schoolId && <small className="account-detail">ID: {user.schoolId}</small>}</td>
                <td><time dateTime={user.createdAt}>{created(user.createdAt)}</time></td>
                <td><span className={`presence-status ${user.online && !user.suspended ? "online" : "offline"}`}><i/>{user.online && !user.suspended ? "Online" : "Offline"}</span><span className={`account-status ${user.suspended ? "suspended" : "active"}`}>{user.suspended ? "Suspended" : "Active"}</span></td>
                <td><div className="user-actions">
                  <button className="user-action-icon" type="button" title="Reset password" aria-label={`Reset password for ${user.username}`} disabled={busy === user.id || searchBusy} onClick={() => { const password = prompt("Enter a new password (minimum 8 characters)"); if (password) void action({ id: user.id, action: "reset", password }); }}><UserActionIcon name="reset"/></button>
                  <button className="user-action-icon suspend" type="button" title={user.suspended ? "Activate account" : "Suspend account"} aria-label={`${user.suspended ? "Activate" : "Suspend"} account for ${user.username}`} disabled={busy === user.id || searchBusy} onClick={() => void action({ id: user.id, action: "suspend", suspended: !user.suspended })}><UserActionIcon name={user.suspended ? "activate" : "suspend"}/></button>
                  <button className="user-action-icon delete" type="button" title="Delete account" aria-label={`Delete account for ${user.username}`} disabled={busy === user.id || searchBusy} onClick={() => confirm(`Delete ${user.username}?`) && void action({ id: user.id }, "DELETE")}><UserActionIcon name="delete"/></button>
                </div></td>
              </tr>)}
            </tbody></table></div>
          </section>)}</div>}
    </section>;
  }

  return <AdminGuard><main className="dashboard user-management"><Header compact/><section className="user-shell">
    <div className="user-page-head"><div><span className="eyebrow green">Administration</span><h1>User Management</h1><p>Centralized MySQL accounts and access controls.</p></div><div className="user-page-actions"><ExportUsersExcel users={filteredUsers} disabled={searchBusy}/><div className="online-user-total"><i/><span><strong>{users.filter((user) => user.online && !user.suspended).length}</strong><small>Users online</small></span></div></div></div>
    {message && <p className={`user-message ${isError ? "error" : ""}`} role="status">{message}</p>}
    <section className="personnel-create"><div><span className="eyebrow green">Administrator access</span><h2>Create Division Personnel</h2><p>Create an administrator account for authorized division personnel.</p></div><form onSubmit={create}>
      <label>Name<input name="name" autoComplete="name" required/></label><label>Email<input name="email" type="email" autoComplete="email" required/></label><label>Username<input name="username" autoComplete="username" required/></label><label>Password<input name="password" type="password" minLength={8} autoComplete="new-password" required/></label><button type="submit" disabled={busy === "create"}>{busy === "create" ? "Creating…" : "Create administrator"}</button>
    </form></section>
    <section className="user-filter-panel" aria-label="Filter user accounts">
      <div className="user-filter-heading"><div><span className="eyebrow green">Find accounts</span><h2>Search and filter users</h2></div><p aria-busy={searchBusy}><strong>{filteredUsers.length}</strong> of {users.length} accounts displayed</p></div>
      <div className="user-filter-controls">
        <label className="user-search-field" htmlFor={searchId}><span>Search by name or username</span><span className="user-search-input-wrap"><input id={searchId} type="search" value={search} onChange={(event) => setSearch(event.target.value)} onFocus={() => { if (!loading && !refreshing) void load(); }} placeholder="Enter a name, username, email, school, or LRN…" autoComplete="off" aria-busy={searchBusy} aria-describedby={`${searchId}-status`}/>{searchBusy && <i className="user-search-spinner" aria-hidden="true"/>}</span></label>
        <label><span>District</span><select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}><option value="all">All districts</option>{districtOptions.map((district) => <option key={district.key} value={district.key}>{district.label}</option>)}</select></label>
        <label><span>Account status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">All statuses</option><option value="online">Online now</option><option value="active">Active</option><option value="suspended">Suspended</option></select></label>
        <button type="button" onClick={clearFilters} disabled={!filtersActive}>Clear filters</button>
      </div>
      <div id={`${searchId}-status`} className="user-search-progress" role="status" aria-live="polite">{searchBusy ? <><i className="user-search-spinner" aria-hidden="true"/>{searchPending ? "Searching users…" : loading ? "Loading user accounts…" : "Updating user list…"}</> : ""}</div>
    </section>
    {accountTable("Student Accounts", "Registered learners and their school information.", "student")}
    {accountTable("Teacher / School Accounts", "Registered school personnel and district assignments.", "school")}
    {accountTable("Division Personnel", "Administrators with division-level access.", "administrator")}
  </section></main></AdminGuard>;
}
