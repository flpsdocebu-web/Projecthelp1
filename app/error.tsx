"use client";

import { useEffect } from "react";

export default function RouteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Project HELPS route error", error); }, [error]);
  return <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#eef8f3", fontFamily: "Arial,sans-serif" }}><section style={{ width: "min(520px,100%)", padding: 36, borderRadius: 20, background: "white", boxShadow: "0 18px 50px rgba(18,55,69,.14)", textAlign: "center" }}><img src="/project-helps-logo.png" alt="Project HELPS" style={{ width: 110, height: 110, objectFit: "contain" }} /><h1 style={{ color: "#082b54" }}>Let’s reload this page</h1><p style={{ color: "#607888", lineHeight: 1.6 }}>The website received an incomplete browser response. Your account and files are safe.</p><div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap" }}><button onClick={reset} style={{ padding: "12px 18px", border: 0, borderRadius: 10, color: "white", background: "#278b64", cursor: "pointer" }}>Try again</button><a href="/login1/" style={{ padding: "12px 18px", borderRadius: 10, color: "white", background: "#1167b1", textDecoration: "none" }}>Return to login</a></div></section></main>;
}
