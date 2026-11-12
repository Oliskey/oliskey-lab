// Public website inspection: reads one page's HTML (fetched by the server) and reports what helps or hurts the business —
// speed, search listing, accessibility, trust and whether a visitor can contact the business. It never changes anything.
import type { InspectionReport } from './types';

type Check = InspectionReport['checks'][number];
const count = (html: string, re: RegExp) => (html.match(re) || []).length;
const attr = (tag: string, name: string) => (tag.match(new RegExp(`${name}\\s*=\\s*["']([^"']*)["']`, 'i')) || [])[1];

export function analyse(html: string, meta: { url: string; finalUrl: string; status: number; ms: number; bytes: number }): InspectionReport {
  const head = (html.match(/<head[\s\S]*?<\/head>/i) || [''])[0];
  const title = ((head.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '').trim();
  const metas = head.match(/<meta[^>]+>/gi) || [];
  const metaBy = (n: string) => metas.find((m) => new RegExp(`(name|property)\\s*=\\s*["']${n}["']`, 'i').test(m));
  const desc = attr(metaBy('description') || '', 'content') || '';
  const viewport = !!metaBy('viewport');
  const h1 = count(html, /<h1[\s>]/gi);
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter((t) => attr(t, 'alt') === undefined).length;
  const lang = /<html[^>]*\blang\s*=/i.test(html);
  const canonical = /<link[^>]+rel\s*=\s*["']canonical["']/i.test(head);
  const og = !!metaBy('og:title') && !!metaBy('og:image');
  const schema = /application\/ld\+json/i.test(html);
  const contact = /href\s*=\s*["'](tel:|mailto:|https?:\/\/(wa\.me|api\.whatsapp\.com))/i.test(html) || /<form\b/i.test(html);
  const https = meta.finalUrl.startsWith('https://');
  const scripts = count(html, /<script\b[^>]*\bsrc=/gi);
  const kb = Math.round(meta.bytes / 1024);

  const checks: Check[] = [
    { id: 'status', area: 'trust', ok: meta.status >= 200 && meta.status < 400, title: meta.status < 400 ? 'The page opens' : `The page returned an error (${meta.status})`, detail: meta.status < 400 ? 'Visitors reach the page without errors.' : 'Visitors see an error instead of the business. Fix this first.' },
    { id: 'https', area: 'trust', ok: https, title: https ? 'Secure address (https)' : 'Not on a secure address', detail: https ? 'Browsers show the page as secure.' : 'Browsers warn visitors that the page is “Not secure”. Turn on https.' },
    { id: 'speed', area: 'speed', ok: meta.ms < 1500, title: `Server answered in ${(meta.ms / 1000).toFixed(1)} s`, detail: meta.ms < 1500 ? 'The first response is quick.' : 'Slow first response. Many visitors leave before a slow page appears; check hosting and caching.' },
    { id: 'weight', area: 'speed', ok: kb < 400, title: `Page HTML is ${kb} KB`, detail: kb < 400 ? 'A light page.' : 'The page itself is heavy; large inline content slows phones on mobile data.' },
    { id: 'scripts', area: 'speed', ok: scripts <= 15, title: `${scripts} script files`, detail: scripts <= 15 ? 'A reasonable number of scripts.' : 'Many scripts delay the page on phones. Remove unused plugins and trackers.' },
    { id: 'viewport', area: 'access', ok: viewport, title: viewport ? 'Built for phones' : 'Not set up for phones', detail: viewport ? 'The page sizes itself to phone screens.' : 'The page shows as a tiny desktop page on phones. Add a viewport setting.' },
    { id: 'title', area: 'search', ok: title.length >= 10 && title.length <= 65, title: title ? `Page title: “${title.slice(0, 60)}”` : 'No page title', detail: !title ? 'Search results show no clear name. Add a title with the business name and what it does.' : title.length > 65 ? 'The title is cut off in search results; keep it under about 60 characters.' : title.length < 10 ? 'The title is too short to describe the business.' : 'A clear title for search results.' },
    { id: 'desc', area: 'search', ok: desc.length >= 50 && desc.length <= 170, title: desc ? 'Search description present' : 'No search description', detail: !desc ? 'Search engines invent a summary. Write one or two sentences saying what you offer and where.' : desc.length < 50 ? 'The description is very short.' : desc.length > 170 ? 'The description is cut off in search results.' : 'A good description for search results.' },
    { id: 'h1', area: 'search', ok: h1 === 1, title: h1 === 1 ? 'One main heading' : h1 === 0 ? 'No main heading' : `${h1} main headings`, detail: h1 === 1 ? 'Search engines and screen readers know what the page is about.' : 'Use exactly one main heading (h1) that names the page’s purpose.' },
    { id: 'alt', area: 'access', ok: noAlt === 0, title: noAlt ? `${noAlt} of ${imgs.length} images have no description` : imgs.length ? 'All images are described' : 'No images', detail: noAlt ? 'Add short descriptions (alt text) so blind visitors and search engines understand them.' : 'Images are described for screen readers and search.' },
    { id: 'lang', area: 'access', ok: lang, title: lang ? 'Language is set' : 'Language is not set', detail: lang ? 'Screen readers pronounce the page correctly.' : 'Set the page language so screen readers read it correctly.' },
    { id: 'share', area: 'search', ok: og, title: og ? 'Share preview set' : 'No share preview', detail: og ? 'Links shared on WhatsApp and social media show a title and picture.' : 'Links shared on WhatsApp and social media show no picture. Add a share title and image.' },
    { id: 'schema', area: 'search', ok: schema, title: schema ? 'Business details for search engines' : 'No business details for search engines', detail: schema ? 'Search engines can read the business details.' : 'Add structured business details (name, address, hours) to appear richer in search.' },
    { id: 'canonical', area: 'search', ok: canonical, title: canonical ? 'Main address declared' : 'Main address not declared', detail: canonical ? 'Search engines know the main address of this page.' : 'Declare the main address so search engines do not split results between copies.' },
    { id: 'contact', area: 'conversion', ok: contact, title: contact ? 'Visitors can contact the business' : 'No direct way to contact', detail: contact ? 'A phone, email, WhatsApp link or form is on the page.' : 'Add a phone link, WhatsApp button or form — this is where customers are won or lost.' },
  ];
  const weights: Record<string, number> = { status: 3, https: 2, contact: 3, viewport: 2, title: 2, desc: 1, speed: 2, h1: 1, alt: 1, lang: 1, share: 1, schema: 1, canonical: 1, weight: 1, scripts: 1 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const score = Math.round((100 * checks.reduce((a, c) => a + (c.ok ? weights[c.id] || 1 : 0), 0)) / total);
  return { url: meta.url, finalUrl: meta.finalUrl, checkedAt: new Date().toISOString(), status: meta.status, ms: meta.ms, bytes: meta.bytes, https, score, checks };
}
