import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Mic, MicOff, Pencil, Plus, X } from 'lucide-react';
import { useApp } from '../app/context';
import { ActionButton, Badge, ErrorState, LoadingBlock, PageHeader, Section, useToast } from '../components/ui';
import type { DiscoveryAnswers, ProductRecommendation, Strategy } from '../../shared/types';
import { Automations, Dashboards } from '../components/BlueprintView';

type Q =
  | { key: keyof DiscoveryAnswers; ask: string; help?: string; kind: 'text' | 'long' | 'url'; optional?: boolean; placeholder?: string; when?: (a: DiscoveryAnswers) => boolean }
  | { key: keyof DiscoveryAnswers; ask: string; help?: string; kind: 'list'; optional?: boolean; placeholder?: string; when?: (a: DiscoveryAnswers) => boolean }
  | { key: keyof DiscoveryAnswers; ask: string; help?: string; kind: 'pick' | 'one'; options: { v: string; l: string }[]; optional?: boolean; when?: (a: DiscoveryAnswers) => boolean };

const YN = [{ v: 'yes', l: 'Yes' }, { v: 'no', l: 'No' }, { v: 'unsure', l: 'Not sure' }];
// The spec's discovery questions, asked one at a time. Digital-presence questions only appear when they apply.
const QUESTIONS: Q[] = [
  { key: 'businessName', ask: 'What is your business called?', kind: 'text', placeholder: 'e.g. Adunni’s Kitchen' },
  { key: 'whatYouDo', ask: 'What does your business do?', help: 'One or two sentences, as you would tell a customer.', kind: 'long', placeholder: 'e.g. Home-style Nigerian meals and party catering' },
  { key: 'offers', ask: 'What products or services do you offer?', help: 'Add each one separately.', kind: 'list', placeholder: 'e.g. Small chops platter' },
  { key: 'idealCustomers', ask: 'Who are your ideal customers?', kind: 'long', optional: true, placeholder: 'e.g. Office workers and event planners' },
  { key: 'customerLocation', ask: 'Where are your customers?', kind: 'text', optional: true, placeholder: 'e.g. Lekki and Victoria Island, Lagos' },
  { key: 'teamSize', ask: 'How many people work in the business, including you?', help: 'This tells Lab whether your staff need their own dashboards.', kind: 'one', options: [{ v: 'just me', l: 'Just me' }, { v: '2-5', l: '2 to 5' }, { v: '6-20', l: '6 to 20' }, { v: '20+', l: 'More than 20' }] },
  { key: 'howFound', ask: 'How do customers find you today?', kind: 'pick', optional: true, options: ['Word of mouth', 'Instagram', 'Facebook', 'WhatsApp', 'TikTok', 'Google', 'Walk-in', 'Markets and events'].map((l) => ({ v: l, l })) },
  { key: 'socials', ask: 'Which social media do you use for the business?', kind: 'pick', optional: true, options: ['Instagram', 'Facebook', 'WhatsApp Business', 'TikTok', 'YouTube', 'LinkedIn', 'X (Twitter)'].map((l) => ({ v: l, l })) },
  { key: 'hasWebsite', ask: 'Do you already have a website?', kind: 'one', options: YN },
  { key: 'websiteUrl', ask: 'What is your website’s address?', kind: 'url', placeholder: 'mybusiness.com', when: (a) => a.hasWebsite === 'yes' },
  { key: 'hasApp', ask: 'Do you already have a mobile app?', kind: 'one', options: [{ v: 'no', l: 'No' }, { v: 'android', l: 'Android' }, { v: 'ios', l: 'iPhone' }, { v: 'both', l: 'Both' }] },
  { key: 'hasDomain', ask: 'Do you own a domain name (like mybusiness.com)?', kind: 'one', optional: true, options: YN, when: (a) => a.hasWebsite !== 'yes' },
  { key: 'usesCms', ask: 'What is your website built with?', help: 'If you do not know, choose “Not sure”.', kind: 'one', optional: true, options: ['WordPress', 'Wix', 'Shopify', 'Squarespace', 'Custom code', 'Not sure'].map((l) => ({ v: l, l })), when: (a) => a.hasWebsite === 'yes' },
  { key: 'hasRepo', ask: 'Is your website or app code kept in a repository such as GitHub?', kind: 'one', optional: true, options: YN, when: (a) => a.hasWebsite === 'yes' || (!!a.hasApp && a.hasApp !== 'no') },
  { key: 'hasAnalytics', ask: 'Do you measure visits (for example Google Analytics)?', kind: 'one', optional: true, options: YN, when: (a) => a.hasWebsite === 'yes' },
  { key: 'maintainer', ask: 'Who looks after your website today?', kind: 'text', optional: true, placeholder: 'e.g. A freelancer, my nephew, nobody', when: (a) => a.hasWebsite === 'yes' },
  { key: 'challenges', ask: 'What gets in the way most days?', kind: 'long', optional: true, placeholder: 'e.g. Orders on WhatsApp get lost' },
  { key: 'timeConsumers', ask: 'Which tasks take most of your time?', kind: 'pick', optional: true, options: ['Answering WhatsApp enquiries', 'Writing orders in a notebook', 'Posting on social media', 'Chasing payments', 'Keeping stock records', 'Bookings and appointments', 'Making invoices'].map((l) => ({ v: l, l })) },
  { key: 'goals', ask: 'What should Oliskey Lab achieve for you?', kind: 'pick', options: ['More customers', 'More orders', 'Fewer missed messages', 'Look more professional', 'Save time', 'Sell online', 'Understand my numbers'].map((l) => ({ v: l, l })) },
  { key: 'intent', ask: 'Should Lab build something new or manage what you have?', kind: 'one', options: [{ v: 'build', l: 'Build new' }, { v: 'connect', l: 'Manage what I have' }, { v: 'both', l: 'Both' }], when: (a) => a.hasWebsite === 'yes' || (!!a.hasApp && a.hasApp !== 'no') },
];
const asked = (a: DiscoveryAnswers) => QUESTIONS.filter((q) => !q.when || q.when(a));
const shown = (v: unknown) => Array.isArray(v) ? v.join(', ') : ({ 'just me': 'Just me', '2-5': '2 to 5', '6-20': '6 to 20', '20+': 'More than 20', yes: 'Yes', no: 'No', unsure: 'Not sure', android: 'Android', ios: 'iPhone', both: 'Both', build: 'Build new', connect: 'Manage what I have' } as Record<string, string>)[String(v)] || String(v);

/** Voice answers through the browser's own speech recognition, where available (Chrome, Edge, Safari). */
function useDictation(onText: (t: string) => void) {
  const rec = useRef<{ stop: () => void } | null>(null);
  const [on, setOn] = useState(false);
  const W = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  const Ctor = W.SpeechRecognition || W.webkitSpeechRecognition;
  const toggle = () => {
    if (on) { rec.current?.stop(); return; }
    const r = new Ctor!(); r.lang = 'en-NG'; r.interimResults = false;
    r.onresult = (e: any) => onText(Array.from(e.results).map((x: any) => x[0].transcript).join(' '));
    r.onend = () => setOn(false); r.onerror = () => setOn(false);
    rec.current = r; r.start(); setOn(true);
  };
  return { supported: !!Ctor, on, toggle };
}

const Answer: React.FC<{ q: Q; value: unknown; onSubmit: (v: unknown) => void; busy: boolean }> = ({ q, value, onSubmit, busy }) => {
  const [text, setText] = useState(typeof value === 'string' ? value : '');
  const [list, setList] = useState<string[]>(Array.isArray(value) ? (value as string[]) : []);
  const [item, setItem] = useState('');
  const ref = useRef<HTMLInputElement & HTMLTextAreaElement>(null);
  const voice = useDictation((t) => (q.kind === 'list' ? setItem(t) : setText((x) => (x ? `${x} ${t}` : t))));
  useEffect(() => { ref.current?.focus(); }, [q.key]);
  const add = () => { const t = item.trim(); if (t && !list.includes(t)) setList([...list, t]); setItem(''); ref.current?.focus(); };
  const mic = voice.supported && (q.kind === 'long' || q.kind === 'text' || q.kind === 'list') && (
    <button type="button" className={`icon-btn shrink-0 border border-line ${voice.on ? 'bg-bad/10 text-bad' : ''}`} onClick={voice.toggle} aria-pressed={voice.on} aria-label={voice.on ? 'Stop voice answer' : 'Answer by voice'}>{voice.on ? <MicOff size={18} /> : <Mic size={18} />}</button>
  );
  const skip = q.optional && <button type="button" className="btn-quiet" onClick={() => onSubmit(undefined)} disabled={busy}>Skip</button>;

  if (q.kind === 'one') return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={q.ask}>
      {q.options.map((o) => <button key={o.v} className="chip" aria-pressed={value === o.v} onClick={() => onSubmit(o.v)} disabled={busy}>{o.l}</button>)}
      {skip}
    </div>
  );
  if (q.kind === 'pick') {
    const sel = Array.isArray(value) ? (value as string[]) : [];
    return <PickMany key={q.key} options={q.options} initial={sel} onSubmit={onSubmit} busy={busy} skip={skip} label={q.ask} />;
  }
  if (q.kind === 'list') return (
    <form onSubmit={(e) => { e.preventDefault(); if (item.trim()) add(); else if (list.length) onSubmit(list); }}>
      {!!list.length && <ul className="mb-3 flex flex-wrap gap-2">{list.map((x) => <li key={x} className="chip !pr-1.5" aria-pressed="true">{x}<button type="button" className="grid h-7 w-7 place-items-center rounded-full hover:bg-accent/15" aria-label={`Remove ${x}`} onClick={() => setList(list.filter((y) => y !== x))}><X size={14} /></button></li>)}</ul>}
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="dq">{q.ask}</label>
        <input id="dq" ref={ref} className="input" value={item} onChange={(e) => setItem(e.target.value)} placeholder={'placeholder' in q ? q.placeholder : undefined} />
        {mic}
        <button type="button" className="btn-secondary shrink-0" onClick={add} disabled={!item.trim()}><Plus size={18} aria-hidden="true" />Add</button>
      </div>
      <div className="mt-4 flex gap-2"><ActionButton type="submit" busy={busy} disabled={!list.length && !item.trim()}>Continue</ActionButton>{skip}</div>
    </form>
  );
  return (
    <form onSubmit={(e) => { e.preventDefault(); if (text.trim() || q.optional) onSubmit(text.trim() || undefined); }}>
      <div className="flex items-start gap-2">
        <label className="sr-only" htmlFor="dq">{q.ask}</label>
        {q.kind === 'long'
          ? <textarea id="dq" ref={ref} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={'placeholder' in q ? q.placeholder : undefined} rows={3} />
          : <input id="dq" ref={ref} className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={'placeholder' in q ? q.placeholder : undefined} inputMode={q.kind === 'url' ? 'url' : undefined} autoComplete={q.key === 'businessName' ? 'organization' : 'off'} />}
        {mic}
      </div>
      <div className="mt-4 flex gap-2"><ActionButton type="submit" busy={busy} disabled={!text.trim() && !q.optional}>Continue</ActionButton>{skip}</div>
    </form>
  );
};

const PickMany: React.FC<{ options: { v: string; l: string }[]; initial: string[]; onSubmit: (v: unknown) => void; busy: boolean; skip: React.ReactNode; label: string }> = ({ options, initial, onSubmit, busy, skip, label }) => {
  const [sel, setSel] = useState<string[]>(initial);
  return (
    <div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {options.map((o) => <button key={o.v} className="chip" aria-pressed={sel.includes(o.v)} onClick={() => setSel(sel.includes(o.v) ? sel.filter((x) => x !== o.v) : [...sel, o.v])}>{sel.includes(o.v) && <Check size={16} aria-hidden="true" />}{o.l}</button>)}
      </div>
      <div className="mt-4 flex gap-2"><ActionButton busy={busy} disabled={!sel.length} onClick={() => onSubmit(sel)}>Continue</ActionButton>{skip}</div>
    </div>
  );
};

const KIND: Record<ProductRecommendation['kind'], string> = { website: 'Website', pwa: 'Installable web app', android: 'Android app', ios: 'iPhone app' };
const VERDICT: Record<ProductRecommendation['verdict'], { t: string; tone: 'good' | 'accent' | 'neutral' }> = { recommended: { t: 'Recommended', tone: 'good' }, optional: { t: 'Optional', tone: 'accent' }, not_now: { t: 'Not yet', tone: 'neutral' } };

export const Plan: React.FC<{ s: Strategy }> = ({ s }) => (
  <div>
    <p className="max-w-read text-[17px] leading-relaxed">{s.summary}</p>
    <Section title="What your business needs" lead="Lab never pushes an expensive app you do not need. Costs are what you pay others; Lab’s own plan is separate.">
      <ul className="grid gap-4 md:grid-cols-2">
        {s.products.map((p) => (
          <li key={p.kind} className="panel p-5">
            <div className="flex items-start justify-between gap-3"><h3 className="text-card">{KIND[p.kind]}</h3><Badge tone={VERDICT[p.verdict].tone}>{VERDICT[p.verdict].t}</Badge></div>
            <p className="mt-2 text-small">{p.why}</p>
            <dl className="mt-4 grid gap-1 text-caption text-muted"><div><dt className="inline font-semibold text-ink">Cost: </dt><dd className="inline">{p.cost}</dd></div><div><dt className="inline font-semibold text-ink">Time: </dt><dd className="inline">{p.time}</dd></div></dl>
          </li>
        ))}
      </ul>
    </Section>
    {s.blueprint && (<>
      <Section title={`Your app: ${s.blueprint.dashboards.length} dashboards`} lead="One for each kind of person who uses it, on the device they use."><Dashboards b={s.blueprint} /></Section>
      <Section title={`What you can automate: ${s.blueprint.automations.length} jobs`} lead="Routine work that can run by itself. Each one is switched on only with your approval."><Automations b={s.blueprint} /></Section>
    </>)}
    <Section title="Your first priorities">
      <ol className="panel divide-y divide-line">
        {s.priorities.map((p, i) => <li key={p.title} className="flex gap-4 px-5 py-4"><span className="tnum grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent/10 text-caption font-bold text-accent-ink">{i + 1}</span><div><p className="text-[15px] font-semibold">{p.title}</p><p className="mt-0.5 text-small text-muted">{p.detail}</p></div></li>)}
      </ol>
    </Section>
    <p className="mt-4 text-caption text-muted">{s.source === 'ai' ? 'Written with AI from your answers, checked against Oliskey’s rules.' : 'Made from your answers with Oliskey’s rules.'}</p>
  </div>
);

export default function Discovery() {
  const { api } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [idx, setIdx] = useState(0);
  const [done, setDone] = useState<string | null>(null);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [state, setState] = useState<'loading' | 'error' | 'asking' | 'planning' | 'plan'>('loading');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bottom = useRef<HTMLDivElement>(null);

  const load = async () => {
    setState('loading');
    try {
      const [d, s] = await Promise.all([api.discovery(), api.strategy()]);
      setAnswers(d.answers); setDone(d.completedAt); setStrategy(s);
      const qs = asked(d.answers); const first = qs.findIndex((q) => d.answers[q.key] === undefined);
      setIdx(first === -1 ? qs.length : Math.min(d.step, first === -1 ? qs.length : first));
      setState(d.completedAt && s ? 'plan' : 'asking');
    } catch (e) { setErr((e as Error).message); setState('error'); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [api]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [idx]);

  const qs = asked(answers);
  const q = qs[idx];
  const submit = async (v: unknown) => {
    const next = { ...answers, [q.key]: v } as DiscoveryAnswers;
    setBusy(true);
    try { await api.saveDiscovery(next, idx + 1); setAnswers(next); setIdx(idx + 1); }
    catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(false); }
  };
  const finish = async () => {
    setState('planning');
    try { const s = await api.completeDiscovery(); setStrategy(s); setDone(new Date().toISOString()); setState('plan'); toast('Your plan is ready.'); }
    catch (e) { toast((e as Error).message, 'bad'); setState('asking'); }
  };

  if (state === 'loading') return <LoadingBlock rows={4} />;
  if (state === 'error') return <ErrorState message={err} onRetry={load} />;

  if (state === 'plan' && strategy) {
    const journey = strategy.journey;
    return (
      <div className="enter">
        <PageHeader eyebrow="Business Discovery" title={`Your plan for ${answers.businessName || 'your business'}`} action={<>
          <button className="btn-secondary" onClick={() => { setIdx(0); setState('asking'); }}><Pencil size={16} aria-hidden="true" />Change answers</button>
          {journey === 'connect' ? <Link to="/app/control" className="btn-primary">Connect your website<ArrowRight size={18} aria-hidden="true" /></Link>
            : <button className="btn-primary" onClick={() => nav('/app/studio')}>Create your website<ArrowRight size={18} aria-hidden="true" /></button>}
        </>} />
        <div className="mt-8"><Plan s={strategy} /></div>
      </div>
    );
  }

  const progress = Math.min(1, idx / qs.length);
  return (
    <div className="enter mx-auto max-w-read">
      <PageHeader eyebrow="Business Discovery" title="Let’s understand your business" lead="Welcome to Oliskey Lab. Answer in your own words — every answer is saved, and anything optional can be skipped." />
      <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={qs.length} aria-valuenow={idx} aria-label="Discovery progress">
        <div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-glide" style={{ width: `${progress * 100}%` }} />
      </div>
      <p className="mt-2 text-caption text-muted">{Math.min(idx, qs.length)} of {qs.length} answered</p>

      <ol className="mt-8 space-y-5" aria-label="Your answers">
        {qs.slice(0, idx).map((x, i) => (
          <li key={x.key} className="space-y-2">
            <p className="text-small text-muted">{x.ask}</p>
            <div className="flex items-start justify-end gap-2">
              <p className="max-w-[85%] rounded-[18px] rounded-br-md bg-accent/10 px-4 py-2.5 text-[15px] text-ink">{answers[x.key] === undefined ? <span className="text-muted">Skipped</span> : shown(answers[x.key])}</p>
              <button className="icon-btn h-9 w-9 shrink-0" onClick={() => setIdx(i)} aria-label={`Change answer: ${x.ask}`}><Pencil size={15} /></button>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6" ref={bottom}>
        {q ? (
          <div key={q.key} className="enter panel p-5 sm:p-6" aria-live="polite">
            <h2 className="text-[19px] font-semibold leading-snug">{q.ask}</h2>
            {q.help && <p className="mt-1 text-small text-muted">{q.help}</p>}
            {q.optional && <p className="mt-1 text-caption text-faint">Optional</p>}
            <div className="mt-4"><Answer q={q} value={answers[q.key]} onSubmit={submit} busy={busy} /></div>
          </div>
        ) : (
          <div className="enter panel p-6 text-center">
            <h2 className="text-[19px] font-semibold">That is everything we need</h2>
            <p className="mt-1.5 text-small text-muted">Lab will now recommend what to build or connect, with honest costs.</p>
            <ActionButton className="mt-5" busy={state === 'planning'} onClick={finish}>{state === 'planning' ? 'Making your plan…' : 'Make my plan'}</ActionButton>
            {done && <p className="mt-3 text-caption text-muted">Your earlier plan will be replaced.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
