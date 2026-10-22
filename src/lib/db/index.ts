import 'server-only';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';
let database: ReturnType<typeof drizzle<typeof schema>> | undefined;
export function getDatabase() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not configured');
  if (!database) database = drizzle(new Pool({ connectionString: process.env.DATABASE_URL, max: 3 }), { schema });
  return database;
}
