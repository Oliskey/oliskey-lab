import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Compass, ExternalLink, LayoutTemplate, Smartphone } from 'lucide-react';
import { useApp } from '../app/context';
import { ActionButton, Badge, EmptyState, ErrorState, LoadingBlock, PageHeader, Section, fmtAgo, useLoad, useToast } from '../components/ui';
import type { Site } from '../../shared/types';

const STATUS: Record<Site['status'], { t: string; tone: 'good' | 'warn' | 'neutral' }> = { published: { t: 'Live', tone: 'good' }, awaiting_approval: { t: 'Waiting for approval', tone: 'warn' }, draft: { t: 'Draft', tone: 'neutral' } };

export default function Studio() {
  const { api } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useLoad(async () => ({ sites: await api.sites(), discovery: await api.discovery(), strategy: await api.strategy() }), [api]);
  const create = async () => {
    setBusy(true);
    try { const s = await api.createSite(); toast('Your website is ready to review.'); nav(`/app/studio/${s.id}`); }
    catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(false); }
  };
  if (loading) return <LoadingBlock rows={3} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const { sites, discovery, strategy } = data;
  const base = api.demo ? `${import.meta.env.BASE_URL}s/` : '/s/';
  const app = strategy?.products.filter((p) => p.kind !== 'website');

  return (
    <div className="enter">
      <PageHeader title="Website and App Studio" lead="Create your website from your Discovery answers, edit it, preview it on any device and publish when you approve." action={discovery.completedAt && <ActionButton busy={busy} onClick={create}>{busy ? 'Building your website…' : sites.length ? 'Create another website' : 'Create my website'}</ActionButton>} />

      {!discovery.completedAt ? (
        <div className="mt-8"><EmptyState icon={Compass} title="Start with Business Discovery" text="Lab builds your website from what you tell it about your business. It takes about five minutes." action={<Link to="/app/discovery" className="btn-primary">Start Discovery<ArrowRight size={18} aria-hidden="true" /></Link>} /></div>
      ) : !sites.length ? (
        <div className="mt-8"><EmptyState icon={LayoutTemplate} title="No website yet" text="Lab will create a complete first version — pages, text and an enquiry form — from your answers. Nothing is published until you approve it." action={<ActionButton busy={busy} onClick={create}>{busy ? 'Building your website…' : 'Create my website'}</ActionButton>} /></div>
      ) : (
        <Section title="Your websites">
          <ul className="grid gap-4 md:grid-cols-2 grid-cols-1">
            {sites.map((s) => (
              <li key={s.id} className="panel flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><h3 className="truncate text-card">{s.name}</h3><p className="mt-0.5 truncate text-caption text-muted">lab.oliskey.com/s/{s.slug}</p></div>
                  <Badge tone={STATUS[s.status].tone}>{STATUS[s.status].t}</Badge>
                </div>
                <p className="mt-3 text-caption text-muted">Updated {fmtAgo(s.updatedAt)}</p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to={`/app/studio/${s.id}`} className="btn-primary btn-sm">Edit and preview</Link>
                  {s.liveVersionId && <a href={`${base}${s.slug}`} target="_blank" rel="noreferrer" className="btn-secondary btn-sm">View live<ExternalLink size={15} aria-hidden="true" /></a>}
                </div>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {app && (
        <Section title="Apps" lead="From your plan. Lab only builds a store app when it is worth the cost.">
          <ul className="panel divide-y divide-line">
            {app.map((p) => (
              <li key={p.kind} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3"><Smartphone size={20} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
                  <div><p className="text-[15px] font-semibold">{{ pwa: 'Installable web app', android: 'Android app', ios: 'iPhone app' }[p.kind as 'pwa']}</p><p className="text-small text-muted">{p.why}</p></div></div>
                <div className="shrink-0 sm:pl-4">
                  <Badge tone={p.verdict === 'recommended' ? 'good' : p.verdict === 'optional' ? 'accent' : 'neutral'}>{p.verdict === 'recommended' ? 'Recommended' : p.verdict === 'optional' ? 'Optional' : 'Not yet'}</Badge>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-caption text-muted">Store apps are published in your own Google Play and Apple accounts. An app is only “published” once the store has approved and released it.</p>
        </Section>
      )}
    </div>
  );
}
