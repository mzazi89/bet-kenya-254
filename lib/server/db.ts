import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const globalForDb = globalThis as unknown as { bkPool?: pg.Pool };

export const pool =
  globalForDb.bkPool ??
  new Pool({
    connectionString,
    ssl: connectionString?.includes("sslmode=require") ? { rejectUnauthorized: false } : undefined,
    max: 4,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.bkPool = pool;

export function assertDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("Database not configured (DATABASE_URL missing)");
  }
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<pg.QueryResult<T>> {
  assertDb();
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  assertDb();
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
