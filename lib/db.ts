import mysql from "mysql2/promise";

const required = ["DB_HOST", "DB_NAME", "DB_USER", "DB_PASSWORD"] as const;
const environmentValue = (key:string) => {
  const value = process.env[key]?.trim() || "";
  const accidentalPrefix = `${key}=`;
  return value.startsWith(accidentalPrefix) ? value.slice(accidentalPrefix.length).trim() : value;
};
for (const key of required) if (!environmentValue(key)) console.warn(`Missing database environment variable: ${key}`);

const configuredPort = Number(environmentValue("DB_PORT") || 3306);
const databasePort = Number.isInteger(configuredPort) && configuredPort > 0 && configuredPort <= 65535
  ? configuredPort
  : 3306;
export const databaseConfig = {
  host: environmentValue("DB_HOST"),
  port: databasePort,
  name: environmentValue("DB_NAME"),
  user: environmentValue("DB_USER"),
  password: environmentValue("DB_PASSWORD"),
};

const globalForDb = globalThis as unknown as { helpsPool?: mysql.Pool };
export const db = globalForDb.helpsPool ?? mysql.createPool({
  host: databaseConfig.host,
  port: databaseConfig.port,
  database: databaseConfig.name,
  user: databaseConfig.user,
  password: databaseConfig.password,
  ssl: environmentValue("DB_SSL").toLowerCase() === "true" ? { rejectUnauthorized: true } : undefined,
  connectionLimit: 10,
  connectTimeout: 8000,
  waitForConnections: true,
  enableKeepAlive: true,
});
if (process.env.NODE_ENV !== "production") globalForDb.helpsPool = db;
