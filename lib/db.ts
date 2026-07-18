import mysql from "mysql2/promise";

const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;
for (const key of required) if (!process.env[key]) console.warn(`Missing database environment variable: ${key}`);

const globalForDb = globalThis as unknown as { helpsPool?: mysql.Pool };
export const db = globalForDb.helpsPool ?? mysql.createPool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined,
  connectionLimit: 10,
  waitForConnections: true,
  enableKeepAlive: true,
});
if (process.env.NODE_ENV !== "production") globalForDb.helpsPool = db;
