import React from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { Check, Clock, PlayCircle, Zap } from 'lucide-react';
import { useApp } from '../app/context';
import { NAV } from '../app/nav';
import { Badge, PageHeader, Section } from '../components/ui';
import { SAMPLE } from '../lib/demoData';
import { Soon } from './Grow';

const S = SAMPLE;
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => <div className={`rounded-[18px] border border-line bg-raised p-5 ${className}`}>{children}</div>;

/** What each module does, in one sentence each (shown to real accounts until the module opens). */
const PROMISE: Record<string, string> = {
  integrations: 'Connect payments, email, analytics and messaging through each provider’s own secure sign-in.',
  marketing: 'Plan posts, run adverts with an approved budget and see what each enquiry cost.',
  insights: 'Where customers come from, who comes back, and what changed this week — in plain words.',
  digitise: 'Turn notebooks, wall registers and loose spreadsheets into simple forms everyone can use on a phone.',
  automation: 'Let routine work run by itself: instant replies, reminders and follow-ups, each one switched on by you.',
  improve: 'A weekly update: what improved, what slipped, and the next best change — applied only with your approval.',
  coach: 'Short lessons and an AI coach that answers questions about your own business.',
  billing: 'Your plan, invoices and usage, with payment by card or transfer.',
  admin: 'Oliskey staff tools for supporting businesses. Not visible to customers.',
};

const Demo: Record<string, () => React.ReactNode> = {
  integrations: () => <ul className="grid gap-3 md:grid-cols-2 grid-cols-1">{S.integrations.map((i) => <li key={i.name}><Card className="flex items-center justify-between gap-3"><div><p className="text-[16px] font-semibold">{i.name}</p><p className="text-small text-muted">{i.what}</p></div><Badge tone={i.status === 'Connected' ? 'good' : i.status === 'Available' ? 'neutral' : 'warn'}>{i.status}</Badge></Card></li>)}</ul>,
  marketing: () => (<>
    <Section title="Campaigns" className="!mt-0"><div id="campaigns" className="grid gap-3 md:grid-cols-3 grid-cols-1">{S.campaigns.map((c) => <Card key={c.name}><div className="flex items-start justify-between gap-2"><p className="text-[16px] font-semibold">{c.name}</p><Badge tone={c.status === 'Running' ? 'good' : c.status === 'Finished' ? 'neutral' : 'warn'}>{c.status}</Badge></div><p className="tnum mt-3 text-small">{c.leads} enquiries · ₦{c.spent.toLocaleString()} of ₦{c.budget.toLocaleString()}</p></Card>)}</div></Section>
    <Section title="Content calendar"><ul id="calendar" className="space-y-2">{S.posts.map((p) => <li key={p.title}><Card className="flex items-center gap-4 !py-3.5"><span className="w-14 shrink-0 text-[14px] font-bold">{p.day} <span className="font-normal text-muted">{p.time}</span></span><span className="flex-1 text-[15px]">{p.title} <span className="text-muted">· {p.platform}</span></span><Badge tone={p.status === 'Scheduled' ? 'good' : 'neutral'}>{p.status}</Badge></Card></li>)}</ul></Section>
    <Section title="Content ideas"><ul id="content" className="grid gap-3 md:grid-cols-3 grid-cols-1">{S.ideas.map((i) => <li key={i.title}><Card><p className="text-[15px] font-semibold">{i.title}</p><p className="mt-1 text-small text-muted">{i.why}</p></Card></li>)}</ul></Section>
  </>),
  insights: () => (<div className="grid gap-4 lg:grid-cols-2 grid-cols-1">
    <Card><h2 className="text-card">Where enquiries come from</h2><ul className="mt-4 space-y-3">{S.insights.sources.map((s) => <li key={s.l}><div className="flex justify-between text-small"><span>{s.l}</span><span className="tnum font-semibold">{s.v}%</span></div><div className="mt-1.5 h-2 rounded-full bg-ink/[0.07]"><div className="h-full rounded-full bg-accent" style={{ width: `${s.v}%` }} /></div></li>)}</ul></Card>
    <Card><h2 className="text-card">What we found</h2><ul className="mt-3 space-y-3">{S.insights.findings.map((f) => <li key={f} className="flex gap-2.5 text-[15px]"><Zap size={18} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />{f}</li>)}</ul></Card>
    <Card className="lg:col-span-2"><h2 className="text-card">Customer groups</h2><ul className="mt-3 grid gap-3 sm:grid-cols-3 grid-cols-1">{S.insights.segments.map((g) => <li key={g.l} className="rounded-field bg-surface p-4"><p className="tnum text-stat">{g.n}</p><p className="text-small text-muted">{g.l}</p></li>)}</ul></Card>
  </div>),
  digitise: () => <ul className="grid gap-3 md:grid-cols-3 grid-cols-1">{S.forms.map((f) => <li key={f.name}><Card className="h-full"><p className="text-[16px] font-semibold">{f.name}</p><p className="mt-1 text-caption text-muted">Was: {f.was}</p><p className="mt-3 text-small">{f.fields}</p><p className="tnum mt-3 text-caption font-semibold text-accent-ink">{f.entries} entries</p></Card></li>)}</ul>,
  automation: () => <ul className="space-y-3">{S.automations.map((a) => <li key={a.name}><Card className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex-1"><p className="text-[16px] font-semibold">{a.name}</p><p className="mt-1 text-small text-muted"><span className="font-semibold text-ink">When</span> {a.trigger.toLowerCase()} → {a.action.toLowerCase()}</p><p className="tnum mt-1 text-caption text-faint">Ran {a.runs} times</p></div><Badge tone={a.on ? 'good' : 'neutral'}>{a.on ? 'On' : 'Off'}</Badge></Card></li>)}</ul>,
  improve: () => <ul className="space-y-3">{S.improvements.map((i) => <li key={i.title}><Card className="flex flex-wrap items-center gap-3"><p className="flex-1 text-[16px] font-semibold">{i.title}</p><Badge tone="accent">Impact: {i.impact}</Badge><Badge>Effort: {i.effort}</Badge><Badge tone={i.status === 'Done' ? 'good' : i.status === 'In review' ? 'warn' : 'neutral'}>{i.status === 'Done' && <Check size={13} aria-hidden="true" />}{i.status}</Badge></Card></li>)}</ul>,
  coach: () => <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 grid-cols-1">{S.lessons.map((l) => <li key={l.title}><Card className="flex h-full items-start gap-3"><PlayCircle size={24} className="shrink-0 text-accent" aria-hidden="true" /><div><p className="text-[15px] font-semibold">{l.title}</p><p className="mt-1 flex items-center gap-1 text-caption text-muted"><Clock size={13} aria-hidden="true" />{l.mins} min</p></div></Card></li>)}</ul>,
  billing: () => <div className="grid gap-4 md:grid-cols-2 grid-cols-1"><Card><p className="text-caption text-muted">Current plan</p><p className="mt-1 text-[24px] font-bold">{S.billing.plan}</p><p className="text-small">{S.billing.price} · renews {S.billing.renews}</p></Card><Card><p className="text-card">Usage</p><dl className="mt-3 space-y-2">{S.billing.usage.map((u) => <div key={u.l} className="flex justify-between text-small"><dt className="text-muted">{u.l}</dt><dd className="tnum font-semibold">{u.v}</dd></div>)}</dl></Card></div>,
  admin: () => <Card><p className="text-small text-muted">Oliskey staff see all businesses here for support, with every access recorded in the business’s own history. This area is shown in the demo only.</p></Card>,
};

export default function Module() {
  const { module } = useParams();
  const { api } = useApp();
  const item = NAV.find((n) => n.to === `/app/${module}`);
  if (!item || !PROMISE[module!]) return <Navigate to="/app/more" replace />;
  return (
    <div className="enter">
      <PageHeader title={item.label} lead={PROMISE[module!]} action={api.demo ? <Badge tone="accent">Sample data</Badge> : undefined} />
      <div className="mt-8">{api.demo ? Demo[module!]() : <Soon what={item.label} text={PROMISE[module!]} />}</div>
    </div>
  );
}
