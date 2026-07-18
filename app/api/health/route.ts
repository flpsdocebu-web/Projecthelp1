import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bcrypt, ensurePrimaryAdmin } from "@/lib/auth";

const safeCode = (error: unknown) => {
  const code = (error as { code?: string })?.code || "DATABASE_ERROR";
  return [
    "ER_ACCESS_DENIED_ERROR",
    "ER_BAD_DB_ERROR",
    "ER_NO_SUCH_TABLE",
    "ECONNREFUSED",
    "ENOTFOUND",
    "ETIMEDOUT",
  ].includes(code)
    ? code
    : code === "ADMIN_USERNAME_CONFLICT"
      ? code
      : "DATABASE_ERROR";
};

export async function GET() {
  const missingDatabase = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"].filter(
    (key) => !process.env[key],
  );
  const missingAdministrator = ["ADMIN_USERNAME", "ADMIN_PASSWORD", "ADMIN_EMAIL"].filter(
    (key) => !process.env[key],
  );

  if (missingDatabase.length) {
    return NextResponse.json(
      { ok: false, code: "MISSING_ENVIRONMENT_VARIABLES", missing: missingDatabase, revision: "admin-sync-2" },
      { status: 503 },
    );
  }

  try {
    await db.query("SELECT 1");
    const [tableRows] = await db.query<any[]>(
      "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema=? AND table_name IN ('users','sessions','resources','resource_activity','password_reset_tokens')",
      [process.env.DB_NAME],
    );
    const tables = Number(tableRows[0]?.count || 0);
    if (tables !== 5) {
      return NextResponse.json(
        { ok: false, databaseConnected: true, schemaTables: tables, code: "SCHEMA_NOT_IMPORTED", revision: "admin-sync-2" },
        { status: 503 },
      );
    }

    if (missingAdministrator.length) {
      return NextResponse.json(
        { ok: false, databaseConnected: true, code: "ADMIN_ENVIRONMENT_MISSING", missing: missingAdministrator, revision: "admin-sync-2" },
        { status: 503 },
      );
    }

    await ensurePrimaryAdmin();
    const [adminRows] = await db.query<any[]>(
      "SELECT role,email,password_hash,suspended FROM users WHERE username=? LIMIT 1",
      [process.env.ADMIN_USERNAME!.trim()],
    );
    const administrator = adminRows[0];
    const passwordMatches = Boolean(
      administrator && (await bcrypt.compare(process.env.ADMIN_PASSWORD!, administrator.password_hash)),
    );
    const administratorReady = Boolean(
      administrator &&
        administrator.role === "administrator" &&
        !administrator.suspended &&
        administrator.email === process.env.ADMIN_EMAIL!.trim() &&
        passwordMatches,
    );

    return NextResponse.json(
      {
        ok: administratorReady,
        databaseConnected: true,
        schemaTables: tables,
        administratorReady,
        code: administratorReady ? "READY" : "ADMINISTRATOR_NOT_READY",
        revision: "admin-sync-2",
      },
      { status: administratorReady ? 200 : 503 },
    );
  } catch (error) {
    const code = safeCode(error);
    console.error("Project HELPS health check failed", { code });
    return NextResponse.json(
      { ok: false, databaseConnected: false, code, revision: "admin-sync-2" },
      { status: 503 },
    );
  }
}
