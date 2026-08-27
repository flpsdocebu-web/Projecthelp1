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
const positiveInteger = (key:string, fallback:number, maximum:number) => {
  const configured = Number(environmentValue(key));
  return Number.isInteger(configured) && configured > 0 ? Math.min(configured, maximum) : fallback;
};
export const databasePoolConfig = {
  connectionLimit: positiveInteger("DB_POOL_LIMIT", 25, 100),
  maxIdle: positiveInteger("DB_POOL_MAX_IDLE", 10, 100),
  queueLimit: positiveInteger("DB_POOL_QUEUE_LIMIT", 1000, 10000),
  connectTimeout: positiveInteger("DB_CONNECT_TIMEOUT_MS", 5000, 30000),
  idleTimeout: positiveInteger("DB_POOL_IDLE_TIMEOUT_MS", 60000, 600000),
};
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
  connectionLimit: databasePoolConfig.connectionLimit,
  maxIdle: Math.min(databasePoolConfig.maxIdle, databasePoolConfig.connectionLimit),
  queueLimit: databasePoolConfig.queueLimit,
  connectTimeout: databasePoolConfig.connectTimeout,
  idleTimeout: databasePoolConfig.idleTimeout,
  waitForConnections: true,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});
globalForDb.helpsPool = db;
