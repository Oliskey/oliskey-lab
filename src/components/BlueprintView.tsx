import React, { useState } from 'react';
import { ChevronDown, Clock, Laptop, Link2, Smartphone, Tablet, Workflow } from 'lucide-react';
import type { Automation, Blueprint, Dashboard } from '../../shared/blueprint';
import { IconBadge, type Hue } from './icons';
import { ActionButton, Badge } from './ui';

const DEVICE: Record<Dashboard['device'], React.ElementType> = { phone: Smartphone, tablet: Tablet, computer: Laptop, 'phone and computer': Laptop };
const HUES: Hue[] = ['blue', 'violet', 'teal', 'amber', 'green'];

/** The app the business needs: one dashboard per kind of person, with its device and main screens. */
export const Dashboards: React.FC<{ b: Blueprint }> = ({ b }) => (
  <div>
    <p className="max-w-read text-[15px] text-muted">{b.summary}</p>
    {b.existingProduct && <p className="mt-2 text-small">Good news: <a className="font-semibold text-accent-ink" href={b.existingProduct.url}>{b.existingProduct.name}</a> already has these dashboards, ready to use.</p>}
    <ul className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4 grid-cols-1">
      {b.dashboards.map((d, i) => { const D = DEVICE[d.device]; return (
        <li key={d.role} className="card flex flex-col p-5">
          <div className="flex items-start justify-between gap-3"><span className="tnum text-caption font-bold text-faint">{i + 1} of {b.dashboards.length}</span><span className="inline-flex items-center gap-1 text-caption font-semibold text-muted"><D size={14} aria-hidden="true" />{d.device}</span></div>
          <h3 className="mt-2 text-[17px] font-bold leading-snug">{d.role}</h3>
          <p className="text-caption text-muted">For {d.who.toLowerCase()}</p>
          <ul className="mt-3 space-y-1.5">{d.screens.map((s) => <li key={s} className="flex items-center gap-2 text-small"><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${['bg-accent', 'bg-[#7C5CFF]', 'bg-[#0EA5B7]', 'bg-[#F59E0B]', 'bg-[#10B981]'][i % 5]}`} aria-hidden="true" />{s}</li>)}</ul>
          <p className="mt-auto pt-4 text-caption text-muted">{d.why}</p>
        </li>
      ); })}
    </ul>
  </div>
);

/** One automation: when / then in plain words, time saved, what must be connected, and the steps to set it up. */
export const AutomationCard: React.FC<{ a: Automation; i: number; onRequest?: (a: Automation) => Promise<void> }> = ({ a, i, onRequest }) => {
  const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false); const [asked, setAsked] = useState(false);
  return (
    <li className="card p-5">
      <div className="flex items-start gap-4">
        <IconBadge icon={Workflow} hue={HUES[i % HUES.length]} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-[16px] font-bold">{a.title}</h3><Badge tone="good"><Clock size={13} aria-hidden="true" />{a.saves}</Badge></div>
          <p className="mt-1.5 text-small"><span className="font-semibold">When</span> {a.when.charAt(0).toLowerCase() + a.when.slice(1)}, <span className="font-semibold">then</span> {a.then.charAt(0).toLowerCase() + a.then.slice(1)}.</p>
          <p className="mt-1 text-caption text-muted">{a.because}</p>
          <p className="mt-2 flex flex-wrap items-center gap-1.5 text-caption text-muted"><Link2 size={13} aria-hidden="true" />Needs: {a.needs.join(', ')}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 sm:pl-[60px]">
        <button className="btn-secondary btn-sm" aria-expanded={open} onClick={() => setOpen(!open)}>How to set it up<ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" /></button>
        {onRequest && (asked ? <Badge tone="accent">Requested — we will set it up with you</Badge>
          : <ActionButton size="sm" busy={busy} onClick={async () => { setBusy(true); try { await onRequest(a); setAsked(true); } finally { setBusy(false); } }}>Set this up for me</ActionButton>)}
      </div>
      {open && <ol className="enter mt-4 space-y-2 sm:pl-[60px]">{a.steps.map((s, k) => <li key={s} className="flex gap-3 text-small"><span className="tnum grid h-6 w-6 shrink-0 place-items-center rounded-full bg-accent/10 text-[12px] font-bold text-accent-ink">{k + 1}</span><span className="pt-0.5">{s}</span></li>)}</ol>}
    </li>
  );
};

export const Automations: React.FC<{ b: Blueprint; onRequest?: (a: Automation) => Promise<void> }> = ({ b, onRequest }) => (
  <ul className="grid gap-4 lg:grid-cols-2 grid-cols-1">{b.automations.map((a, i) => <AutomationCard key={a.id} a={a} i={i} onRequest={onRequest} />)}</ul>
);
