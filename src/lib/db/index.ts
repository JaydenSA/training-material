import "server-only";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";
import type { Transaction } from "./workspace-repository";
const runtime = globalThis as typeof globalThis & { tipitPool?: Pool };
export function getPool() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!runtime.tipitPool) {
    runtime.tipitPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 3,
      connectionTimeoutMillis: 10000,
      idleTimeoutMillis: 30000,
      statement_timeout: 15000,
    });
    runtime.tipitPool.on("error", () =>
      console.error("An idle database connection closed."),
    );
  }
  return runtime.tipitPool;
}
export const withTransaction: Transaction = async (fn) => {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const value = await fn(client);
    await client.query("COMMIT");
    return value;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDatabase() {
  if (!process.env.DATABASE_URL)
    throw new Error("DATABASE_URL is not configured");
  if (!database) database = drizzle(getPool(), { schema });
  return database;
}
