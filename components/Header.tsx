"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Session = { username: string; name: string; role: "administrator" | "school" | "student" };

export default function Header({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const checkSession = () => fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setSession(data.user || null))
      .catch(() => setSession(null))
      .finally(() => setChecked(true));
    void checkSession();
    const heartbeat = window.setInterval(checkSession, 60_000);
    return () => window.clearInterval(heartbeat);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    if (!session) return;
    const idleLimit = 10 * 60 * 1000;
    let idleTimer = 0;
    let lastReset = 0;
    const expireSession = async () => {
      try { await fetch("/api/auth/logout", { method: "POST", cache: "no-store" }); } finally {
        sessionStorage.removeItem("helps_return_to");
        sessionStorage.setItem("helps_logout_reason", "idle");
        window.location.replace("/login1/");
      }
    };
    const resetIdleTimer = () => {
      const now = Date.now();
      if (now - lastReset < 1000) return;
      lastReset = now;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(expireSession, idleLimit);
    };
    const activityEvents = ["pointerdown", "pointermove", "keydown", "scroll", "touchstart"];
    activityEvents.forEach((eventName) => window.addEventListener(eventName, resetIdleTimer, { passive: true }));
    resetIdleTimer();
    return () => {
      window.clearTimeout(idleTimer);
      activityEvents.forEach((eventName) => window.removeEventListener(eventName, resetIdleTimer));
    };
  }, [session]);

  function protectedNav(event: MouseEvent<HTMLAnchorElement>, destination: string, adminOnly = false) {
    event.preventDefault();
    setMobileOpen(false);
    if (!session) {
      sessionStorage.setItem("helps_return_to", destination);
      router.push("/login1/");
      return;
    }
    if (adminOnly && session.role !== "administrator") {
      router.push("/library1/");
      return;
    }
    router.push(destination);
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } finally {
      sessionStorage.removeItem("helps_return_to");
      setSession(null);
      window.location.replace("/login1/");
    }
  }

  return (
    <header className={compact ? "topbar compact" : "topbar"}>
      <Link className="brand" href="/home1/">
        <img src="/project-helps-logo.png" alt="Project HELPS" />
        <span><strong>Project HELPS</strong><small>SDO Cebu Province</small></span>
      </Link>
      <button className="mobile-menu-toggle" type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen((value) => !value)}>
        <span /><span /><span />
      </button>
      <nav className={mobileOpen ? "mobile-open" : ""}>
        <Link className={pathname.startsWith("/home") ? "active" : ""} href="/home1/" onClick={(event) => protectedNav(event, "/home1/")}>Home</Link>
        <Link className={pathname.startsWith("/library") ? "active" : ""} href="/library1/" onClick={(event) => protectedNav(event, "/library1/")}>Learning Resources</Link>
        {checked && session?.role === "administrator" && <>
          <Link className={pathname.startsWith("/dashboard") ? "active" : ""} href="/dashboard1/" onClick={(event) => protectedNav(event, "/dashboard1/", true)}>Dashboard</Link>
          <Link className={pathname.startsWith("/users") ? "active" : ""} href="/users/" onClick={(event) => protectedNav(event, "/users/", true)}>User Management</Link>
        </>}
        <div className="mobile-account-actions">
          {checked && session ? <>
            <span><small>Signed in as</small><strong>{session.role === "administrator" ? "Administrator" : session.name || session.username}</strong></span>
            <button type="button" onClick={logout}>Log out</button>
          </> : checked ? <>
            <Link href="/login1/">Log in</Link>
            <Link className="mobile-create-account" href="/login1/">Create account</Link>
          </> : null}
        </div>
      </nav>
      <div className="header-actions">
        {checked && session ? <>
          <span className="signed-in-user"><small>Signed in as</small><strong>{session.role === "administrator" ? "Administrator" : session.name || session.username}</strong></span>
          <button className="btn ghost" type="button" onClick={logout}>Log out</button>
        </> : checked ? <>
          <Link className="btn ghost" href="/login1/">Log in</Link>
          <Link className="btn primary small" href="/login1/">Create account</Link>
        </> : null}
      </div>
    </header>
  );
}
