"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, useEffect, useState } from "react";

type Session = { username: string; role: "administrator" | "school" | "student" };

export default function Header({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<Session | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    setSession(getSession());
    setSessionChecked(true);
  }, [pathname]);

  function getSession(): Session | null {
    try { return JSON.parse(sessionStorage.getItem("helps_session") || "null"); }
    catch { return null; }
  }

  function openProtected(event: MouseEvent<HTMLAnchorElement>, destination: string, administratorOnly = false) {
    event.preventDefault();
    const session = getSession();
    if (!session) {
      sessionStorage.setItem("helps_return_to", destination);
      router.push("/login/");
      return;
    }
    if (administratorOnly && session.role !== "administrator") {
      sessionStorage.setItem("helps_notice", "The administrator dashboard is restricted to authorized administrators.");
      router.push("/library/");
      return;
    }
    router.push(destination);
  }

  function logOut() {
    sessionStorage.removeItem("helps_session");
    sessionStorage.removeItem("helps_return_to");
    setSession(null);
    router.push("/login/");
  }

  return (
    <header className={`topbar ${compact ? "compact" : ""}`}>
      <Link className="brand" href="/home/">
        <img src="/project-helps-logo.png" alt="Project HELPS" />
        <span><strong>Project HELPS</strong><small>SDO Cebu Province</small></span>
      </Link>
      <nav aria-label="Primary navigation">
        <Link className={pathname.startsWith("/home") ? "active" : ""} href="/home/" onClick={(event) => openProtected(event, "/home/")}>Home</Link>
        <Link className={pathname.startsWith("/library") ? "active" : ""} href="/library/" onClick={(event) => openProtected(event, "/library/")}>Learning Resources</Link>
        {sessionChecked && session?.role === "administrator" && <Link className={pathname.startsWith("/dashboard") ? "active" : ""} href="/dashboard/" onClick={(event) => openProtected(event, "/dashboard/", true)}>Dashboard</Link>}
        {sessionChecked && session?.role === "administrator" && <Link className={pathname.startsWith("/users") ? "active" : ""} href="/users/" onClick={(event) => openProtected(event, "/users/", true)}>User Management</Link>}
      </nav>
      <div className="header-actions">
        {sessionChecked && session ? (
          <>
            <span className="signed-in-user"><small>Signed in as</small><strong>{session.role === "administrator" ? "Administrator" : session.username}</strong></span>
            <button className="btn logout-button" type="button" onClick={logOut}>Sign out</button>
          </>
        ) : sessionChecked ? (
          <>
            <Link className="btn ghost" href="/login/">Log in</Link>
            <Link className="btn primary small" href="/login/">Create account</Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
