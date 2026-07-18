"use client";

import Link from "next/link";
import { MouseEvent, ReactNode } from "react";
import { useRouter } from "next/navigation";

export default function ProtectedLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault();
    let session = null;
    try { session = JSON.parse(sessionStorage.getItem("helps_session") || "null"); }
    catch { session = null; }
    if (!session) {
      sessionStorage.setItem("helps_return_to", href);
      router.push("/login/");
      return;
    }
    router.push(href);
  }

  return <Link href={href} className={className} onClick={handleClick}>{children}</Link>;
}
