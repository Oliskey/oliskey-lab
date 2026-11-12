// End-to-end API tests against a real Postgres database (DATABASE_URL). Run: npm test
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { createApp } from '../server/app';
import { migrate, pool, q } from '../server/db';

let server: Server; let base = '';
const jar = () => { let cookie = ''; return async (method: string, path: string, body?: unknown, headers: Record<string, string> = {}) => {
  const r = await fetch(base + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(cookie ? { cookie } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const set = r.headers.get('set-cookie'); if (set) cookie = set.split(';')[0];
  return { status: r.status, body: await r.json().catch(() => ({})) as any };
}; };
const stamp = Date.now();

beforeAll(async () => { await migrate(); server = createApp().listen(0); base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`; });
afterAll(async () => { server.close(); await pool.end(); });

describe('Oliskey Lab API', () => {
  const owner = jar(); const other = jar(); const anon = jar();
  let siteId = ''; let slug = '';

  it('signs up an owner with a new business', async () => {
    const r = await owner('POST', '/api/auth/sign-up', { name: 'Ada Test', business: `Ada Foods ${stamp}`, email: `ada${stamp}@test.local`, password: 'longpassword1' });
    expect(r.status).toBe(201); expect(r.body.role).toBe('owner');
    const s = await owner('GET', '/api/session'); expect(s.body.session.org.name).toBe(`Ada Foods ${stamp}`);
  });
  it('refuses a duplicate email, a short password and a wrong password', async () => {
    expect((await anon('POST', '/api/auth/sign-up', { name: 'X', business: 'Y', email: `ada${stamp}@test.local`, password: 'longpassword1' })).status).toBe(409);
    expect((await anon('POST', '/api/auth/sign-up', { name: 'X', business: 'Y', email: `x${stamp}@test.local`, password: 'short' })).status).toBe(400);
    expect((await anon('POST', '/api/auth/sign-in', { email: `ada${stamp}@test.local`, password: 'wrongpassword' })).status).toBe(401);
  });
  it('keeps business data behind sign-in', async () => {
    expect((await anon('GET', '/api/sites')).status).toBe(401);
    expect((await anon('GET', '/api/leads')).status).toBe(401);
  });
  it('saves discovery answers and makes a plan with honest app advice', async () => {
    const a = { businessName: `Ada Foods ${stamp}`, whatYouDo: 'Home-style meals and catering', offers: ['Jollof rice', 'Small chops'], customerLocation: 'Lekki, Lagos', hasWebsite: 'no', hasApp: 'no' };
    expect((await owner('PUT', '/api/discovery', { answers: a, step: 5 })).status).toBe(200);
    const s = await owner('POST', '/api/discovery/complete');
    expect(s.status).toBe(200); expect(s.body.products.find((p: any) => p.kind === 'website').verdict).toBe('recommended');
    expect(s.body.products.find((p: any) => p.kind === 'ios').cost).toMatch(/99/);
  });
  it('generates a website, saves a version, and refuses an invalid one', async () => {
    const r = await owner('POST', '/api/sites'); expect(r.status).toBe(201); siteId = r.body.id; slug = r.body.slug;
    const d = await owner('GET', `/api/sites/${siteId}`); expect(d.body.draft.number).toBe(1);
    const c = d.body.draft.content; c.brand.phone = '0800 000 0000';
    const v2 = await owner('PUT', `/api/sites/${siteId}/draft`, { content: c, note: 'Added phone' }); expect(v2.body.draft.number).toBe(2);
    const bad = { ...c, pages: [] }; expect((await owner('PUT', `/api/sites/${siteId}/draft`, { content: bad, note: '' })).status).toBe(400);
  });
  it('refuses badly shaped sections, empty headings and missing search details', async () => {
    const c = (await owner('GET', `/api/sites/${siteId}`)).body.draft.content;
    const put = (content: unknown) => owner('PUT', `/api/sites/${siteId}/draft`, { content, note: '' });
    const noItems = structuredClone(c); noItems.pages[0].sections.push({ type: 'offers', heading: 'Broken' });
    expect((await put(noItems)).status).toBe(400);
    const empty = structuredClone(c); empty.pages[0].sections[0].heading = '  ';
    expect((await put(empty)).status).toBe(400);
    const noSeo = structuredClone(c); delete noSeo.seo;
    expect((await put(noSeo)).status).toBe(400);
  });
  it('is not public before publishing, and is after', async () => {
    expect((await anon('GET', `/api/public/sites/${slug}`)).status).toBe(404);
    const p = await owner('POST', `/api/sites/${siteId}/publish`); expect(p.body.site.status).toBe('published');
    const pub = await anon('GET', `/api/public/sites/${slug}`); expect(pub.status).toBe(200); expect(pub.body.brand.phone).toBe('0800 000 0000');
    expect((await owner('GET', '/api/products')).body.some((x: any) => x.origin === 'built')).toBe(true);
  });
  it('turns a website enquiry into a lead and validates it', async () => {
    expect((await anon('POST', `/api/public/sites/${slug}/leads`, { name: 'Tolu', phone: '0803', message: 'Lunch for 12?' })).status).toBe(201);
    expect((await anon('POST', `/api/public/sites/${slug}/leads`, { name: 'No contact', message: 'Hi' })).status).toBe(400);
    const leads = await owner('GET', '/api/leads'); expect(leads.body[0].name).toBe('Tolu');
    const u = await owner('PATCH', `/api/leads/${leads.body[0].id}`, { status: 'won' }); expect(u.body.status).toBe('won');
  });
  it('keeps each business separate', async () => {
    await other('POST', '/api/auth/sign-up', { name: 'Ben', business: `Ben Shop ${stamp}`, email: `ben${stamp}@test.local`, password: 'longpassword2' });
    expect((await other('GET', `/api/sites/${siteId}`)).status).toBe(404);
    expect((await other('GET', '/api/leads')).body).toHaveLength(0);
    expect((await other('POST', `/api/sites/${siteId}/publish`)).status).toBe(404);
  });
  it('lets only the owner grant access, and only when the matching access exists', async () => {
    const prod = (await owner('GET', '/api/products')).body[0];
    expect((await owner('POST', '/api/grants', { productId: prod.id, permission: 'repository' })).status).toBe(400);   // no source access
    const g = await owner('POST', '/api/grants', { productId: prod.id, permission: 'content' }); expect(g.status).toBe(201);
    expect((await owner('DELETE', `/api/grants/${g.body.id}`)).status).toBe(200);
  });
  it('enforces roles on the server', async () => {
    const orgId = (await owner('GET', '/api/session')).body.session.org.id;
    const viewer = jar();
    await viewer('POST', '/api/auth/sign-up', { name: 'Vee', business: `Vee ${stamp}`, email: `vee${stamp}@test.local`, password: 'longpassword3' });
    const vid = (await q('select id from users where email = $1', [`vee${stamp}@test.local`])).rows[0].id;
    await q('delete from memberships where user_id = $1', [vid]); await q("insert into memberships (user_id, org_id, role) values ($1,$2,'viewer')", [vid, orgId]);
    expect((await viewer('GET', '/api/sites')).status).toBe(200);
    expect((await viewer('POST', `/api/sites/${siteId}/publish`)).status).toBe(403);
    expect((await viewer('PUT', '/api/discovery', { answers: {}, step: 0 })).status).toBe(403);
  });
  it('refuses requests from another website', async () => {
    expect((await owner('POST', '/api/sites', undefined, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await owner('POST', '/api/sites', undefined, { origin: 'null' })).status).toBe(403);
  });
  it('answers malformed ids and unknown records with 404, not a server error', async () => {
    expect((await owner('POST', '/api/sites/not-a-uuid/publish')).status).toBe(404);
    expect((await owner('PUT', '/api/sites/not-a-uuid/draft', { content: {}, note: '' })).status).toBe(404);
    expect((await owner('DELETE', '/api/grants/00000000-0000-0000-0000-000000000000')).status).toBe(404);
    expect((await owner('PUT', '/api/focus/made-up-item', { done: true })).status).toBe(404);
  });
  it('keeps the history permanent', async () => {
    const h = await owner('GET', '/api/audit'); expect(h.body.length).toBeGreaterThan(3);
    await expect(q('delete from audit_log where id = $1', [h.body[0].id])).rejects.toThrow(/cannot be changed/);
    await expect(q('truncate audit_log')).rejects.toThrow(/cannot be changed/);
  });
  it('will not inspect private network addresses', async () => {
    const r = await owner('POST', '/api/products', { type: 'website', name: 'Internal', url: '127.0.0.1.nip.io' });
    const i = await owner('POST', `/api/products/${r.body.id}/inspect`);
    expect(i.status).toBe(422);
  });
});
