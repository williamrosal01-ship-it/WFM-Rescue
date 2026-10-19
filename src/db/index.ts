import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// The database is optional: the app runs fully in the browser. DATABASE_URL is only
// needed for the /api/health probe (and any future server features). Without it the
// module must not throw, otherwise `next build` fails on Netlify before the env is set.
const databaseUrl = process.env.DATABASE_URL;

export const databaseConfigured = Boolean(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const pool: Pool | null = databaseUrl
  ? globalForDb.__arenaNextJsPostgresqlPool ??
    new Pool({
      connectionString: databaseUrl,
    })
  : null;

if (pool && process.env.NODE_ENV !== "production") {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

export const db = pool ? drizzle(pool) : null;
