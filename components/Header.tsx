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

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => setSession(data.user || null))
      .catch(() => setSession(null))
      .finally(() => setChecked(true));
  }, []);

  function protectedNav(event: MouseEvent<HTMLAnchorElement>, destination: string, adminOnly = false) {
    event.preventDefault();
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
      <nav>
        <Link className={pathname.startsWith("/home") ? "active" : ""} href="/home1/" onClick={(event) => protectedNav(event, "/home1/")}>Home</Link>
        <Link className={pathname.startsWith("/library") ? "active" : ""} href="/library1/" onClick={(event) => protectedNav(event, "/library1/")}>Learning Resources</Link>
        {checked && session?.role === "administrator" && <>
          <Link className={pathname.startsWith("/dashboard") ? "active" : ""} href="/dashboard1/" onClick={(event) => protectedNav(event, "/dashboard1/", true)}>Dashboard</Link>
          <Link className={pathname.startsWith("/users") ? "active" : ""} href="/users/" onClick={(event) => protectedNav(event, "/users/", true)}>User Management</Link>
        </>}
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
