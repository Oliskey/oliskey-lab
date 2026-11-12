// AI (Google Gemini) for the plan and the first website. Optional: with no GEMINI_API_KEY, or if the answer is not usable,
// Lab uses its rules instead, so the product always works. AI output is checked before it is saved; the honest product
// recommendations (costs, store fees) always come from the rules and are never left to the AI.
import { GoogleGenerativeAI } from '@google/generative-ai';
import type { DiscoveryAnswers, SiteContent, Strategy } from '../shared/types';
import { recommend } from '../shared/recommend';
import { generateSite, validateSite } from '../shared/generate';

const key = process.env.GEMINI_API_KEY;
const model = key ? new GoogleGenerativeAI(key).getGenerativeModel({ model: process.env.GEMINI_MODEL || 'gemini-2.0-flash', generationConfig: { responseMimeType: 'application/json', temperature: 0.4 } }) : null;

async function ask(prompt: string): Promise<unknown | null> {
  if (!model) return null;
  try {
    const r = await Promise.race([model.generateContent(prompt), new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 20000))]);
    return JSON.parse(r.response.text());
  } catch { return null; }
}
const facts = (a: DiscoveryAnswers) => JSON.stringify({ name: a.businessName, does: a.whatYouDo, offers: a.offers, customers: a.idealCustomers, where: a.customerLocation, foundBy: a.howFound, socials: a.socials, challenges: a.challenges, timeConsumers: a.timeConsumers, goals: a.goals });

export async function makeStrategy(a: DiscoveryAnswers): Promise<Strategy> {
  const base = recommend(a);
  const out = await ask(`You advise small Nigerian businesses. From these facts, write a short plan in plain, friendly British English for a non-technical owner.
Return JSON: {"summary": string (2 sentences), "priorities": [{"title": string (max 7 words), "detail": string (1 sentence)}] (3 to 5 items)}.
Use only the facts given; do not invent numbers, prices or customers. Facts: ${facts(a)}`) as { summary?: string; priorities?: { title: string; detail: string }[] } | null;
  if (!out || typeof out.summary !== 'string' || !Array.isArray(out.priorities) || !out.priorities.length) return base;
  const priorities = out.priorities.filter((p) => typeof p?.title === 'string' && typeof p?.detail === 'string').slice(0, 5).map((p) => ({ title: p.title.slice(0, 80), detail: p.detail.slice(0, 300) }));
  return priorities.length ? { ...base, summary: out.summary.slice(0, 600), priorities, source: 'ai' } : base;
}

export async function makeSite(a: DiscoveryAnswers): Promise<SiteContent> {
  const base = generateSite(a);
  const out = await ask(`Write the text for a small business website in plain British English. Keep the given structure and page slugs; improve only the wording.
Never invent prices, reviews, testimonials, awards or numbers. Facts: ${facts(a)}
Return the same JSON shape as this draft, with better wording: ${JSON.stringify(base)}`) as SiteContent | null;
  if (!out || validateSite(out).length || out.pages.length !== base.pages.length || out.pages.some((p, i) => p.slug !== base.pages[i].slug)) return base;
  if (out.pages.some((p) => p.sections.some((s) => s.type === 'testimonials'))) return base;   // never fabricated reviews
  return { ...out, theme: base.theme, brand: { ...out.brand, accent: base.brand.accent } };
}
