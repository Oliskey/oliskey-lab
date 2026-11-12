import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUp, BarChart3, CalendarDays, Facebook, Instagram, Linkedin, MapPin, Megaphone, MessageCircle, Music2, PlayCircle, Plus, Target, Youtube } from 'lucide-react';
import { useApp } from '../app/context';
import { Badge, ErrorState, LoadingBlock, useLoad } from '../components/ui';
import { HubHeader, PlanCard, RowLink, Segmented } from '../components/blocks';
import { SAMPLE } from '../lib/demoData';
import type { SocialPlatform } from '../../shared/types';

export const PLATFORMS: Record<SocialPlatform, { name: string; icon: React.ElementType }> = {
  facebook: { name: 'Facebook', icon: Facebook }, instagram: { name: 'Instagram', icon: Instagram }, tiktok: { name: 'TikTok', icon: Music2 },
  youtube: { name: 'YouTube', icon: Youtube }, linkedin: { name: 'LinkedIn', icon: Linkedin }, whatsapp: { name: 'WhatsApp Business', icon: MessageCircle }, google: { name: 'Google Business Profile', icon: MapPin },
};

const Spark: React.FC<{ data: number[] }> = ({ data }) => {
  const w = 300, h = 70, max = Math.max(...data), min = Math.min(...data);
  const pts = data.map((v, i) => [(i / (data.length - 1)) * w, h - 6 - ((v - min) / Math.max(1, max - min)) * (h - 14)]);
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-[70px] w-full" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="sg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="rgb(31 107 255)" stopOpacity="0.28" /><stop offset="1" stopColor="rgb(31 107 255)" stopOpacity="0" /></linearGradient></defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill="url(#sg)" /><path d={d} fill="none" stroke="rgb(31 107 255)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
};

/** Grow: social media, adverts, content and campaigns in one place (the owner's "Grow Your Customers" design). */
export default function Grow() {
  const { api } = useApp();
  const [tab, setTab] = useState<'social' | 'ads' | 'content' | 'campaigns'>('social');
  const { data, error, loading, reload } = useLoad(() => api.social(), [api]);
  if (loading) return <LoadingBlock rows={5} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const connected = data.filter((s) => s.status === 'connected');
  const reach = connected.reduce((a, s) => a + (s.reach || 0), 0);
  const sample = api.demo;

  return (
    <div className="enter">
      <HubHeader title="Grow Your Customers" lead="Marketing, social media and ads in one place." />
      <div className="mt-5"><Segmented label="Grow" value={tab} onChange={setTab} options={[{ v: 'social', l: 'Social' }, { v: 'ads', l: 'Ads' }, { v: 'content', l: 'Content' }, { v: 'campaigns', l: 'Campaigns' }]} /></div>

      {tab === 'social' && (
        <div className="enter mt-5 grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <ul className="flex flex-wrap gap-3" aria-label="Social accounts">
              {data.map((s) => { const P = PLATFORMS[s.platform]; const on = s.status === 'connected'; return (
                <li key={s.platform}><Link to="/app/social" className={`relative grid h-14 w-14 place-items-center rounded-[16px] border transition-transform hover:-translate-y-0.5 ${on ? 'border-accent/30 bg-accent text-white shadow-[0_8px_18px_-10px_rgba(31,107,255,0.8)]' : 'border-line bg-raised text-muted'}`} aria-label={`${P.name}: ${on ? 'connected' : s.status === 'awaiting_platform_approval' ? 'awaiting approval' : 'not connected'}`}>
                  <P.icon size={26} aria-hidden="true" />{s.status === 'awaiting_platform_approval' && <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-page bg-warn" aria-hidden="true" />}
                </Link></li>
              ); })}
              <li><Link to="/app/social" className="grid h-14 w-14 place-items-center rounded-[16px] border border-dashed border-line bg-raised text-ink" aria-label="Connect an account"><Plus size={26} aria-hidden="true" /></Link></li>
            </ul>
            <section className="rounded-[20px] border border-line bg-raised p-5 shadow-[0_8px_24px_-18px_rgb(var(--shadow)/0.35)]">
              <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-[17px] font-bold"><BarChart3 size={20} className="text-accent" aria-hidden="true" />Social Performance</h2>{sample && <span className="inline-flex items-center gap-0.5 text-[16px] font-bold text-good"><ArrowUp size={16} aria-hidden="true" />+{SAMPLE.reach.delta}%</span>}</div>
              {sample ? (<><p className="mt-2 text-[15px] text-muted">Reach <span className="tnum ml-1 text-[20px] font-bold text-ink">{SAMPLE.reach.total.toLocaleString()}</span></p><Spark data={SAMPLE.reach.weeks} /><p className="text-caption text-faint">Last 8 weeks · sample data</p></>)
                : <p className="mt-2 text-small text-muted">{connected.length ? `Reach this month: ${reach.toLocaleString()}` : 'Connect an account to see your reach, followers and best posts.'}</p>}
            </section>
          </div>
          <div className="space-y-3">
            <RowLink to="/app/marketing#calendar" icon={CalendarDays} title="Content Calendar" text="Plan, create and schedule posts" />
            <RowLink to="/app/marketing#content" icon={PlayCircle} title="Create Content" text="Images, videos and captions" />
            <RowLink to="/app/marketing#campaigns" icon={Megaphone} title="Run Ad Campaign" text="Reach more of the right customers" />
            <PlanCard to="/app/discovery" icon={Target} title="Growth Plan" text="This week’s marketing actions, made for your business." />
          </div>
        </div>
      )}

      {tab === 'ads' && (
        <div className="enter mt-5 space-y-3">
          {sample ? SAMPLE.campaigns.map((c) => (
            <div key={c.name} className="rounded-[18px] border border-line bg-raised p-5">
              <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="text-[16px] font-semibold">{c.name}</p><p className="text-caption text-muted">{c.channel}</p></div><Badge tone={c.status === 'Running' ? 'good' : c.status === 'Finished' ? 'neutral' : 'warn'}>{c.status}</Badge></div>
              <dl className="tnum mt-4 grid grid-cols-3 gap-3 text-small"><div><dt className="text-caption text-muted">Spent</dt><dd className="font-semibold">₦{c.spent.toLocaleString()} <span className="font-normal text-faint">of ₦{c.budget.toLocaleString()}</span></dd></div><div><dt className="text-caption text-muted">Enquiries</dt><dd className="font-semibold">{c.leads}</dd></div><div><dt className="text-caption text-muted">Cost each</dt><dd className="font-semibold">{c.cost ? `₦${c.cost.toLocaleString()}` : '—'}</dd></div></dl>
            </div>
          )) : <Soon what="Ads" text="Plan an advert, approve the budget, and see what each enquiry cost — across Instagram, Facebook and Google." />}
          {sample && <p className="text-caption text-faint">Sample data. Every advert needs your approval and its budget before it runs.</p>}
        </div>
      )}

      {tab === 'content' && (
        <div className="enter mt-5 grid gap-6 lg:grid-cols-2">
          {sample ? (<>
            <section><h2 className="text-[17px] font-bold">This week</h2><ul className="mt-3 space-y-2">{SAMPLE.posts.map((p) => <li key={p.title} className="flex items-center gap-3 rounded-[16px] border border-line bg-raised px-4 py-3"><span className="w-12 shrink-0 text-center"><span className="block text-[13px] font-bold">{p.day}</span><span className="block text-caption text-muted">{p.time}</span></span><span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{p.title}</span><span className="block text-caption text-muted">{p.platform}</span></span><Badge tone={p.status === 'Scheduled' ? 'good' : p.status === 'Draft' ? 'accent' : 'neutral'}>{p.status}</Badge></li>)}</ul></section>
            <section><h2 className="text-[17px] font-bold">Ideas from your customers</h2><ul className="mt-3 space-y-2">{SAMPLE.ideas.map((i) => <li key={i.title} className="rounded-[16px] border border-line bg-raised px-4 py-3"><p className="text-[15px] font-semibold">{i.title}</p><p className="text-caption text-muted">{i.why}</p></li>)}</ul></section>
          </>) : <Soon what="Content" text="A calendar for every account, with post ideas drawn from your real customer questions." />}
        </div>
      )}

      {tab === 'campaigns' && (
        <div className="enter mt-5">
          {sample ? <ul className="space-y-3">{SAMPLE.campaigns.map((c) => <RowLink key={c.name} to="/app/marketing" icon={Megaphone} title={c.name} text={`${c.leads} enquiries · ${c.channel}`} badge={<Badge tone={c.status === 'Running' ? 'good' : c.status === 'Finished' ? 'neutral' : 'warn'}>{c.status}</Badge>} />)}</ul>
            : <Soon what="Campaigns" text="Group posts, adverts and offers into one campaign with one goal and one result." />}
        </div>
      )}
    </div>
  );
}

export const Soon: React.FC<{ what: string; text: string }> = ({ what, text }) => (
  <div className="rounded-[20px] border border-line bg-raised p-6">
    <Badge tone="accent">Coming next</Badge>
    <p className="mt-3 text-[17px] font-semibold">{what} arrives in the next release</p>
    <p className="mt-1 max-w-read text-small text-muted">{text} You can see it working now in the demo.</p>
  </div>
);
