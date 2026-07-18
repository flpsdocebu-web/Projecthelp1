"use client";

import Link from "next/link";
import { MouseEvent, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import styles from "./Header.module.css";

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
    <header className={`${styles.header} ${compact ? styles.compact : styles.overlay}`}>
      <Link className={styles.brand} href="/home/">
        <img src="/project-helps-logo.png" alt="Project HELPS" />
        <span>
          <strong>Project HELPS</strong>
          <small>SDO Cebu Province</small>
        </span>
      </Link>
      <nav className={styles.nav} aria-label="Primary navigation">
        <Link
          className={pathname.startsWith("/home") ? styles.active : ""}
          href="/home/"
          onClick={(event) => protectedNav(event, "/home/")}
        >
          Home
        </Link>
        <Link
          className={pathname.startsWith("/library") ? styles.active : ""}
          href="/library/"
          onClick={(event) => protectedNav(event, "/library/")}
        >
          Learning Resources
        </Link>
        {checked && session?.role === "administrator" && (
          <>
            <Link
              className={pathname.startsWith("/dashboard") ? styles.active : ""}
              href="/dashboard/"
              onClick={(event) => protectedNav(event, "/dashboard/", true)}
            >
              Dashboard
            </Link>
            <Link
              className={pathname.startsWith("/users") ? styles.active : ""}
              href="/users/"
              onClick={(event) => protectedNav(event, "/users/", true)}
            >
              User Management
            </Link>
          </>
        )}
      </nav>
      <div className={styles.actions}>
        {checked && session ? (
          <>
            <span className={styles.user}>
              <small>Signed in as</small>
              <strong>
                {session.role === "administrator"
                  ? "Administrator"
                  : session.name || session.username}
              </strong>
            </span>
            <button className={styles.logout} type="button" onClick={logout}>
              Log out
            </button>
          </>
        ) : checked ? (
          <>
            <Link className={styles.login} href="/login/">
              Log in
            </Link>
            <Link className={styles.create} href="/login/">
              Create account
            </Link>
          </>
        ) : null}
      </div>
    </header>
  );
}
