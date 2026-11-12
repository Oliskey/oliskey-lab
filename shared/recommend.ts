// Rule-based digital strategy: what the business should have (website, installable web app, Android, iOS), why, and
// what it costs outside Oliskey. Used directly in the demo, and by the server whenever the AI is unavailable.
// The rule of the spec: never push a small business into an expensive native app it does not need.
import type { DiscoveryAnswers, ProductRecommendation, Sector, Strategy } from './types';
import { buildBlueprint } from './blueprint';

const has = (list: string[] | undefined, ...words: string[]) => (list || []).some((x) => words.some((w) => x.toLowerCase().includes(w)));
const text = (a: DiscoveryAnswers) => [a.whatYouDo, a.challenges, a.idealCustomers, ...(a.offers || []), ...(a.goals || [])].join(' ').toLowerCase();

export function guessSector(a: DiscoveryAnswers): Sector {
  const t = text(a);
  const rules: [Sector, string[]][] = [
    ['restaurant', ['restaurant', 'food', 'kitchen', 'catering', 'cafe', 'bakery', 'meal', 'chops']],
    ['school', ['school', 'tutor', 'lesson', 'academy', 'pupil', 'student']],
    ['beauty', ['salon', 'hair', 'nail', 'spa', 'beauty', 'makeup', 'barber']],
    ['health', ['clinic', 'pharmacy', 'health', 'hospital', 'dental', 'physio']],
    ['realestate', ['real estate', 'property', 'apartment', 'rent', 'shortlet', 'land']],
    ['ngo', ['ngo', 'charity', 'foundation', 'non-profit', 'nonprofit']],
    ['retail', ['shop', 'store', 'sell', 'fashion', 'clothing', 'boutique', 'products', 'wholesale']],
    ['services', ['service', 'consult', 'repair', 'cleaning', 'logistics', 'delivery', 'printing', 'agency']],
  ];
  for (const [s, words] of rules) if (words.some((w) => t.includes(w))) return s;
  return 'other';
}

export function recommend(a: DiscoveryAnswers): Strategy {
  const sector = a.sector || guessSector(a);
  const t = text(a);
  const ordersOften = /order|deliver|book|appointment|reserve|subscription|member/.test(t) || ['restaurant', 'beauty', 'health'].includes(sector);
  const repeatCustomers = /regular|repeat|loyal|member|parents|students|subscription/.test(t) || sector === 'school';
  const needsDevice = /camera|scan|offline|gps|location|tracking|bluetooth/.test(t);
  const iosAudience = /abroad|diaspora|uk|us|london|international|premium|corporate/.test(t);
  const hasSite = a.hasWebsite === 'yes';
  const hasApp = a.hasApp && a.hasApp !== 'no';
  const journey: Strategy['journey'] = a.intent || (hasSite || hasApp ? 'connect' : 'build');

  const products: ProductRecommendation[] = [
    hasSite
      ? { kind: 'website', verdict: 'recommended', why: 'You already have a website. We connect it, check it and improve it — we do not rebuild what works.', cost: 'Nothing new to buy. Your current domain and hosting stay.', time: 'Connected the same day.' }
      : { kind: 'website', verdict: 'recommended', why: 'Customers search before they buy. A fast website with your offers, prices and a contact form is the base for everything else.', cost: 'A domain name (about ₦15,000–₦25,000 a year). Hosting on Oliskey Lab is included.', time: 'A first version to review in minutes; live after your approval.' },
    {
      kind: 'pwa', verdict: ordersOften || repeatCustomers ? 'recommended' : 'optional',
      why: ordersOften || repeatCustomers
        ? 'Customers come back to you often. An installable web app puts your business on their home screen, can send reminders, and needs no app store.'
        : 'Useful later if customers start ordering or booking often. Your website can become installable without a rebuild.',
      cost: 'No store fees. Built on your website.', time: 'Added to the website in a day.',
    },
    {
      kind: 'android', verdict: needsDevice || (repeatCustomers && ordersOften) ? 'optional' : 'not_now',
      why: needsDevice ? 'You need phone features (camera, location or offline use) that work best in a store app.' : 'Most of your customers can be served by the website and installable web app first. Add a store app when the numbers justify it.',
      cost: 'Google Play account: US$25 once, in your own name.', time: 'About 2–4 weeks including Google’s review.',
    },
    {
      kind: 'ios', verdict: iosAudience && (needsDevice || ordersOften) ? 'optional' : 'not_now',
      why: iosAudience ? 'Part of your audience is on iPhone abroad; an App Store presence can help — after Android proves demand.' : 'Not needed yet. iPhone users can install the web app from Safari.',
      cost: 'Apple Developer account: US$99 every year, in your own name.', time: 'About 3–5 weeks including Apple’s review.',
    },
  ];

  const priorities: Strategy['priorities'] = [];
  if (!hasSite) priorities.push({ title: 'Get found online', detail: 'Publish a website with your offers, prices, location and a contact form that sends every enquiry to your customer list.' });
  else priorities.push({ title: 'Check and improve your website', detail: 'Inspect speed, search listing and contact paths, then fix what loses customers — with your approval for every change.' });
  if ((a.socials || []).length) priorities.push({ title: 'Bring your social accounts into one place', detail: `Connect ${(a.socials || []).join(', ')} so posts, messages and results sit beside your website.` });
  else priorities.push({ title: 'Start one social channel well', detail: 'Pick the platform your customers use most and post on a steady plan, rather than many channels poorly.' });
  if (has(a.timeConsumers, 'whatsapp', 'message', 'enquir', 'call')) priorities.push({ title: 'Stop losing enquiries', detail: 'Every message and form becomes a lead with a status, so nobody is forgotten and you see what turns into sales.' });
  if (has(a.timeConsumers, 'record', 'book', 'paper', 'excel', 'spreadsheet', 'invoice', 'stock')) priorities.push({ title: 'Move paper work into the system', detail: 'Turn the records you keep by hand into simple digital forms and reports.' });
  priorities.push({ title: 'Measure, then improve every month', detail: 'Visits, enquiries and sales are tracked, and Lab suggests the next improvement each month.' });

  const name = a.businessName || 'Your business';
  const summary = journey === 'connect'
    ? `${name} already has a digital presence. Oliskey Lab will connect it, find what is holding customers back and improve it step by step, without rebuilding what works.`
    : `${name} needs a clear online home first. Oliskey Lab will build a website from your answers, connect your enquiries and social media, and grow from there.`;
  return { summary, journey, products, priorities: priorities.slice(0, 5), source: 'rules', blueprint: buildBlueprint({ ...a, sector }) };
}
