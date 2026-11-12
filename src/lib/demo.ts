// The demo: a complete Oliskey Lab account for a sample business, running entirely in the visitor's browser.
// Every action really happens (sites are generated, edited, versioned and published; leads change status; the history
// log records it all) but nothing leaves the browser. It resets on request, and by itself after 24 hours.
import type { Api, SiteDetail } from './api';
import { ApiError } from './api';
import type {
  AuditEntry, DigitalProduct, FocusItem, Metrics, Discovery, DiscoveryAnswers, Grant, InspectionReport, Lead, Permission, Session, Site,
  SiteContent, SiteVersion, SocialAccount, SocialPlatform, Strategy,
} from '../../shared/types';
import { recommend } from '../../shared/recommend';
import { generateSite, validateSite } from '../../shared/generate';

const KEY = 'oliskey.lab.demo.v2';
const DAY = 24 * 3600 * 1000;
const id = () => Math.random().toString(36).slice(2, 10);
const ago = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const pause = (ms = 260) => new Promise((r) => setTimeout(r, ms));

export const DEMO_ANSWERS: DiscoveryAnswers = {
  businessName: "Adunni's Kitchen",
  whatYouDo: 'Home-style Nigerian meals, small chops and party catering, with delivery',
  teamSize: '6-20',
  offers: ['Jollof rice and chicken', 'Ofada rice and ayamase', 'Small chops platter', 'Party catering (50+ guests)', 'Weekly office lunch plan'],
  idealCustomers: 'office workers, families and event planners',
  customerLocation: 'Lekki and Victoria Island, Lagos',
  howFound: ['Word of mouth', 'Instagram', 'WhatsApp'],
  socials: ['Instagram', 'Facebook', 'WhatsApp Business'],
  hasWebsite: 'no', hasApp: 'no', hasDomain: 'no', hasRepo: 'no', usesCms: '', hasAnalytics: 'no', maintainer: '',
  challenges: 'Orders come in through WhatsApp and get lost; we cannot see which customers order again.',
  timeConsumers: ['Answering WhatsApp enquiries', 'Writing orders in a notebook', 'Posting on Instagram'],
  goals: ['More orders', 'Fewer missed messages', 'Regular office lunch customers'],
  intent: 'build', sector: 'restaurant',
};

interface Store {
  createdAt: number;
  user: { id: string; name: string; email: string };
  discovery: Discovery; strategy: Strategy | null;
  sites: Site[]; versions: SiteVersion[];
  products: DigitalProduct[]; inspections: Record<string, InspectionReport>;
  grants: Grant[]; leads: Lead[]; social: SocialAccount[]; audit: AuditEntry[];
  focusDone: string[];
}

function seed(): Store {
  const content = generateSite(DEMO_ANSWERS);
  content.brand.phone = '+234 800 000 0000';
  content.brand.whatsapp = '+234 800 000 0000';
  content.brand.address = 'Admiralty Way, Lekki Phase 1, Lagos';
  const siteId = 'site-demo';
  const v1: SiteVersion = { id: 'v1', siteId, number: 1, note: 'First version, made from Discovery', content, createdAt: ago(60 * 26), createdBy: 'Oliskey Lab', approvedAt: ago(60 * 25) };
  const product: DigitalProduct = { id: 'p-site', type: 'website', name: "Adunni's Kitchen website", url: 'lab.oliskey.com/s/adunnis-kitchen', origin: 'built', levels: ['public', 'domain', 'analytics', 'cms', 'hosting'], domainVerifiedAt: ago(60 * 25), health: { score: 92, checkedAt: ago(90) } };
  return {
    createdAt: Date.now(),
    user: { id: 'u-demo', name: 'Adunni Bello', email: 'demo@oliskey.com' },
    discovery: { answers: DEMO_ANSWERS, step: 99, completedAt: ago(60 * 27) },
    strategy: recommend(DEMO_ANSWERS),
    sites: [{ id: siteId, name: "Adunni's Kitchen", slug: 'adunnis-kitchen', status: 'published', liveVersionId: 'v1', draftVersionId: 'v1', updatedAt: ago(60 * 25) }],
    versions: [v1],
    products: [product],
    inspections: {},
    grants: [
      { id: 'g1', productId: 'p-site', permission: 'content', grantedBy: 'Adunni Bello', grantedAt: ago(60 * 25), revokedAt: null },
      { id: 'g2', productId: 'p-site', permission: 'publish', grantedBy: 'Adunni Bello', grantedAt: ago(60 * 25), revokedAt: null },
      { id: 'g3', productId: 'p-site', permission: 'analytics', grantedBy: 'Adunni Bello', grantedAt: ago(60 * 25), revokedAt: null },
    ],
    leads: [
      { id: 'l1', name: 'Tolu Martins', email: 'tolu@example.com', phone: '0803 000 0001', message: 'Office lunch for 12 people every Friday — what is the weekly price?', source: 'Website form', status: 'new', createdAt: ago(35) },
      { id: 'l2', name: 'Ngozi Eze', email: 'ngozi@example.com', phone: '0803 000 0002', message: 'Small chops for a birthday on Saturday, about 40 guests.', source: 'WhatsApp', status: 'contacted', createdAt: ago(60 * 5) },
      { id: 'l3', name: 'Kemi Ade', email: 'kemi@example.com', phone: '0803 000 0003', message: 'Do you deliver to Ikoyi?', source: 'Instagram', status: 'new', createdAt: ago(60 * 9) },
      { id: 'l4', name: 'Bayo Ogun', email: 'bayo@example.com', phone: '0803 000 0004', message: 'Catering for a company event, 120 guests in March.', source: 'Website form', status: 'won', createdAt: ago(60 * 30) },
      { id: 'l5', name: 'Ifeoma Obi', email: 'ifeoma@example.com', phone: '0803 000 0005', message: 'Price for jollof and chicken, 3 plates.', source: 'Website form', status: 'won', createdAt: ago(60 * 48) },
      { id: 'l6', name: 'Segun Lawal', email: 'segun@example.com', phone: '0803 000 0006', message: 'Can I pay on delivery?', source: 'Facebook', status: 'lost', createdAt: ago(60 * 70) },
    ],
    social: [
      { platform: 'instagram', status: 'connected', handle: '@adunniskitchen', followers: 4820, reach: 18300 },
      { platform: 'facebook', status: 'connected', handle: "Adunni's Kitchen", followers: 2110, reach: 6400 },
      { platform: 'whatsapp', status: 'connected', handle: 'WhatsApp Business', followers: 0, reach: 0 },
      { platform: 'tiktok', status: 'not_connected' }, { platform: 'youtube', status: 'not_connected' },
      { platform: 'linkedin', status: 'not_connected' }, { platform: 'google', status: 'awaiting_platform_approval' },
    ],
    focusDone: ['replies', 'videos'],
    audit: [
      { id: 'a4', at: ago(35), actor: 'Website form', action: 'New lead', target: 'Tolu Martins' },
      { id: 'a3', at: ago(60 * 25), actor: 'Adunni Bello', action: 'Approved and published version 1', target: "Adunni's Kitchen website" },
      { id: 'a2', at: ago(60 * 25), actor: 'Adunni Bello', action: 'Granted content, publishing and analytics access', target: "Adunni's Kitchen website" },
      { id: 'a1', at: ago(60 * 26), actor: 'Oliskey Lab', action: 'Generated website from Discovery', target: "Adunni's Kitchen website" },
    ],
  };
}

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null') as Store | null;
    if (s && Date.now() - s.createdAt < DAY) return s;
  } catch { /* storage unavailable: use a fresh demo */ }
  return seed();
}

export class DemoApi implements Api {
  readonly demo = true;
  private s: Store = load();
  private signedIn = true;
  private save() { try { localStorage.setItem(KEY, JSON.stringify(this.s)); } catch { /* private window: demo still works for this visit */ } }
  private log(action: string, target: string, actor = this.s.user.name, detail?: string) { this.s.audit.unshift({ id: id(), at: new Date().toISOString(), actor, action, target, detail }); }
  reset() { this.s = seed(); this.save(); }
  private detail(siteId: string): SiteDetail {
    const site = this.s.sites.find((x) => x.id === siteId);
    if (!site) throw new ApiError('This website no longer exists.', 404);
    const versions = this.s.versions.filter((v) => v.siteId === siteId).sort((a, b) => b.number - a.number);
    return { site, versions, draft: versions.find((v) => v.id === site.draftVersionId)!, live: versions.find((v) => v.id === site.liveVersionId) || null };
  }

  async session(): Promise<Session | null> {
    if (!this.signedIn) return null;
    return { user: this.s.user, org: { id: 'org-demo', name: "Adunni's Kitchen", slug: 'adunnis-kitchen', plan: 'growth', createdAt: ago(60 * 27) }, role: 'owner', demo: true };
  }
  async signUp(): Promise<Session> { throw new ApiError('The demo already has an account. Create your own from the Oliskey Lab sign-up page.', 400); }
  async signIn(): Promise<Session> { this.signedIn = true; return (await this.session())!; }
  async signOut() { this.signedIn = false; }

  async discovery() { await pause(); return this.s.discovery; }
  async saveDiscovery(answers: DiscoveryAnswers, step: number) { this.s.discovery = { ...this.s.discovery, answers, step }; this.save(); return this.s.discovery; }
  async completeDiscovery() {
    await pause(900);
    this.s.discovery.completedAt = new Date().toISOString();
    this.s.strategy = recommend(this.s.discovery.answers);
    this.log('Completed Business Discovery', this.s.discovery.answers.businessName || 'Business');
    this.save(); return this.s.strategy;
  }
  async strategy() { return this.s.strategy; }

  async sites() { await pause(); return this.s.sites; }
  async createSite() {
    await pause(1200);
    const content = generateSite(this.s.discovery.answers);
    const errs = validateSite(content); if (errs.length) throw new ApiError(errs[0], 400);
    const siteId = id(); const v: SiteVersion = { id: id(), siteId, number: 1, note: 'First version, made from Discovery', content, createdAt: new Date().toISOString(), createdBy: 'Oliskey Lab', approvedAt: null };
    const name = content.brand.name; let slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'site';
    if (this.s.sites.some((x) => x.slug === slug)) slug = `${slug}-${this.s.sites.length + 1}`;
    const site: Site = { id: siteId, name, slug, status: 'draft', liveVersionId: null, draftVersionId: v.id, updatedAt: v.createdAt };
    this.s.sites.unshift(site); this.s.versions.push(v); this.log('Generated website from Discovery', name, 'Oliskey Lab'); this.save(); return site;
  }
  async site(siteId: string) { await pause(); return this.detail(siteId); }
  async saveDraft(siteId: string, content: SiteContent, note: string) {
    const errs = validateSite(content); if (errs.length) throw new ApiError(errs[0], 400);
    const d = this.detail(siteId); const number = Math.max(...d.versions.map((v) => v.number)) + 1;
    const v: SiteVersion = { id: id(), siteId, number, note: note || `Edit ${number}`, content, createdAt: new Date().toISOString(), createdBy: this.s.user.name, approvedAt: null };
    this.s.versions.push(v); d.site.draftVersionId = v.id; d.site.status = 'draft'; d.site.updatedAt = v.createdAt;
    this.log(`Saved version ${number}`, d.site.name, undefined, note); this.save(); return this.detail(siteId);
  }
  async requestApproval(siteId: string) { const d = this.detail(siteId); d.site.status = 'awaiting_approval'; this.log('Asked for approval', d.site.name); this.save(); return this.detail(siteId); }
  async approveAndPublish(siteId: string) {
    await pause(700);
    const d = this.detail(siteId); d.draft.approvedAt = new Date().toISOString(); d.site.liveVersionId = d.draft.id; d.site.status = 'published'; d.site.updatedAt = d.draft.approvedAt;
    if (!this.s.products.some((p) => p.url.endsWith(`/s/${d.site.slug}`))) this.s.products.unshift({ id: id(), type: 'website', name: `${d.site.name} website`, url: `lab.oliskey.com/s/${d.site.slug}`, origin: 'built', levels: ['public', 'domain', 'cms', 'hosting'], domainVerifiedAt: new Date().toISOString(), health: null });
    this.log(`Approved and published version ${d.draft.number}`, d.site.name); this.save(); return this.detail(siteId);
  }
  async restoreVersion(siteId: string, versionId: string) {
    const d = this.detail(siteId); const v = d.versions.find((x) => x.id === versionId); if (!v) throw new ApiError('That version no longer exists.', 404);
    return this.saveDraft(siteId, v.content, `Restored version ${v.number}`);
  }

  async products() { await pause(); return this.s.products; }
  async connectProduct(i: { type: DigitalProduct['type']; name: string; url: string }) {
    const url = i.url.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(url)) throw new ApiError('Enter a website address such as mybusiness.com.', 400);
    const p: DigitalProduct = { id: id(), type: i.type, name: i.name.trim() || url, url, origin: 'connected', levels: ['public'], domainToken: null, domainVerifiedAt: null, health: null };
    this.s.products.push(p); this.log('Connected for public inspection', p.name); this.save(); return p;
  }
  async inspect(productId: string): Promise<InspectionReport> {
    await pause(1400);
    const p = this.s.products.find((x) => x.id === productId); if (!p) throw new ApiError('Not found.', 404);
    // The demo cannot fetch other websites from the browser; it shows a realistic sample report and says so on screen.
    const built = p.origin === 'built';
    const r: InspectionReport = {
      url: `https://${p.url}`, finalUrl: `https://${p.url}`, checkedAt: new Date().toISOString(), status: 200, ms: built ? 240 : 1830, bytes: built ? 38000 : 610000, https: true, score: 0,
      checks: [
        { id: 'status', area: 'trust', ok: true, title: 'The page opens', detail: 'Visitors reach the page without errors.' },
        { id: 'https', area: 'trust', ok: true, title: 'Secure address (https)', detail: 'Browsers show the page as secure.' },
        { id: 'speed', area: 'speed', ok: built, title: `Server answered in ${built ? '0.2' : '1.8'} s`, detail: built ? 'The first response is quick.' : 'Slow first response. Many visitors leave before a slow page appears; check hosting and caching.' },
        { id: 'weight', area: 'speed', ok: built, title: `Page HTML is ${built ? 37 : 596} KB`, detail: built ? 'A light page.' : 'The page itself is heavy; large inline content slows phones on mobile data.' },
        { id: 'viewport', area: 'access', ok: true, title: 'Built for phones', detail: 'The page sizes itself to phone screens.' },
        { id: 'title', area: 'search', ok: true, title: 'Clear page title', detail: 'A clear title for search results.' },
        { id: 'desc', area: 'search', ok: built, title: built ? 'Search description present' : 'No search description', detail: built ? 'A good description for search results.' : 'Search engines invent a summary. Write one or two sentences saying what you offer and where.' },
        { id: 'alt', area: 'access', ok: built, title: built ? 'All images are described' : '7 of 12 images have no description', detail: built ? 'Images are described for screen readers and search.' : 'Add short descriptions (alt text) so blind visitors and search engines understand them.' },
        { id: 'share', area: 'search', ok: built, title: built ? 'Share preview set' : 'No share preview', detail: built ? 'Links shared on WhatsApp show a title and picture.' : 'Links shared on WhatsApp and social media show no picture. Add a share title and image.' },
        { id: 'contact', area: 'conversion', ok: true, title: 'Visitors can contact the business', detail: 'A phone, email, WhatsApp link or form is on the page.' },
      ],
    };
    r.score = Math.round((100 * r.checks.filter((c) => c.ok).length) / r.checks.length);
    this.s.inspections[productId] = r; p.health = { score: r.score, checkedAt: r.checkedAt };
    this.log('Inspected website', p.name, 'Oliskey Lab', `Score ${r.score}`); this.save(); return r;
  }
  async lastInspection(productId: string) { return this.s.inspections[productId] || null; }
  async startDomainCheck(productId: string) {
    const p = this.s.products.find((x) => x.id === productId)!; p.domainToken = `oliskey-verify=${id()}${id()}`; this.save(); return p;
  }
  async checkDomain(productId: string) {
    await pause(900);
    const p = this.s.products.find((x) => x.id === productId)!;
    // in the demo the record is "found", so visitors can see the next step
    p.domainVerifiedAt = new Date().toISOString(); if (!p.levels.includes('domain')) p.levels.push('domain');
    this.log('Verified domain ownership', p.name, 'Oliskey Lab'); this.save();
    return { product: p, found: true, message: 'Ownership confirmed. (In the demo the record is always found.)' };
  }
  async disconnectProduct(productId: string) {
    const p = this.s.products.find((x) => x.id === productId); this.s.products = this.s.products.filter((x) => x.id !== productId);
    this.s.grants.forEach((g) => { if (g.productId === productId && !g.revokedAt) g.revokedAt = new Date().toISOString(); });
    if (p) this.log('Disconnected and revoked all access', p.name); this.save();
  }

  async grants() { return this.s.grants; }
  async grant(productId: string, permission: Permission) {
    const g: Grant = { id: id(), productId, permission, grantedBy: this.s.user.name, grantedAt: new Date().toISOString(), revokedAt: null };
    this.s.grants.push(g); this.log(`Granted ${permission} access`, this.s.products.find((p) => p.id === productId)?.name || 'Product'); this.save(); return g;
  }
  async revoke(grantId: string) {
    const g = this.s.grants.find((x) => x.id === grantId); if (!g) return; g.revokedAt = new Date().toISOString();
    this.log(`Revoked ${g.permission} access`, this.s.products.find((p) => p.id === g.productId)?.name || 'Product'); this.save();
  }

  async leads() { await pause(); return [...this.s.leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async setLeadStatus(leadId: string, status: Lead['status']) {
    const l = this.s.leads.find((x) => x.id === leadId); if (!l) throw new ApiError('Not found.', 404);
    l.status = status; this.log(`Marked lead as ${status}`, l.name); this.save(); return l;
  }
  /** used by published demo sites: an enquiry from the form becomes a lead, as in a real account */
  addLead(input: { name: string; email: string; phone: string; message: string }) {
    const l: Lead = { id: id(), ...input, source: 'Website form', status: 'new', createdAt: new Date().toISOString() };
    this.s.leads.unshift(l); this.log('New lead', l.name, 'Website form'); this.save(); return l;
  }

  async social() { return this.s.social; }
  async requestSocial(platform: SocialPlatform) {
    const a = this.s.social.find((x) => x.platform === platform)!; a.status = 'awaiting_platform_approval';
    this.log('Requested connection', platform); this.save(); return a;
  }
  async audit() { return this.s.audit; }
  async requestAutomation(_aid: string, title: string) { await pause(500); this.log('Asked Oliskey to set up an automation', title); this.save(); }
  async metrics(): Promise<Metrics> {
    // sample figures for the demo business (a real account counts its own leads and connected sales)
    const site = this.s.products.find((p) => p.health);
    return { health: site?.health?.score ?? 88, healthDelta: 8, customers: 3842, customersDelta: 24, leads: 512 + this.s.leads.length, leadsDelta: 37, orders: 276, ordersDelta: 31, revenue: 4126400, revenueDelta: 28, trend: [22, 26, 24, 31, 35, 33, 41, 48] };
  }
  async focus(): Promise<FocusItem[]> {
    const items: Omit<FocusItem, 'done'>[] = [
      { id: 'replies', title: 'Automate customer replies', to: '/app/automation' },
      { id: 'videos', title: 'Publish 3 social videos', to: '/app/social' },
      { id: 'ads', title: 'Run a targeted ad campaign', to: '/app/marketing' },
      { id: 'prices', title: 'Add prices to your menu', to: '/app/studio' },
      { id: 'leads', title: 'Reply to new enquiries', to: '/app/customers' },
    ];
    return items.map((x) => ({ ...x, done: (this.s.focusDone || []).includes(x.id) }));
  }
  async setFocus(fid: string, done: boolean) {
    const set = new Set(this.s.focusDone || []); if (done) set.add(fid); else set.delete(fid); this.s.focusDone = [...set];
    if (done) this.log('Completed a weekly focus', fid); this.save(); return this.focus();
  }
}
