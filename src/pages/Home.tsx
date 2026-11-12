import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, ArrowDown, Bell, Check, ChevronRight, History, Info, ShoppingCart, Target, TrendingUp, Users } from 'lucide-react';
import { useApp } from '../app/context';
import { ErrorState, LoadingBlock, Logo, fmtAgo, useLoad, useToast } from '../components/ui';
import { Duo } from '../components/icons';
import { Plan } from './Discovery';
import type { FocusItem, Metrics } from '../../shared/types';

const greeting = () => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
export const naira = (n: number) => (n >= 1e6 ? `₦${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2)}m` : `₦${n.toLocaleString('en-NG')}`);

/** The Business Health ring card: one number for the whole digital presence, and its change this month. */
const HealthCard: React.FC<{ m: Metrics }> = ({ m }) => {
  const v = m.health; const r = 34; const c = 2 * Math.PI * r;
  return (
    <Link to="/app/control" className="group relative flex items-center gap-5 overflow-hidden rounded-[22px] bg-[linear-gradient(135deg,#0A2A8A_0%,#1F6BFF_60%,#4C8DFF_100%)] p-5 text-white shadow-[0_18px_40px_-20px_rgba(31,107,255,0.7)] sm:p-6">
      <span aria-hidden="true" className="pointer-events-none absolute -right-10 -top-16 h-48 w-48 rounded-full bg-white/15 blur-2xl" />
      <svg aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-20 w-full opacity-40" viewBox="0 0 400 80" preserveAspectRatio="none"><path d="M0 50 C80 20 160 70 240 40 S360 30 400 45 V80 H0Z" fill="rgba(255,255,255,0.18)" /><path d="M0 62 C90 40 170 80 260 56 S370 50 400 60 V80 H0Z" fill="rgba(255,255,255,0.12)" /></svg>
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[22px] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" />
      <svg viewBox="0 0 84 84" className="h-[84px] w-[84px] shrink-0 -rotate-90" aria-hidden="true">
        <circle cx="42" cy="42" r={r} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="9" />
        <circle cx="42" cy="42" r={r} fill="none" stroke="#7FE3FF" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - (v ?? 0) / 100)} className="transition-[stroke-dashoffset] duration-700 ease-glide" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[15px] font-semibold text-white/90">Business Health <Info size={15} aria-hidden="true" /></p>
        <p className="tnum mt-1 text-[38px] font-bold leading-none tracking-tight">{v === null ? '—' : `${v}%`}</p>
        {m.healthDelta !== null && v !== null ? <span className="mt-2 inline-flex items-center gap-1 rounded-control bg-[#C9F7DA] px-2.5 py-1 text-[13px] font-bold text-[#0A7A43]"><ArrowUp size={14} aria-hidden="true" />+{m.healthDelta}%</span>
          : <p className="mt-2 text-caption text-white/80">{v === null ? 'Inspect your website to get a score' : 'First check this month'}</p>}
      </div>
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true"><ChevronRight size={20} /></span>
      <span className="sr-only">Open the Control Centre</span>
    </Link>
  );
};

const Delta: React.FC<{ d: number | null }> = ({ d }) => d === null ? null : (
  <span className={`inline-flex items-center gap-0.5 text-[12px] font-bold ${d >= 0 ? 'text-good' : 'text-bad'}`}>{d >= 0 ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />}{d >= 0 ? '+' : ''}{d}%<span className="sr-only"> this month</span></span>
);
const Tile: React.FC<{ icon: React.ElementType; value: React.ReactNode; label: string; delta: number | null; to: string; empty?: string }> = ({ icon, value, label, delta, to, empty }) => (
  <Link to={to} className="card flex flex-col p-4 transition-transform duration-150 hover:-translate-y-0.5 sm:p-5">
    <div className="flex items-start justify-between"><Duo icon={icon} size={28} /><Delta d={delta} /></div>
    <p className={`tnum mt-3 font-bold leading-none tracking-tight ${empty ? 'text-[15px] text-muted' : 'text-[26px] text-ink'}`}>{empty || value}</p>
    <p className="mt-1.5 text-[14px] text-muted">{label}</p>
  </Link>
);

const Focus: React.FC<{ items: FocusItem[]; onToggle: (i: FocusItem) => void; limit?: number }> = ({ items, onToggle, limit = 3 }) => {
  const done = items.filter((i) => i.done).length;
  return (
    <section className="card p-5">
      <div className="flex items-baseline justify-between"><h2 className="text-[19px] font-bold tracking-tight">This Week’s Focus</h2><p className="text-[13px] text-muted">{done} of {items.length} done</p></div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={items.length} aria-valuenow={done} aria-label="Weekly focus progress"><div className="h-full rounded-full bg-accent transition-[width] duration-500 ease-glide" style={{ width: `${(done / Math.max(1, items.length)) * 100}%` }} /></div>
      <ul className="mt-2 divide-y divide-line">
        {items.slice(0, limit).map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2.5">
            <button onClick={() => onToggle(i)} aria-pressed={i.done} aria-label={i.done ? `Mark “${i.title}” as not done` : `Mark “${i.title}” as done`}
              className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition-colors ${i.done ? 'border-accent bg-accent text-white' : 'border-line hover:border-accent'}`}>{i.done && <Check size={15} strokeWidth={3} aria-hidden="true" />}</button>
            <Link to={i.to} className="flex min-h-[40px] flex-1 items-center justify-between gap-3 text-[15px] font-semibold"><span className={i.done ? 'text-muted line-through decoration-faint' : ''}>{i.title}</span><ChevronRight size={18} className="shrink-0 text-faint" aria-hidden="true" /></Link>
          </li>
        ))}
      </ul>
    </section>
  );
};

/** Home: who you are, how the business is doing, the numbers that matter, and what to do this week. */
export default function Home() {
  const { api, session } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<'overview' | 'week' | 'plan'>('overview');
  const { data, error, loading, reload, set } = useLoad(async () => {
    const [metrics, focus, audit, leads, strategy, discovery] = await Promise.all([api.metrics(), api.focus(), api.audit(), api.leads(), api.strategy(), api.discovery()]);
    return { metrics, focus, audit, leads, strategy, discovery };
  }, [api]);
  if (loading) return <LoadingBlock rows={5} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const { metrics: m, focus, audit, leads, strategy, discovery } = data;
  const first = session?.user.name.split(' ')[0];
  const growing = (m.leadsDelta ?? 0) > 0 || (m.customersDelta ?? 0) > 0;
  const headline = !discovery.completedAt ? 'Let’s get your business online' : growing ? 'Your business is growing' : 'Here is how your business is doing';
  const toggle = async (i: FocusItem) => { try { set({ ...data, focus: await api.setFocus(i.id, !i.done) }); if (!i.done) toast('Nice work — marked as done.'); } catch (e) { toast((e as Error).message, 'bad'); } };
  const week = audit.filter((a) => Date.now() - new Date(a.at).getTime() < 7 * 864e5);
  const newLeads = leads.filter((l) => l.status === 'new');

  return (
    <div className="enter">
      <div className="flex items-center justify-between md:hidden">
        <Logo className="h-7" />
        <div className="flex items-center gap-1">
          <Link to="/app/access" className="icon-btn relative" aria-label={`Activity${newLeads.length ? `, ${newLeads.length} new` : ''}`}><Bell size={22} />{!!newLeads.length && <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-bad" aria-hidden="true" />}</Link>
          <Link to="/app/access" className="grid h-10 w-10 place-items-center rounded-full bg-accent/12 text-[15px] font-bold text-accent-ink" aria-label="Settings and access">{session?.user.name.slice(0, 1)}</Link>
        </div>
      </div>

      <div className="mt-5 md:mt-0 md:flex md:items-end md:justify-between md:gap-6">
        <div>
          <p className="text-[16px] text-muted">{greeting()}{first ? `, ${first}` : ''} <span aria-hidden="true">👋</span></p>
          <h1 className="mt-1 text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-tight tracking-[-0.03em]">{headline}</h1>
        </div>
        <div className="mt-5 grid grid-cols-3 rounded-control bg-ink/[0.05] p-1 md:mt-0 md:w-[400px]" role="tablist" aria-label="Home view">
          {([['overview', 'Overview'], ['week', 'This Week'], ['plan', 'Action Plan']] as const).map(([k, l]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`min-h-[40px] rounded-control text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-200 ${tab === k ? 'bg-accent text-white shadow-[0_6px_16px_-8px_rgba(31,107,255,0.8)]' : 'text-ink hover:bg-ink/5'}`}>{l}</button>
          ))}
        </div>
      </div>

      {tab === 'overview' && (
        <div className="enter mt-6 grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-5"><HealthCard m={m} /></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:col-span-7 lg:grid-cols-4">
            <Tile icon={Users} value={m.customers.toLocaleString()} label="Customers" delta={m.customersDelta} to="/app/customers" />
            <Tile icon={Target} value={m.leads.toLocaleString()} label="Leads" delta={m.leadsDelta} to="/app/customers" />
            <Tile icon={ShoppingCart} value={m.orders?.toLocaleString()} label="Orders" delta={m.ordersDelta} to="/app/integrations" empty={m.orders === null ? 'Connect sales' : undefined} />
            <Tile icon={TrendingUp} value={m.revenue !== null ? naira(m.revenue) : null} label="Revenue" delta={m.revenueDelta} to="/app/integrations" empty={m.revenue === null ? 'Connect payments' : undefined} />
          </div>
          <div className="lg:col-span-7"><Focus items={focus} onToggle={toggle} /></div>
          <section className="card p-5 lg:col-span-5">
            <div className="flex items-baseline justify-between"><h2 className="text-[19px] font-bold tracking-tight">New enquiries</h2><Link to="/app/customers" className="text-[14px] font-semibold text-accent-ink">See all</Link></div>
            {newLeads.length ? <ul className="mt-2 divide-y divide-line">{newLeads.slice(0, 3).map((l) => <li key={l.id} className="py-3"><p className="text-[15px] font-semibold">{l.name} <span className="font-normal text-faint">· {l.source} · {fmtAgo(l.createdAt)}</span></p><p className="mt-0.5 line-clamp-1 text-small text-muted">{l.message}</p></li>)}</ul>
              : <p className="mt-3 text-small text-muted">No new enquiries. When customers use your website form, they appear here.</p>}
          </section>
        </div>
      )}

      {tab === 'week' && (
        <div className="enter mt-6 grid gap-4 lg:grid-cols-2">
          <Focus items={focus} onToggle={toggle} limit={10} />
          <section className="card p-5">
            <h2 className="text-[19px] font-bold tracking-tight">What happened this week</h2>
            {week.length ? <ul className="mt-2 divide-y divide-line">{week.slice(0, 8).map((a) => <li key={a.id} className="flex gap-3 py-3 text-small"><History size={16} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" /><div><p><span className="font-semibold">{a.action}</span> · {a.target}</p><p className="text-caption text-muted">{a.actor} · {fmtAgo(a.at)}</p></div></li>)}</ul>
              : <p className="mt-3 text-small text-muted">Nothing yet this week.</p>}
          </section>
        </div>
      )}

      {tab === 'plan' && (
        <div className="enter mt-6">
          {strategy ? <Plan s={strategy} /> : (
            <div className="card p-6"><h2 className="text-[19px] font-bold">No plan yet</h2><p className="mt-1 text-small text-muted">Answer a few questions about your business and Lab writes your action plan.</p><Link to="/app/discovery" className="btn-primary mt-5">Start Business Discovery</Link></div>
          )}
        </div>
      )}
    </div>
  );
}
