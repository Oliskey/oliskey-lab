import pg from 'pg';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// One connection pool. DATABASE_URL comes from the host's secret settings and is never logged.
// Local databases use no TLS; anything else (Supabase) uses TLS. Serverless (Vercel) keeps the pool tiny and relies on
// Supabase's pooler (port 6543), which hands connections out per transaction.
const url = process.env.DATABASE_URL || '';
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || process.env.DATABASE_SSL === 'off';
export const pool = new pg.Pool({
  connectionString: url,
  max: process.env.VERCEL ? 2 : 10,
  idleTimeoutMillis: process.env.VERCEL ? 5_000 : 30_000,
  ssl: local ? undefined : { rejectUnauthorized: process.env.DATABASE_CA ? true : false, ca: process.env.DATABASE_CA || undefined },
});
export const q = <T extends pg.QueryResultRow = any>(text: string, values?: unknown[]) => pool.query<T>(text, values);
export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try { await c.query('begin'); const r = await fn(c); await c.query('commit'); return r; }
  catch (e) { await c.query('rollback'); throw e; } finally { c.release(); }
}
/** Applies supabase/migrations/*.sql in order. Every file is written to be safe to run again. */
export async function migrate() {
  const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'supabase', 'migrations');
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.sql')).sort()) await pool.query(readFileSync(path.join(dir, f), 'utf8'));
}
