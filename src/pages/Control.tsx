import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Globe, MonitorSmartphone, Plus, Smartphone } from 'lucide-react';
import { useApp } from '../app/context';
import { ActionButton, Badge, Dialog, EmptyState, ErrorState, Field, LoadingBlock, PageHeader, Section, fmtAgo, useLoad, useToast } from '../components/ui';
import { ACCESS_LEVELS, type DigitalProduct } from '../../shared/types';

export const highestLevel = (p: DigitalProduct) => ACCESS_LEVELS.filter((l) => p.levels.includes(l.id)).slice(-1)[0];
const TYPE: Record<DigitalProduct['type'], string> = { website: 'Website', pwa: 'Installable web app', android: 'Android app', ios: 'iPhone app' };
const scoreTone = (s: number): 'good' | 'warn' | 'bad' => (s >= 85 ? 'good' : s >= 65 ? 'warn' : 'bad');

export default function Control() {
  const { api } = useApp();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.products(), [api]);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ type: 'website' as DigitalProduct['type'], name: '', url: '' });
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);

  const connect = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('');
    if (!f.url.trim()) { setErr('Enter the address, such as mybusiness.com.'); return; }
    setBusy(true);
    try { await api.connectProduct(f); setOpen(false); setF({ type: 'website', name: '', url: '' }); toast('Connected for public inspection.'); reload(); }
    catch (x) { setErr((x as Error).message); } finally { setBusy(false); }
  };

  if (loading) return <LoadingBlock rows={3} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const built = data.filter((p) => p.origin === 'built'); const connected = data.filter((p) => p.origin === 'connected');

  const List: React.FC<{ items: DigitalProduct[] }> = ({ items }) => (
    <ul className="panel divide-y divide-line">
      {items.map((p) => { const lvl = highestLevel(p); return (
        <li key={p.id}>
          <Link to={`/app/control/${p.id}`} className="flex flex-col gap-3 px-5 py-4 hover:bg-surface sm:flex-row sm:items-center">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent-ink">{p.type === 'website' || p.type === 'pwa' ? <Globe size={19} aria-hidden="true" /> : <Smartphone size={19} aria-hidden="true" />}</span>
            <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-semibold">{p.name}</p><p className="truncate text-caption text-muted">{TYPE[p.type]} · {p.url}</p></div>
            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <Badge tone="accent">{lvl?.name}</Badge>
              {p.health ? <Badge tone={scoreTone(p.health.score)}>Health {p.health.score}/100 · {fmtAgo(p.health.checkedAt)}</Badge> : <Badge>Not checked yet</Badge>}
              <ArrowRight size={16} className="hidden text-faint sm:block" aria-hidden="true" />
            </div>
          </Link>
        </li>
      ); })}
    </ul>
  );

  return (
    <div className="enter">
      <PageHeader title="Digital Control Centre" lead="Every website and app your business has, what Lab is allowed to do with each, and how healthy they are." action={<button className="btn-primary" onClick={() => setOpen(true)}><Plus size={18} aria-hidden="true" />Connect a website or app</button>} />
      {!data.length ? (
        <div className="mt-8"><EmptyState icon={MonitorSmartphone} title="Nothing connected yet" text="Connect a website you already have, or create one in the Studio. Either way, everything you own appears here." action={<div className="flex flex-wrap justify-center gap-2"><button className="btn-primary" onClick={() => setOpen(true)}>Connect a website</button><Link className="btn-secondary" to="/app/studio">Open the Studio</Link></div>} /></div>
      ) : (<>
        {!!built.length && <Section title="Built with Oliskey Lab"><List items={built} /></Section>}
        {!!connected.length && <Section title="Connected"><List items={connected} /></Section>}
      </>)}

      <Dialog open={open} onClose={() => setOpen(false)} title="Connect a website or app">
        <form id="connect" onSubmit={connect} className="space-y-4" noValidate>
          <fieldset><legend className="field-label">What is it?</legend>
            <div className="flex flex-wrap gap-2">{(Object.keys(TYPE) as DigitalProduct['type'][]).map((t) => <button type="button" key={t} className="chip" aria-pressed={f.type === t} onClick={() => setF({ ...f, type: t })}>{TYPE[t]}</button>)}</div>
          </fieldset>
          <Field id="c-url" label={f.type === 'website' || f.type === 'pwa' ? 'Website address' : 'Store link or website address'} error={err}><input className="input" inputMode="url" placeholder="mybusiness.com" value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} /></Field>
          <Field id="c-name" label="Name" help="Optional. How it should appear in Lab."><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div className="rounded-field bg-surface p-4 text-small">
            <p className="font-semibold">What connecting allows</p>
            <p className="mt-1 text-muted">Only a public inspection: Lab reads the public pages and reports what to improve. An address alone gives no control — editing, publishing or code access each need you to grant them separately.</p>
          </div>
          <div className="flex justify-end gap-2"><button type="button" className="btn-quiet" onClick={() => setOpen(false)}>Cancel</button><ActionButton busy={busy} type="submit">Connect</ActionButton></div>
        </form>
      </Dialog>
    </div>
  );
}
