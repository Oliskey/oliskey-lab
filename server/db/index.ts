import pg from 'pg';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// One connection pool. DATABASE_URL comes from the host's secret settings and is never logged.
export const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10, ssl: process.env.DATABASE_SSL === 'require' ? { rejectUnauthorized: false } : undefined });
export const q = <T extends pg.QueryResultRow = any>(text: string, values?: unknown[]) => pool.query<T>(text, values);
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; }
  catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
}
export async function migrate() {
  const dir = path.dirname(fileURLToPath(import.meta.url));
  await pool.query(readFileSync(path.join(dir, 'schema.sql'), 'utf8'));
}
