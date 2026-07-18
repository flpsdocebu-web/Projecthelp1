"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Session = {
  username: string;
  name: string;
  role: "administrator" | "school" | "student";
};

export default function Header({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setSession(data.user || null))
      .finally(() => setChecked(true));
  }, []);

  function protectedNav(
    event: MouseEvent<HTMLAnchorElement>,
    destination: string,
    adminOnly = false,
  ) {
    event.preventDefault();
    if (!session) {
      sessionStorage.setItem("helps_return_to", destination);
      router.push("/login/");
      return;
    }
    if (adminOnly && session.role !== "administrator") {
      router.push("/library/");
      return;
    }
    router.push(destination);
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setSession(null);
    router.replace("/login/");
    router.refresh();
  }

  return (
    <header className={compact ? "topbar compact" : "topbar"}>
      <Link className="brand" href="/home/">
        <img src="/project-helps-logo.png" alt="Project HELPS" />
        <span>
          <strong>Project HELPS</strong>
          <small>SDO Cebu Province</small>
        </span>
      </Link>
      <nav>
        <Link
          className={pathname.startsWith("/home") ? "active" : ""}
          href="/home/"
          onClick={(event) => protectedNav(event, "/home/")}
        >
          Home
        </Link>
        <Link
          className={pathname.startsWith("/library") ? "active" : ""}
          href="/library/"
          onClick={(event) => protectedNav(event, "/library/")}
        >
          Learning Resources
        </Link>
        {checked && session?.role === "administrator" && (
          <>
            <Link
              className={pathname.startsWith("/dashboard") ? "active" : ""}
              href="/dashboard/"
              onClick={(event) => protectedNav(event, "/dashboard/", true)}
            >
              Dashboard
            </Link>
            <Link
              className={pathname.startsWith("/users") ? "active" : ""}
              href="/users/"
              onClick={(event) => protectedNav(event, "/users/", true)}
            >
              User Management
            </Link>
          </>
        )}
      </nav>
      <div className="header-actions">
        {checked && session ? (
          <>
            <span className="signed-in-user">
              <small>Signed in as</small>
              <strong>
                {session.role === "administrator"
                  ? "Administrator"
                  : session.name || session.username}
              </strong>
            </span>
            <button className="btn ghost" type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : checked ? (
          <>
            <Link className="btn ghost" href="/login/">
              Log in
            </Link>
            <Link className="btn primary small" href="/login/">
              Create account
            </Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
