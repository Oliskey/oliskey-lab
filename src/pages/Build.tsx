import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Eye, Globe, Layers, Link2, MoreHorizontal, Pencil, PlusCircle, RefreshCw, ShieldCheck, Smartphone, Store } from 'lucide-react';
import { useApp } from '../app/context';
import { Badge, ErrorState, LoadingBlock, useLoad, useToast } from '../components/ui';
import { ActionTile, HubHeader, RowLink, Segmented } from '../components/blocks';
import { highestLevel } from './Control';
import { Dashboards } from '../components/BlueprintView';

/** The live website shown on a laptop and a phone: real pages in small frames, so owners recognise their own site. */
const Devices: React.FC<{ src: string | null }> = ({ src }) => (
  <div className="relative h-[220px] overflow-hidden rounded-[22px] border border-line bg-[linear-gradient(160deg,rgb(var(--surface)),rgb(var(--accent)/0.12))] sm:h-[260px]" aria-hidden="true">
    {src ? (<>
      <div className="absolute left-[8%] top-[14%] h-[66%] w-[68%] rounded-t-[14px] bg-navy p-[6px] shadow-xl">
        <div className="h-full w-full overflow-hidden rounded-[8px] bg-white"><iframe src={src} title="" tabIndex={-1} className="pointer-events-none origin-top-left border-0" style={{ width: 1280, height: 800, transform: 'scale(var(--k))', ['--k' as string]: '0.3' }} /></div>
      </div>
      <div className="absolute bottom-[12%] left-[4%] h-[5%] w-[76%] rounded-b-[10px] bg-[#c9d2e3]" />
      <div className="absolute bottom-[6%] right-[8%] h-[78%] w-[26%] rounded-[20px] bg-navy p-[5px] shadow-xl">
        <div className="h-full w-full overflow-hidden rounded-[15px] bg-white"><iframe src={src} title="" tabIndex={-1} className="pointer-events-none origin-top-left border-0" style={{ width: 390, height: 844, transform: 'scale(0.4)' }} /></div>
      </div>
    </>) : (
      <div className="grid h-full place-items-center text-muted"><Globe size={48} strokeWidth={1.4} /></div>
    )}
  </div>
);

export default function Build() {
  const { api } = useApp();
  const toast = useToast();
  const [tab, setTab] = useState<'website' | 'app' | 'domain'>('website');
  const [busy, setBusy] = useState(false);
  const { data, error, loading, reload } = useLoad(async () => ({ sites: await api.sites(), products: await api.products(), strategy: await api.strategy() }), [api]);
  if (loading) return <LoadingBlock rows={5} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const { sites, products, strategy } = data;
  const site = sites.find((s) => s.liveVersionId) || sites[0];
  const product = site ? products.find((p) => p.url.endsWith(`/s/${site.slug}`)) : products[0];
  const base = import.meta.env.BASE_URL;
  const live = site?.liveVersionId ? `${base}s/${site.slug}` : null;
  const inspect = async () => { if (!product) return; setBusy(true); try { const r = await api.inspect(product.id); toast(`Checked: health ${r.score}/100.`); } catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(false); } };

  return (
    <div className="enter">
      <HubHeader title="Build & Manage" lead="Your website, app and digital assets." />
      <div className="mt-5"><Segmented label="What to manage" value={tab} onChange={setTab} options={[{ v: 'website', l: 'Website' }, { v: 'app', l: 'App' }, { v: 'domain', l: 'Domain' }]} /></div>

      {tab === 'website' && (
        <div className="enter mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="min-w-0">
            <Devices src={live} />
            <div className="mt-4 flex items-center gap-3">
              {site ? (<>
                <span className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-good"><span className="h-2.5 w-2.5 rounded-full bg-good" aria-hidden="true" />{site.liveVersionId ? 'Live' : 'Draft'}</span>
                <span className="min-w-0 flex-1 truncate text-[16px] font-semibold">lab.oliskey.com/s/{site.slug}</span>
                {live && <a href={live} target="_blank" rel="noreferrer" className="icon-btn" aria-label="Open the live website"><ExternalLink size={19} /></a>}
              </>) : <p className="text-small text-muted">No website yet. Create one below — it takes a minute.</p>}
            </div>
            {site && (
              <div className="mt-4 grid grid-cols-4 gap-2.5">
                <ActionTile to={`/app/studio/${site.id}`} icon={Pencil} label="Edit" />
                <ActionTile href={live || `${base}preview/${site.id}/${site.draftVersionId}`} icon={Eye} label="Preview" />
                <ActionTile onClick={inspect} busy={busy} icon={RefreshCw} label="Check" />
                <ActionTile to="/app/studio" icon={MoreHorizontal} label="More" />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <RowLink to="/app/studio" icon={PlusCircle} title="Create New Website" text="Built from your business answers" />
            <RowLink onClick={() => setTab('app')} icon={Smartphone} title="Create Mobile App" text="Installable app, Android or iPhone" />
            <RowLink to="/app/control" icon={Link2} title="Connect Existing Website" text="Inspect and improve what you have" />
            <RowLink to={site ? `/app/studio/${site.id}` : '/app/studio'} icon={Layers} title="Manage Content" text="Text, prices, photos and pages" />
            {product && <RowLink to={`/app/control/${product.id}`} icon={ShieldCheck} title="Health and access" text={product.health ? `Health ${product.health.score}/100 · ${highestLevel(product)?.name}` : 'Run your first check'} />}
          </div>
        </div>
      )}

      {tab === 'app' && (
        <div className="enter mt-5 space-y-3">
          {strategy?.blueprint && <div className="mb-6"><h2 className="text-[19px] font-bold">Your app: {strategy.blueprint.dashboards.length} dashboards</h2><div className="mt-2"><Dashboards b={strategy.blueprint} /></div></div>}
          <h2 className="text-[19px] font-bold">How to deliver it</h2>
          <p className="max-w-read text-[15px] text-muted">Most businesses start with an installable web app — it works on every phone with no store fees. Lab only recommends a store app when it pays for itself.</p>
          {(strategy?.products.filter((p) => p.kind !== 'website') || []).map((p) => (
            <div key={p.kind} className="rounded-[18px] border border-line bg-raised p-5">
              <div className="flex items-start justify-between gap-3">
                <p className="flex items-center gap-2 text-[16px] font-semibold">{p.kind === 'pwa' ? <Smartphone size={20} className="text-accent" aria-hidden="true" /> : <Store size={20} className="text-accent" aria-hidden="true" />}{{ pwa: 'Installable web app', android: 'Android app', ios: 'iPhone app' }[p.kind as 'pwa']}</p>
                <Badge tone={p.verdict === 'recommended' ? 'good' : p.verdict === 'optional' ? 'accent' : 'neutral'}>{p.verdict === 'recommended' ? 'Recommended' : p.verdict === 'optional' ? 'Optional' : 'Not yet'}</Badge>
              </div>
              <p className="mt-2 text-small">{p.why}</p>
              <p className="mt-2 text-caption text-muted"><span className="font-semibold text-ink">Cost:</span> {p.cost} · <span className="font-semibold text-ink">Time:</span> {p.time}</p>
            </div>
          ))}
          {!strategy && <RowLink to="/app/discovery" icon={Smartphone} title="Find out which app you need" text="Answer a few questions first" />}
          <p className="text-caption text-muted">Store apps are published in your own Google Play and Apple accounts; an app counts as published only once the store releases it.</p>
        </div>
      )}

      {tab === 'domain' && (
        <div className="enter mt-5 space-y-3">
          {products.length ? products.map((p) => (
            <RowLink key={p.id} to={`/app/control/${p.id}`} icon={Globe} title={p.url} text={p.domainVerifiedAt ? 'Ownership verified' : 'Ownership not verified yet'} badge={<Badge tone={p.domainVerifiedAt ? 'good' : 'warn'}>{p.domainVerifiedAt ? 'Verified' : 'Verify'}</Badge>} />
          )) : <p className="text-small text-muted">No addresses yet.</p>}
          <div className="rounded-[18px] border border-line bg-raised p-5">
            <p className="text-[16px] font-semibold">Use your own domain</p>
            <p className="mt-1 text-small text-muted">Buy a domain (about ₦15,000–₦25,000 a year) from any registrar in your own name, connect it in the Control Centre and verify ownership. Lab never holds your domain.</p>
            <Link to="/app/control" className="btn-secondary btn-sm mt-4">Connect a domain</Link>
          </div>
        </div>
      )}
    </div>
  );
}
