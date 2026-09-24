import { NextResponse } from "next/server";
import { databaseConfig, databasePoolConfig, db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseHeaders = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET() {
  const startedAt = performance.now();
  if (!databaseConfig.host || !databaseConfig.name || !databaseConfig.user || !databaseConfig.password) {
    return NextResponse.json(
      { ok: false, status: "misconfigured", code: "DATABASE_CONFIGURATION_MISSING" },
      { status: 503, headers: responseHeaders },
    );
  }

  try {
    await db.query({ sql: "SELECT 1 AS healthy", timeout: 3000 });
    return NextResponse.json(
      {
        ok: true,
        status: "healthy",
        latencyMs: Math.max(1, Math.round(performance.now() - startedAt)),
        pool: {
          connectionLimit: databasePoolConfig.connectionLimit,
          queueLimit: databasePoolConfig.queueLimit,
        },
      },
      { status: 200, headers: responseHeaders },
    );
  } catch (error) {
    const code = (error as { code?:string })?.code || "DATABASE_UNAVAILABLE";
    console.error("Project HELPS database readiness check failed", { code });
    return NextResponse.json(
      { ok: false, status: "unavailable", code: "DATABASE_UNAVAILABLE" },
      { status: 503, headers: { ...responseHeaders, "Retry-After": "5" } },
    );
  }
}
