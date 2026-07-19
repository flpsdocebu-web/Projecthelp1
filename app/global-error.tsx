"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <html lang="en"><body style={{ margin: 0 }}><main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#eef8f3", fontFamily: "Arial,sans-serif" }}><section style={{ width: "min(520px,100%)", padding: 36, borderRadius: 20, background: "white", textAlign: "center" }}><img src="/project-helps-logo.png" alt="Project HELPS" style={{ width: 110 }} /><h1 style={{ color: "#082b54" }}>Project HELPS is recovering</h1><p style={{ color: "#607888" }}>Please reload the latest website version.</p><button onClick={() => { reset(); window.location.reload(); }} style={{ padding: "12px 18px", border: 0, borderRadius: 10, color: "white", background: "#278b64", cursor: "pointer" }}>Reload website</button></section></main></body></html>;
}
