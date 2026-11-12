// Oliskey Lab API. Every business route checks the signed-in user's membership and role on the server; the browser is
// never trusted to hide anything. Every change that matters is written to the append-only history.
import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { q, tx } from './db';
import { analyse } from '../shared/inspect';
import { validateSite } from '../shared/generate';
import { makeSite, makeStrategy } from './ai';
import { fetchPage, FetchError } from './fetchSafe';
import type { DiscoveryAnswers, FocusItem, Role, SiteContent } from '../shared/types';

const SECRET = process.env.LAB_JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'dev-only-secret-change-me');
if (!SECRET) throw new Error('LAB_JWT_SECRET must be set in production.');
const PROD = process.env.NODE_ENV === 'production';
const COOKIE = 'lab_session';
const PLATFORMS = ['facebook', 'instagram', 'tiktok', 'youtube', 'linkedin', 'whatsapp', 'google'] as const;
const PERMISSIONS = ['view', 'analytics', 'content', 'publish', 'repository', 'deploy', 'domain', 'release', 'full'] as const;
const NEEDS: Record<string, string> = { view: 'public', analytics: 'analytics', content: 'cms', publish: 'hosting', repository: 'source', deploy: 'hosting', domain: 'domain', release: 'source', full: 'backend' };

interface Ctx { userId: string; name: string; email: string; orgId: string; orgName: string; role: Role }
type R = Request & { ctx: Ctx };
class HttpError extends Error { constructor(readonly status: number, message: string) { super(message); } }
const wrap = (fn: (req: R, res: Response) => Promise<unknown>) => (req: Request, res: Response, next: NextFunction) => fn(req as R, res).catch(next);
const slugify = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'business';
async function uniqueSlug(table: 'organisations' | 'sites', base: string) {
  let s = slugify(base); let n = 1;
  while ((await q(`select 1 from ${table} where slug = $1`, [s])).rowCount) s = `${slugify(base)}-${++n}`;
  return s;
}
const log = (orgId: string, actor: string, action: string, target: string, detail?: string) => q('insert into audit_log (org_id, actor, action, target, detail) values ($1,$2,$3,$4,$5)', [orgId, actor, action, target, detail ?? null]);

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ contentSecurityPolicy: false, frameguard: { action: 'sameorigin' } }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // requests that change data must be JSON from this site (with the same-site cookie this blocks cross-site forgery)
  app.use('/api', (req, _res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    const origin = req.get('origin');
    if (origin && new URL(origin).host !== req.get('host')) return next(new HttpError(403, 'This request came from another website and was refused.'));
    if (req.get('content-length') !== '0' && req.body && !req.is('application/json') && req.get('content-length')) return next(new HttpError(415, 'Send JSON.'));
    next();
  });

  const authLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many attempts. Wait 15 minutes and try again.' } });
  const leadLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 10, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many messages from this connection. Please try again later.' } });
  const inspectLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many inspections this hour. Try again later.' } });

  const setSession = (res: Response, userId: string) => res.cookie(COOKIE, jwt.sign({ sub: userId }, SECRET, { expiresIn: '30d' }), { httpOnly: true, secure: PROD, sameSite: 'lax', maxAge: 30 * 864e5, path: '/' });
  async function loadCtx(req: Request): Promise<Ctx | null> {
    const t = req.cookies?.[COOKIE]; if (!t) return null;
    let sub: string; try { sub = (jwt.verify(t, SECRET) as { sub: string }).sub; } catch { return null; }
    const r = await q(`select u.id, u.name, u.email, m.role, o.id org_id, o.name org_name from users u join memberships m on m.user_id = u.id join organisations o on o.id = m.org_id where u.id = $1 limit 1`, [sub]);
    const x = r.rows[0]; return x ? { userId: x.id, name: x.name, email: x.email, role: x.role, orgId: x.org_id, orgName: x.org_name } : null;
  }
  /** as(role): the request must come from a signed-in member with at least this role. */
  const RANK = { viewer: 0, editor: 1, admin: 2, owner: 3 } as const;
  const as = (min: Role = 'viewer') => (req: Request, _res: Response, next: NextFunction) => {
    loadCtx(req).then((ctx) => {
      if (!ctx) return next(new HttpError(401, 'Please sign in again.'));
      if (RANK[ctx.role] < RANK[min]) return next(new HttpError(403, min === 'editor' ? 'Your role cannot make changes.' : 'Only the owner or an admin can do this.'));
      (req as R).ctx = ctx; next();
    }).catch(next);
  };

  // ---------- session ----------
  app.get('/api/session', wrap(async (req, res) => {
    const c = await loadCtx(req);
    if (!c) return res.json({ session: null });
    const o = (await q('select id, name, slug, plan, created_at from organisations where id = $1', [c.orgId])).rows[0];
    res.json({ session: { user: { id: c.userId, name: c.name, email: c.email }, org: { id: o.id, name: o.name, slug: o.slug, plan: o.plan, createdAt: o.created_at }, role: c.role, demo: false } });
  }));
  const SignUp = z.object({ name: z.string().trim().min(1).max(80), business: z.string().trim().min(1).max(100), email: z.string().trim().toLowerCase().email().max(200), password: z.string().min(10).max(200) });
  app.post('/api/auth/sign-up', authLimit, wrap(async (req, res) => {
    const p = SignUp.safeParse(req.body); if (!p.success) throw new HttpError(400, 'Check your details: a name, business name, valid email and a password of at least 10 characters.');
    const { name, business, email, password } = p.data;
    if ((await q('select 1 from users where email = $1', [email])).rowCount) throw new HttpError(409, 'An account with this email already exists. Sign in instead.');
    const hash = await bcrypt.hash(password, 12); const slug = await uniqueSlug('organisations', business);
    const userId = await tx(async (c) => {
      const u = (await c.query('insert into users (email, name, password_hash) values ($1,$2,$3) returning id', [email, name, hash])).rows[0].id;
      const o = (await c.query('insert into organisations (name, slug) values ($1,$2) returning id', [business, slug])).rows[0].id;
      await c.query("insert into memberships (user_id, org_id, role) values ($1,$2,'owner')", [u, o]);
      await c.query('insert into discovery (org_id, answers) values ($1, $2)', [o, JSON.stringify({ businessName: business })]);
      for (const pf of PLATFORMS) await c.query('insert into social_accounts (org_id, platform) values ($1,$2)', [o, pf]);
      await c.query('insert into audit_log (org_id, actor, action, target) values ($1,$2,$3,$4)', [o, name, 'Created the account', business]);
      return u;
    });
    setSession(res, userId);
    const c = (await loadCtx({ cookies: { [COOKIE]: jwt.sign({ sub: userId }, SECRET) } } as unknown as Request))!;
    res.status(201).json({ user: { id: c.userId, name: c.name, email: c.email }, org: { id: c.orgId, name: c.orgName }, role: c.role, demo: false });
  }));
  app.post('/api/auth/sign-in', authLimit, wrap(async (req, res) => {
    const p = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1).max(200) }).safeParse(req.body);
    if (!p.success) throw new HttpError(400, 'Enter your email and password.');
    const u = (await q('select id, password_hash from users where email = $1', [p.data.email])).rows[0];
    // same answer and similar time whether or not the email exists
    const ok = await bcrypt.compare(p.data.password, u?.password_hash || '$2a$12$abcdefghijklmnopqrstuuJ0yCCsVQh5OMcLUbYgf5Grsa6DmEC.e');
    if (!u || !ok) throw new HttpError(401, 'That email and password do not match.');
    setSession(res, u.id); const c = (await loadCtx({ cookies: { [COOKIE]: jwt.sign({ sub: u.id }, SECRET) } } as unknown as Request))!;
    res.json({ user: { id: c.userId, name: c.name, email: c.email }, org: { id: c.orgId, name: c.orgName }, role: c.role, demo: false });
  }));
  app.post('/api/auth/sign-out', (_req, res) => { res.clearCookie(COOKIE, { path: '/' }); res.json({}); });

  // ---------- discovery and plan ----------
  app.get('/api/discovery', as(), wrap(async (req, res) => {
    const d = (await q('select answers, step, completed_at from discovery where org_id = $1', [req.ctx.orgId])).rows[0];
    res.json({ answers: d?.answers || {}, step: d?.step || 0, completedAt: d?.completed_at || null });
  }));
  app.put('/api/discovery', as('editor'), wrap(async (req, res) => {
    const p = z.object({ answers: z.record(z.any()), step: z.number().int().min(0).max(200) }).safeParse(req.body); if (!p.success) throw new HttpError(400, 'Those answers could not be saved.');
    if (JSON.stringify(p.data.answers).length > 20000) throw new HttpError(413, 'Those answers are too long.');
    await q('insert into discovery (org_id, answers, step, updated_at) values ($1,$2,$3,now()) on conflict (org_id) do update set answers = $2, step = $3, updated_at = now()', [req.ctx.orgId, JSON.stringify(p.data.answers), p.data.step]);
    const d = (await q('select answers, step, completed_at from discovery where org_id = $1', [req.ctx.orgId])).rows[0];
    res.json({ answers: d.answers, step: d.step, completedAt: d.completed_at });
  }));
  app.post('/api/discovery/complete', as('editor'), wrap(async (req, res) => {
    const d = (await q('select answers from discovery where org_id = $1', [req.ctx.orgId])).rows[0];
    const s = await makeStrategy(d.answers as DiscoveryAnswers);
    await q('update discovery set strategy = $2, completed_at = now() where org_id = $1', [req.ctx.orgId, JSON.stringify(s)]);
    await log(req.ctx.orgId, req.ctx.name, 'Completed Business Discovery', req.ctx.orgName);
    res.json(s);
  }));
  app.get('/api/strategy', as(), wrap(async (req, res) => res.json({ strategy: (await q('select strategy from discovery where org_id = $1', [req.ctx.orgId])).rows[0]?.strategy || null })));

  // ---------- sites ----------
  const siteRow = (s: any) => ({ id: s.id, name: s.name, slug: s.slug, status: s.status, liveVersionId: s.live_version_id, draftVersionId: s.draft_version_id, updatedAt: s.updated_at });
  const verRow = (v: any) => ({ id: v.id, siteId: v.site_id, number: v.number, note: v.note, content: v.content, createdAt: v.created_at, createdBy: v.created_by, approvedAt: v.approved_at });
  async function siteDetail(orgId: string, id: string) {
    const s = (await q('select * from sites where id = $1 and org_id = $2', [id, orgId])).rows[0]; if (!s) throw new HttpError(404, 'This website does not exist in your account.');
    const vs = (await q('select * from site_versions where site_id = $1 order by number desc', [id])).rows.map(verRow);
    return { site: siteRow(s), versions: vs, draft: vs.find((v) => v.id === s.draft_version_id)!, live: vs.find((v) => v.id === s.live_version_id) || null };
  }
  const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
  app.get('/api/sites', as(), wrap(async (req, res) => res.json((await q('select * from sites where org_id = $1 order by updated_at desc', [req.ctx.orgId])).rows.map(siteRow))));
  app.post('/api/sites', as('editor'), wrap(async (req, res) => {
    const d = (await q('select answers, completed_at from discovery where org_id = $1', [req.ctx.orgId])).rows[0];
    if (!d?.completed_at) throw new HttpError(400, 'Finish Business Discovery first.');
    const content = await makeSite(d.answers);
    const slug = await uniqueSlug('sites', content.brand.name);
    const site = await tx(async (c) => {
      const s = (await c.query('insert into sites (org_id, name, slug) values ($1,$2,$3) returning *', [req.ctx.orgId, content.brand.name, slug])).rows[0];
      const v = (await c.query("insert into site_versions (site_id, number, note, content, created_by) values ($1, 1, 'First version, made from Discovery', $2, 'Oliskey Lab') returning id", [s.id, JSON.stringify(content)])).rows[0];
      return (await c.query('update sites set draft_version_id = $2 where id = $1 returning *', [s.id, v.id])).rows[0];
    });
    await log(req.ctx.orgId, 'Oliskey Lab', 'Generated website from Discovery', site.name);
    res.status(201).json(siteRow(site));
  }));
  app.get('/api/sites/:id', as(), wrap(async (req, res) => { if (!isUuid(req.params.id)) throw new HttpError(404, 'Not found.'); res.json(await siteDetail(req.ctx.orgId, req.params.id)); }));
  app.put('/api/sites/:id/draft', as('editor'), wrap(async (req, res) => {
    const content = req.body?.content as SiteContent; const note = String(req.body?.note || '').slice(0, 200);
    if (!content || JSON.stringify(content).length > 300000) throw new HttpError(400, 'That website content could not be saved.');
    const errs = validateSite(content); if (errs.length) throw new HttpError(400, errs[0]);
    const d = await siteDetail(req.ctx.orgId, req.params.id);
    const n = Math.max(...d.versions.map((v) => v.number)) + 1;
    await tx(async (c) => {
      const v = (await c.query('insert into site_versions (site_id, number, note, content, created_by) values ($1,$2,$3,$4,$5) returning id', [d.site.id, n, note || `Edit ${n}`, JSON.stringify(content), req.ctx.name])).rows[0];
      await c.query("update sites set draft_version_id = $2, status = 'draft', name = $3, updated_at = now() where id = $1", [d.site.id, v.id, content.brand.name.slice(0, 100)]);
    });
    await log(req.ctx.orgId, req.ctx.name, `Saved version ${n}`, d.site.name, note || undefined);
    res.json(await siteDetail(req.ctx.orgId, d.site.id));
  }));
  app.post('/api/sites/:id/request-approval', as('editor'), wrap(async (req, res) => {
    const d = await siteDetail(req.ctx.orgId, req.params.id);
    await q("update sites set status = 'awaiting_approval' where id = $1", [d.site.id]); await log(req.ctx.orgId, req.ctx.name, 'Asked for approval', d.site.name);
    res.json(await siteDetail(req.ctx.orgId, d.site.id));
  }));
  app.post('/api/sites/:id/publish', as('admin'), wrap(async (req, res) => {
    const d = await siteDetail(req.ctx.orgId, req.params.id);
    await tx(async (c) => {
      await c.query('update site_versions set approved_at = now() where id = $1', [d.draft.id]);
      await c.query("update sites set live_version_id = $2, status = 'published', updated_at = now() where id = $1", [d.site.id, d.draft.id]);
      const exists = (await c.query('select 1 from products where site_id = $1', [d.site.id])).rowCount;
      if (!exists) await c.query("insert into products (org_id, type, name, url, origin, levels, site_id, domain_verified_at) values ($1,'website',$2,$3,'built','{public,domain,cms,hosting}',$4, now())", [req.ctx.orgId, `${d.site.name} website`, `${process.env.PUBLIC_HOST || 'lab.oliskey.com'}/s/${d.site.slug}`, d.site.id]);
    });
    await log(req.ctx.orgId, req.ctx.name, `Approved and published version ${d.draft.number}`, d.site.name);
    res.json(await siteDetail(req.ctx.orgId, d.site.id));
  }));
  app.post('/api/sites/:id/restore', as('editor'), wrap(async (req, res) => {
    const d = await siteDetail(req.ctx.orgId, req.params.id); const v = d.versions.find((x) => x.id === req.body?.versionId); if (!v) throw new HttpError(404, 'That version no longer exists.');
    const n = Math.max(...d.versions.map((x) => x.number)) + 1;
    await tx(async (c) => {
      const nv = (await c.query('insert into site_versions (site_id, number, note, content, created_by) values ($1,$2,$3,$4,$5) returning id', [d.site.id, n, `Restored version ${v.number}`, JSON.stringify(v.content), req.ctx.name])).rows[0];
      await c.query("update sites set draft_version_id = $2, status = 'draft', updated_at = now() where id = $1", [d.site.id, nv.id]);
    });
    await log(req.ctx.orgId, req.ctx.name, `Restored version ${v.number}`, d.site.name);
    res.json(await siteDetail(req.ctx.orgId, d.site.id));
  }));

  // ---------- public sites and their enquiry forms ----------
  app.get('/api/public/sites/:slug', wrap(async (req, res) => {
    const r = (await q('select v.content from sites s join site_versions v on v.id = s.live_version_id where s.slug = $1', [req.params.slug])).rows[0];
    if (!r) throw new HttpError(404, 'Not published.');
    res.set('cache-control', 'public, max-age=60').json(r.content);
  }));
  const LeadIn = z.object({ name: z.string().trim().min(1).max(100), email: z.string().trim().max(200).default(''), phone: z.string().trim().max(40).default(''), message: z.string().trim().min(1).max(2000) });
  app.post('/api/public/sites/:key/leads', leadLimit, wrap(async (req, res) => {
    const p = LeadIn.safeParse(req.body); if (!p.success || (!p.data.email && !p.data.phone)) throw new HttpError(400, 'Please add your name, a phone number or email, and your message.');
    const byId = req.query.by === 'id';
    let site: any;
    if (byId) {   // a test message from the Studio preview: only members of that business
      const ctx = await loadCtx(req); if (!ctx || !isUuid(req.params.key)) throw new HttpError(401, 'Please sign in again.');
      site = (await q('select id, org_id, name from sites where id = $1 and org_id = $2', [req.params.key, ctx.orgId])).rows[0];
    } else site = (await q('select id, org_id, name from sites where slug = $1 and live_version_id is not null', [req.params.key])).rows[0];
    if (!site) throw new HttpError(404, 'This website is not accepting messages.');
    const source = byId ? 'Website form (preview test)' : 'Website form';
    await q('insert into leads (org_id, site_id, name, email, phone, message, source) values ($1,$2,$3,$4,$5,$6,$7)', [site.org_id, site.id, p.data.name, p.data.email, p.data.phone, p.data.message, source]);
    await log(site.org_id, source, 'New lead', p.data.name);
    res.status(201).json({});
  }));

  // ---------- products: connect, inspect, verify domain ----------
  const prodRow = (p: any) => ({ id: p.id, type: p.type, name: p.name, url: p.url, origin: p.origin, levels: p.levels, domainToken: p.domain_token, domainVerifiedAt: p.domain_verified_at, health: p.health_score === null ? null : { score: p.health_score, checkedAt: p.health_checked_at } });
  const getProd = async (orgId: string, id: string) => { if (!isUuid(id)) throw new HttpError(404, 'Not found.'); const p = (await q('select * from products where id = $1 and org_id = $2', [id, orgId])).rows[0]; if (!p) throw new HttpError(404, 'This product is not connected to your account.'); return p; };
  app.get('/api/products', as(), wrap(async (req, res) => res.json((await q('select * from products where org_id = $1 order by created_at', [req.ctx.orgId])).rows.map(prodRow))));
  app.post('/api/products', as('admin'), wrap(async (req, res) => {
    const p = z.object({ type: z.enum(['website', 'pwa', 'android', 'ios']), name: z.string().trim().max(100).default(''), url: z.string().trim().min(3).max(300) }).safeParse(req.body);
    if (!p.success) throw new HttpError(400, 'Enter a website address such as mybusiness.com.');
    const url = p.data.url.replace(/^https?:\/\//i, '').replace(/\/$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}(\/[^\s]*)?$/i.test(url)) throw new HttpError(400, 'Enter a website address such as mybusiness.com.');
    const r = (await q("insert into products (org_id, type, name, url, origin) values ($1,$2,$3,$4,'connected') returning *", [req.ctx.orgId, p.data.type, p.data.name || url, url])).rows[0];
    await log(req.ctx.orgId, req.ctx.name, 'Connected for public inspection', r.name);
    res.status(201).json(prodRow(r));
  }));
  app.post('/api/products/:id/inspect', inspectLimit, as('editor'), wrap(async (req, res) => {
    const p = await getProd(req.ctx.orgId, req.params.id);
    let report;
    try { const page = await fetchPage(p.url); report = analyse(page.html, { url: `https://${p.url}`, ...page }); }
    catch (e) { throw new HttpError(422, e instanceof FetchError ? e.message : 'The website could not be read. Check the address and try again.'); }
    await q('update products set health_score = $2, health_checked_at = now(), last_report = $3 where id = $1', [p.id, report.score, JSON.stringify(report)]);
    await log(req.ctx.orgId, 'Oliskey Lab', 'Inspected website', p.name, `Score ${report.score}`);
    res.json(report);
  }));
  app.get('/api/products/:id/inspection', as(), wrap(async (req, res) => res.json({ report: (await getProd(req.ctx.orgId, req.params.id)).last_report || null })));
  app.post('/api/products/:id/domain/start', as('admin'), wrap(async (req, res) => {
    const p = await getProd(req.ctx.orgId, req.params.id);
    const token = p.domain_token || `oliskey-verify=${crypto.randomBytes(16).toString('hex')}`;
    res.json(prodRow((await q('update products set domain_token = $2 where id = $1 returning *', [p.id, token])).rows[0]));
  }));
  app.post('/api/products/:id/domain/check', as('admin'), wrap(async (req, res) => {
    const p = await getProd(req.ctx.orgId, req.params.id); if (!p.domain_token) throw new HttpError(400, 'Start verification first.');
    const host = p.url.split('/')[0];
    const records = await dns.resolveTxt(`_oliskey.${host}`).catch(() => [] as string[][]);
    const found = records.some((r) => r.join('') === p.domain_token);
    if (found) {
      const r = (await q("update products set domain_verified_at = now(), levels = (select array(select distinct unnest(levels || '{domain}'))) where id = $1 returning *", [p.id])).rows[0];
      await log(req.ctx.orgId, 'Oliskey Lab', 'Verified domain ownership', p.name);
      return res.json({ product: prodRow(r), found: true, message: 'Ownership confirmed.' });
    }
    res.json({ product: prodRow(p), found: false, message: 'The record was not found yet. DNS changes can take up to an hour — try again later.' });
  }));
  app.delete('/api/products/:id', as('admin'), wrap(async (req, res) => {
    const p = await getProd(req.ctx.orgId, req.params.id);
    await tx(async (c) => { await c.query('update grants set revoked_at = now() where product_id = $1 and revoked_at is null', [p.id]); await c.query('delete from products where id = $1', [p.id]); });
    await log(req.ctx.orgId, req.ctx.name, 'Disconnected and revoked all access', p.name);
    res.json({});
  }));

  // ---------- permissions ----------
  const grantRow = (g: any) => ({ id: g.id, productId: g.product_id, permission: g.permission, grantedBy: g.granted_by, grantedAt: g.granted_at, revokedAt: g.revoked_at });
  app.get('/api/grants', as(), wrap(async (req, res) => res.json((await q('select * from grants where org_id = $1 order by granted_at', [req.ctx.orgId])).rows.map(grantRow))));
  app.post('/api/grants', as('owner'), wrap(async (req, res) => {
    const p = z.object({ productId: z.string(), permission: z.enum(PERMISSIONS) }).safeParse(req.body); if (!p.success) throw new HttpError(400, 'Choose a permission.');
    const prod = await getProd(req.ctx.orgId, p.data.productId);
    if (!prod.levels.includes(NEEDS[p.data.permission])) throw new HttpError(400, 'Connect the matching access first.');
    if ((await q('select 1 from grants where product_id = $1 and permission = $2 and revoked_at is null', [prod.id, p.data.permission])).rowCount) throw new HttpError(409, 'Already granted.');
    const g = (await q('insert into grants (org_id, product_id, permission, granted_by) values ($1,$2,$3,$4) returning *', [req.ctx.orgId, prod.id, p.data.permission, req.ctx.name])).rows[0];
    await log(req.ctx.orgId, req.ctx.name, `Granted ${p.data.permission} access`, prod.name);
    res.status(201).json(grantRow(g));
  }));
  app.delete('/api/grants/:id', as('owner'), wrap(async (req, res) => {
    if (!isUuid(req.params.id)) throw new HttpError(404, 'Not found.');
    const g = (await q('update grants set revoked_at = now() where id = $1 and org_id = $2 and revoked_at is null returning *', [req.params.id, req.ctx.orgId])).rows[0];
    if (g) { const prod = (await q('select name from products where id = $1', [g.product_id])).rows[0]; await log(req.ctx.orgId, req.ctx.name, `Revoked ${g.permission} access`, prod?.name || 'Product'); }
    res.json({});
  }));

  // ---------- customers ----------
  const leadRow = (l: any) => ({ id: l.id, name: l.name, email: l.email, phone: l.phone, message: l.message, source: l.source, status: l.status, createdAt: l.created_at });
  app.get('/api/leads', as(), wrap(async (req, res) => res.json((await q('select * from leads where org_id = $1 order by created_at desc limit 500', [req.ctx.orgId])).rows.map(leadRow))));
  app.patch('/api/leads/:id', as('editor'), wrap(async (req, res) => {
    const p = z.object({ status: z.enum(['new', 'contacted', 'won', 'lost']) }).safeParse(req.body); if (!p.success || !isUuid(req.params.id)) throw new HttpError(400, 'Choose a status.');
    const l = (await q('update leads set status = $3 where id = $1 and org_id = $2 returning *', [req.params.id, req.ctx.orgId, p.data.status])).rows[0]; if (!l) throw new HttpError(404, 'Not found.');
    await log(req.ctx.orgId, req.ctx.name, `Marked lead as ${p.data.status}`, l.name);
    res.json(leadRow(l));
  }));

  // ---------- social ----------
  app.get('/api/social', as(), wrap(async (req, res) => res.json((await q('select platform, status, handle from social_accounts where org_id = $1', [req.ctx.orgId])).rows)));
  app.post('/api/social/:platform', as('admin'), wrap(async (req, res) => {
    if (!(PLATFORMS as readonly string[]).includes(req.params.platform)) throw new HttpError(404, 'Unknown platform.');
    // Live sign-in opens once each platform has approved Oliskey Lab; until then the request is recorded.
    const a = (await q("insert into social_accounts (org_id, platform, status) values ($1,$2,'awaiting_platform_approval') on conflict (org_id, platform) do update set status = 'awaiting_platform_approval' returning platform, status, handle", [req.ctx.orgId, req.params.platform])).rows[0];
    await log(req.ctx.orgId, req.ctx.name, 'Requested connection', req.params.platform);
    res.json(a);
  }));

  // ---------- home ----------
  app.get('/api/audit', as(), wrap(async (req, res) => res.json((await q('select id::text, at, actor, action, target, detail from audit_log where org_id = $1 order by at desc limit 200', [req.ctx.orgId])).rows)));
  app.get('/api/metrics', as(), wrap(async (req, res) => {
    const o = req.ctx.orgId;
    const c = (await q(`select count(*) filter (where created_at > now() - interval '30 days') a, count(*) filter (where created_at between now() - interval '60 days' and now() - interval '30 days') b, count(*) total,
      count(*) filter (where status = 'won') won from leads where org_id = $1`, [o])).rows[0];
    const weeks = (await q(`select coalesce(count(l.id), 0)::int n from generate_series(7, 0, -1) w left join leads l on l.org_id = $1 and l.created_at >= date_trunc('week', now()) - (w || ' weeks')::interval and l.created_at < date_trunc('week', now()) - ((w - 1) || ' weeks')::interval group by w order by w desc`, [o])).rows.map((r) => r.n);
    const h = (await q('select health_score from products where org_id = $1 and health_score is not null order by health_checked_at desc limit 1', [o])).rows[0];
    const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
    res.json({ health: h?.health_score ?? null, healthDelta: null, customers: +c.won, customersDelta: null, leads: +c.total, leadsDelta: delta(+c.a, +c.b), orders: null, ordersDelta: null, revenue: null, revenueDelta: null, trend: weeks });
  }));
  async function focusFor(orgId: string): Promise<FocusItem[]> {
    const [d, o, n] = await Promise.all([q('select strategy, completed_at from discovery where org_id = $1', [orgId]), q('select focus_done from organisations where id = $1', [orgId]), q("select count(*)::int n from leads where org_id = $1 and status = 'new'", [orgId])]);
    const done = new Set<string>(o.rows[0]?.focus_done || []);
    const items: Omit<FocusItem, 'done'>[] = [];
    if (!d.rows[0]?.completed_at) items.push({ id: 'discovery', title: 'Finish Business Discovery', to: '/app/discovery' });
    if (n.rows[0].n) items.push({ id: 'leads', title: `Reply to ${n.rows[0].n} new ${n.rows[0].n === 1 ? 'enquiry' : 'enquiries'}`, to: '/app/customers' });
    for (const [i, p] of ((d.rows[0]?.strategy?.priorities || []) as { title: string }[]).entries()) items.push({ id: `p${i}`, title: p.title, to: /website|online|found/i.test(p.title) ? '/app/studio' : /social/i.test(p.title) ? '/app/social' : /enquir/i.test(p.title) ? '/app/customers' : '/app/build' });
    return items.slice(0, 5).map((x) => ({ ...x, done: done.has(x.id) }));
  }
  app.get('/api/focus', as(), wrap(async (req, res) => res.json(await focusFor(req.ctx.orgId))));
  app.put('/api/focus/:id', as('editor'), wrap(async (req, res) => {
    const id = String(req.params.id).slice(0, 40); const done = !!req.body?.done;
    await q(done ? 'update organisations set focus_done = array(select distinct unnest(focus_done || array[$2::text])) where id = $1' : 'update organisations set focus_done = array_remove(focus_done, $2) where id = $1', [req.ctx.orgId, id]);
    if (done) await log(req.ctx.orgId, req.ctx.name, 'Completed a weekly focus', id);
    res.json(await focusFor(req.ctx.orgId));
  }));
  app.post('/api/automations/:id/request', as('editor'), wrap(async (req, res) => {
    const title = String(req.body?.title || req.params.id).slice(0, 120);
    await log(req.ctx.orgId, req.ctx.name, 'Asked Oliskey to set up an automation', title);
    res.json({});
  }));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', (_req, _res, next) => next(new HttpError(404, 'Not found.')));

  // ---------- the web app (built) ----------
  const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist');
  app.use(express.static(dist, { index: false, maxAge: '1h', setHeaders: (res, f) => { if (f.includes(`${path.sep}assets${path.sep}`)) res.setHeader('cache-control', 'public, max-age=31536000, immutable'); } }));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html'), (e) => { if (e) res.status(404).send('Build the web app first: npm run build'); }));

  // errors: a plain sentence for people, never internals
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => { // eslint-disable-line @typescript-eslint/no-unused-vars
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if ((err as { type?: string })?.type === 'entity.parse.failed') return res.status(400).json({ error: 'That request could not be read.' });
    console.error('Unexpected error:', (err as Error)?.message);
    res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
  });
  return app;
}
