import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

type Db = NodePgDatabase<typeof schema>;

// Next dev reloads modules on every edit; cache the pool on globalThis so we
// don't leak a new one per hot reload.
const globalForDb = globalThis as unknown as { __pool?: Pool; __db?: Db };

function getDb(): Db {
  if (globalForDb.__db) return globalForDb.__db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString, max: 10 });
  const instance = drizzle(pool, { schema });

  globalForDb.__pool = pool;
  globalForDb.__db = instance;
  return instance;
}

/**
 * Lazily-connected Drizzle client.
 *
 * `next build` imports every route module to collect page data, and no database
 * is reachable at image-build time — so connecting (or throwing on a missing
 * DATABASE_URL) has to wait until an actual query runs.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop) {
    const instance = getDb() as unknown as Record<string | symbol, unknown>;
    const value = instance[prop];
    return typeof value === "function" ? value.bind(instance) : value;
  },
});

export { schema };
