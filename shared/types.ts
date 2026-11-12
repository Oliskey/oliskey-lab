// Oliskey Lab data model, shared by the server, the web app and the in-browser demo.

export type Role = 'owner' | 'admin' | 'editor' | 'viewer';

export interface User { id: string; email: string; name: string }
export interface Organisation { id: string; name: string; slug: string; plan: 'trial' | 'starter' | 'growth' | 'scale'; createdAt: string }
export interface Session { user: User; org: Organisation | null; role: Role | null; demo: boolean }

/** Business Discovery: the owner's answers, saved after every step. Every question is optional except the name. */
export interface DiscoveryAnswers {
  businessName?: string;
  whatYouDo?: string;
  offers?: string[];          // products or services, one per item
  idealCustomers?: string;
  customerLocation?: string;
  howFound?: string[];        // e.g. 'Word of mouth', 'Instagram', 'Google'
  socials?: string[];         // platforms in use
  hasWebsite?: 'yes' | 'no' | 'unsure';
  websiteUrl?: string;
  hasApp?: 'android' | 'ios' | 'both' | 'no';
  challenges?: string;
  timeConsumers?: string[];
  goals?: string[];
  // digital presence
  hasDomain?: 'yes' | 'no' | 'unsure';
  hasRepo?: 'yes' | 'no' | 'unsure';
  usesCms?: string;           // 'WordPress', 'Wix', ... or ''
  hasAnalytics?: 'yes' | 'no' | 'unsure';
  maintainer?: string;
  intent?: 'build' | 'connect' | 'both';
  teamSize?: 'just me' | '2-5' | '6-20' | '20+';
  sector?: Sector;
}
export type Sector = 'restaurant' | 'retail' | 'school' | 'services' | 'beauty' | 'health' | 'realestate' | 'ngo' | 'other';
export interface Discovery { answers: DiscoveryAnswers; step: number; completedAt: string | null }

/** What the business should have, with the reason and the honest cost. */
export interface ProductRecommendation {
  kind: 'website' | 'pwa' | 'android' | 'ios';
  verdict: 'recommended' | 'optional' | 'not_now';
  why: string;
  cost: string;           // plain words: one-off and running costs
  time: string;
}
export interface Strategy {
  summary: string;
  journey: 'build' | 'connect' | 'both';
  products: ProductRecommendation[];
  priorities: { title: string; detail: string }[];
  source: 'ai' | 'rules';
  blueprint?: import('./blueprint').Blueprint;
}

/** A generated website: plain content, rendered by the site renderer with one of the themes. */
export interface SiteContent {
  theme: 'clean' | 'warm' | 'bold';
  brand: { name: string; tagline: string; accent: string; phone?: string; email?: string; address?: string; whatsapp?: string };
  seo: { title: string; description: string };
  pages: SitePage[];
}
export interface SitePage { slug: string; title: string; sections: SiteSection[] }
export type SiteSection =
  | { type: 'hero'; heading: string; text: string; cta: string }
  | { type: 'features'; heading: string; items: { title: string; text: string }[] }
  | { type: 'offers'; heading: string; items: { name: string; text: string; price?: string }[] }
  | { type: 'about'; heading: string; text: string }
  | { type: 'testimonials'; heading: string; items: { quote: string; name: string }[] }
  | { type: 'faq'; heading: string; items: { q: string; a: string }[] }
  | { type: 'contact'; heading: string; text: string };

export interface Site {
  id: string; name: string; slug: string;
  status: 'draft' | 'awaiting_approval' | 'published';
  liveVersionId: string | null; draftVersionId: string;
  updatedAt: string;
}
export interface SiteVersion { id: string; siteId: string; number: number; note: string; content: SiteContent; createdAt: string; createdBy: string; approvedAt: string | null }

/** A website or app the business already has, and how much Oliskey Lab may do with it. */
export type AccessLevel = 'public' | 'domain' | 'analytics' | 'cms' | 'source' | 'hosting' | 'backend';
export const ACCESS_LEVELS: { id: AccessLevel; name: string; allows: string }[] = [
  { id: 'public', name: 'Public inspection', allows: 'Read the public pages and report on speed, search and accessibility. Changes nothing.' },
  { id: 'domain', name: 'Domain verified', allows: 'Proves the business owns the address. Still changes nothing.' },
  { id: 'analytics', name: 'Analytics', allows: 'Read visits, sources and conversions.' },
  { id: 'cms', name: 'Content management', allows: 'Edit text, images, products and pages through the site’s own editor.' },
  { id: 'source', name: 'Source code', allows: 'Prepare code changes for review in the business’s repository.' },
  { id: 'hosting', name: 'Hosting and deployment', allows: 'Publish approved changes and roll back.' },
  { id: 'backend', name: 'Backend and database', allows: 'Work on the server and data. Only with explicit approval for each change.' },
];
export interface DigitalProduct {
  id: string; type: 'website' | 'pwa' | 'android' | 'ios'; name: string; url: string;
  origin: 'built' | 'connected'; levels: AccessLevel[];
  domainToken?: string | null; domainVerifiedAt?: string | null;
  health?: { score: number; checkedAt: string } | null;
}
export interface InspectionReport {
  url: string; finalUrl: string; checkedAt: string; status: number; ms: number; bytes: number; https: boolean;
  score: number;
  checks: { id: string; area: 'speed' | 'search' | 'access' | 'trust' | 'conversion'; ok: boolean; title: string; detail: string }[];
}

/** Home numbers. Each figure is null when its source is not connected yet (shown honestly, never invented). */
export interface Metrics {
  health: number | null; healthDelta: number | null;
  customers: number; customersDelta: number | null;
  leads: number; leadsDelta: number | null;
  orders: number | null; ordersDelta: number | null;
  revenue: number | null; revenueDelta: number | null;   // in naira
  trend: number[];                                        // enquiries per week, oldest first
}
export interface FocusItem { id: string; title: string; to: string; done: boolean }

export interface Lead { id: string; name: string; email: string; phone: string; message: string; source: string; status: 'new' | 'contacted' | 'won' | 'lost'; createdAt: string }

export type Permission = 'view' | 'analytics' | 'content' | 'publish' | 'repository' | 'deploy' | 'domain' | 'release' | 'full';
export interface Grant { id: string; productId: string; permission: Permission; grantedBy: string; grantedAt: string; revokedAt: string | null }

export interface AuditEntry { id: string; at: string; actor: string; action: string; target: string; detail?: string }

export type SocialPlatform = 'facebook' | 'instagram' | 'tiktok' | 'youtube' | 'linkedin' | 'whatsapp' | 'google';
export interface SocialAccount { platform: SocialPlatform; status: 'not_connected' | 'awaiting_platform_approval' | 'connected'; handle?: string; followers?: number; reach?: number }
