import { useMemo, useState } from 'react';
import { Mail, MessageCircle, Phone, Search, Users } from 'lucide-react';
import { useApp } from '../app/context';
import { Badge, Dialog, EmptyState, ErrorState, LoadingBlock, fmtAgo, fmtDate, useLoad, useToast } from '../components/ui';
import { HubHeader, Segmented } from '../components/blocks';
import type { Lead } from '../../shared/types';

const STATUS: Record<Lead['status'], { t: string; tone: 'accent' | 'warn' | 'good' | 'neutral' }> = { new: { t: 'New', tone: 'accent' }, contacted: { t: 'Contacted', tone: 'warn' }, won: { t: 'Customer', tone: 'good' }, lost: { t: 'Not now', tone: 'neutral' } };

/** Customers: every enquiry from the website, social media and WhatsApp, with a status so nobody is forgotten. */
export default function Customers() {
  const { api } = useApp();
  const toast = useToast();
  const [filter, setFilter] = useState<'all' | Lead['status']>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<Lead | null>(null);
  const { data, error, loading, reload, set } = useLoad(() => api.leads(), [api]);
  const list = useMemo(() => (data || []).filter((l) => (filter === 'all' || l.status === filter) && (!q || `${l.name} ${l.message} ${l.email} ${l.phone}`.toLowerCase().includes(q.toLowerCase()))), [data, filter, q]);
  if (loading) return <LoadingBlock rows={5} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const count = (s: Lead['status']) => data.filter((l) => l.status === s).length;
  const setStatus = async (l: Lead, status: Lead['status']) => {
    try { const u = await api.setLeadStatus(l.id, status); set(data.map((x) => (x.id === u.id ? u : x))); setOpen(u); toast(`${l.name} marked as ${STATUS[status].t.toLowerCase()}.`); }
    catch (e) { toast((e as Error).message, 'bad'); }
  };
  const wa = (p: string) => `https://wa.me/${p.replace(/[^0-9]/g, '').replace(/^0/, '234')}`;

  return (
    <div className="enter">
      <HubHeader title="Customers" lead="Every enquiry and customer, in one list." />
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="lg:flex-1"><Segmented label="Show" value={filter} onChange={setFilter} options={[{ v: 'all', l: `All ${data.length}` }, { v: 'new', l: `New ${count('new')}` }, { v: 'contacted', l: `Contacted ${count('contacted')}` }, { v: 'won', l: `Customers ${count('won')}` }, { v: 'lost', l: 'Not now' }]} /></div>
        <div className="relative lg:w-[300px]"><Search size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-faint" aria-hidden="true" /><label htmlFor="cq" className="sr-only">Search customers</label><input id="cq" className="input pl-10" placeholder="Search names or messages" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>

      {!data.length ? <div className="mt-6"><EmptyState icon={Users} title="No enquiries yet" text="When someone uses the form on your website, they appear here straight away." /></div>
        : !list.length ? <p className="mt-8 text-center text-small text-muted">No one matches. Try another filter or search.</p> : (
          <ul className="mt-5 grid gap-3 lg:grid-cols-2 grid-cols-1">
            {list.map((l) => (
              <li key={l.id}>
                <button onClick={() => setOpen(l)} className="flex w-full items-start gap-3.5 rounded-[18px] border border-line bg-raised p-4 text-left transition-colors hover:bg-surface">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/10 text-[16px] font-bold text-accent-ink" aria-hidden="true">{l.name.slice(0, 1)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2"><span className="truncate text-[16px] font-semibold">{l.name}</span><Badge tone={STATUS[l.status].tone}>{STATUS[l.status].t}</Badge></span>
                    <span className="mt-1 line-clamp-2 block text-small text-muted">{l.message}</span>
                    <span className="mt-1.5 block text-caption text-faint">{l.source} · {fmtAgo(l.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

      <Dialog open={!!open} onClose={() => setOpen(null)} title={open?.name || ''}>
        {open && (<>
          <p className="text-caption text-muted">{open.source} · {fmtDate(open.createdAt)}</p>
          <p className="mt-3 rounded-field bg-surface p-4 text-[15px] leading-relaxed">{open.message}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <a className="btn-secondary btn-sm" href={`tel:${open.phone.replace(/\s/g, '')}`} aria-disabled={!open.phone}><Phone size={16} aria-hidden="true" />Call</a>
            <a className="btn-secondary btn-sm" href={wa(open.phone)} target="_blank" rel="noreferrer"><MessageCircle size={16} aria-hidden="true" />WhatsApp</a>
            <a className="btn-secondary btn-sm" href={`mailto:${open.email}`}><Mail size={16} aria-hidden="true" />Email</a>
          </div>
          <fieldset className="mt-6"><legend className="field-label">Status</legend>
            <div className="flex flex-wrap gap-2">{(Object.keys(STATUS) as Lead['status'][]).map((s) => <button key={s} className="chip" aria-pressed={open.status === s} onClick={() => setStatus(open, s)}>{STATUS[s].t}</button>)}</div>
          </fieldset>
        </>)}
      </Dialog>
    </div>
  );
}
