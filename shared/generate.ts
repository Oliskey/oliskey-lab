// Website generator (rules version): builds a complete, honest website from the Discovery answers.
// It only creates the pages a business needs, never invents reviews or prices, and marks anything the owner must
// fill in. The AI version (server) returns the same SiteContent shape and is checked against the same rules.
import type { DiscoveryAnswers, Sector, SiteContent, SitePage } from './types';
import { guessSector } from './recommend';

const OFFERS_PAGE: Record<Sector, { slug: string; title: string; heading: string }> = {
  restaurant: { slug: 'menu', title: 'Menu', heading: 'Our menu' },
  retail: { slug: 'products', title: 'Products', heading: 'What we sell' },
  school: { slug: 'admissions', title: 'Admissions', heading: 'Classes and admissions' },
  services: { slug: 'services', title: 'Services', heading: 'What we do' },
  beauty: { slug: 'services', title: 'Services', heading: 'Treatments' },
  health: { slug: 'services', title: 'Services', heading: 'Care we offer' },
  realestate: { slug: 'listings', title: 'Listings', heading: 'Properties' },
  ngo: { slug: 'programmes', title: 'Programmes', heading: 'Our programmes' },
  other: { slug: 'services', title: 'Services', heading: 'What we offer' },
};
const CTA: Record<Sector, string> = {
  restaurant: 'Order or reserve', retail: 'Ask about an item', school: 'Book a visit', services: 'Request a quote', beauty: 'Book an appointment',
  health: 'Book an appointment', realestate: 'Arrange a viewing', ngo: 'Get involved', other: 'Contact us',
};
const THEME: Record<Sector, SiteContent['theme']> = { restaurant: 'warm', beauty: 'warm', retail: 'bold', realestate: 'bold', school: 'clean', services: 'clean', health: 'clean', ngo: 'warm', other: 'clean' };
const ACCENT: Record<SiteContent['theme'], string> = { clean: '#1F6BFF', warm: '#C2410C', bold: '#0A1A3A' };

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const clean = (s?: string) => (s || '').trim().replace(/\s+/g, ' ');
const sentence = (s: string) => { const c = cap(clean(s)); return c && !/[.!?]$/.test(c) ? `${c}.` : c; };

export function generateSite(a: DiscoveryAnswers): SiteContent {
  const sector = a.sector || guessSector(a);
  const name = clean(a.businessName) || 'Your business';
  const what = clean(a.whatYouDo) || 'We serve our customers with care.';
  const where = clean(a.customerLocation);
  const who = clean(a.idealCustomers);
  const offers = (a.offers || []).map(clean).filter(Boolean).slice(0, 9);
  const o = OFFERS_PAGE[sector];
  const theme = THEME[sector];
  const tagline = sentence(what).replace(/\.$/, '') + (where ? ` in ${where}` : '');

  const home: SitePage = {
    slug: '', title: 'Home', sections: [
      { type: 'hero', heading: name, text: sentence(tagline), cta: CTA[sector] },
      {
        type: 'features', heading: `Why customers choose ${name}`, items: [
          { title: 'Easy to reach', text: 'Call, message on WhatsApp or send the form — we reply quickly.' },
          who ? { title: 'Made for you', text: sentence(`Built around ${who}`) } : { title: 'Clear prices', text: 'Ask for a price and we confirm it before you pay.' },
          where ? { title: 'Close to you', text: sentence(`Serving ${where}`) } : { title: 'Reliable', text: 'We do what we promise, on time.' },
        ],
      },
      ...(offers.length ? [{ type: 'offers' as const, heading: o.heading, items: offers.slice(0, 3).map((n) => ({ name: cap(n), text: 'Ask us for details and the current price.' })) }] : []),
      { type: 'contact', heading: 'Talk to us', text: 'Send a message and we will get back to you.' },
    ],
  };
  const pages: SitePage[] = [home];
  if (offers.length) pages.push({ slug: o.slug, title: o.title, sections: [{ type: 'offers', heading: o.heading, items: offers.map((n) => ({ name: cap(n), text: 'Ask us for details and the current price.' })) }, { type: 'contact', heading: CTA[sector], text: 'Tell us what you need and we will reply.' }] });
  pages.push({ slug: 'about', title: 'About', sections: [{ type: 'about', heading: `About ${name}`, text: [sentence(what), who ? sentence(`We work with ${who}`) : '', where ? sentence(`We are based in ${where}`) : ''].filter(Boolean).join(' ') }] });
  pages.push({
    slug: 'contact', title: 'Contact', sections: [
      { type: 'contact', heading: 'Contact us', text: 'Send us a message. Every enquiry reaches us directly.' },
      { type: 'faq', heading: 'Questions', items: [
        { q: 'How quickly do you reply?', a: 'We reply to messages as soon as we can, usually the same day.' },
        { q: 'How do I pay?', a: 'We confirm the price first, then share the payment options.' },
      ] },
    ],
  });

  return {
    theme,
    brand: { name, tagline: sentence(tagline), accent: ACCENT[theme] },
    seo: { title: `${name}${where ? ` — ${where}` : ''}`, description: sentence(`${what}${where ? ` Serving ${where}` : ''}`).slice(0, 158) },
    pages,
  };
}

/** Checks any generated content (AI or rules) before it is saved: required parts present, no empty pages, and sizes sane. */
export function validateSite(c: SiteContent): string[] {
  const errs: string[] = [];
  if (!c.brand?.name) errs.push('The site needs a business name.');
  if (!c.pages?.length || c.pages[0].slug !== '') errs.push('The site needs a home page.');
  for (const p of c.pages || []) {
    if (!p.sections?.length) errs.push(`The ${p.title} page is empty.`);
    if (!/^[a-z0-9-]*$/.test(p.slug)) errs.push(`The ${p.title} page address is not valid.`);
  }
  if ((c.pages || []).length > 8) errs.push('Too many pages for a first version.');
  if (!(c.pages || []).some((p) => p.sections.some((s) => s.type === 'contact'))) errs.push('The site needs a way to contact the business.');
  return errs;
}
