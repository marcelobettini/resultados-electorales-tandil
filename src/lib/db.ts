import mysql from "mysql2/promise";
import { reportarExitoDb, reportarFallaDb } from "@/lib/seg/db-circuit";

const globalForDb = globalThis as unknown as { dbPool?: mysql.Pool };

function connectTimeoutMs(): number {
  const raw = Number(process.env.DB_CONNECT_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 2000;
}

function createPool(): mysql.Pool {
  return mysql.createPool({
    host: process.env.DB_HOST ?? "localhost",
    port: Number(process.env.DB_PORT ?? 8889),
    user: process.env.DB_USER ?? "root",
    password: process.env.DB_PASSWORD ?? "root",
    database: process.env.DB_NAME ?? "resultados_tandil",
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 0,
    connectTimeout: connectTimeoutMs(),
    dateStrings: true,
  });
}

export const db = globalForDb.dbPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.dbPool = db;
}

export async function pingDb(): Promise<boolean> {
  let conn: mysql.PoolConnection | undefined;
  try {
    conn = await db.getConnection();
    await conn.ping();
    reportarExitoDb();
    return true;
  } catch (error) {
    reportarFallaDb(error);
    return false;
  } finally {
    conn?.release();
  }
}
