import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import pg from "pg";
loadEnvConfig(process.cwd());
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not configured.");
  process.exit(1);
}
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 10000,
  statement_timeout: 15000,
});
try {
  const result = await pool.query(
    "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  console.log(
    JSON.stringify({
      connected: true,
      publicTables: result.rows.map((row) => row.tablename),
    }),
  );
} catch (error) {
  console.error(
    JSON.stringify({
      connected: false,
      code: error.code || "connection_failed",
    }),
  );
  process.exitCode = 1;
} finally {
  await pool.end();
}
