import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, Copy, ShieldCheck, XCircle } from 'lucide-react';
import { useApp } from '../app/context';
import { ActionButton, Badge, Dialog, ErrorState, LoadingBlock, Section, fmtDate, useToast } from '../components/ui';
import { ACCESS_LEVELS, type DigitalProduct, type Grant, type InspectionReport, type Permission } from '../../shared/types';

const AREAS: Record<InspectionReport['checks'][number]['area'], string> = { conversion: 'Winning customers', trust: 'Trust', speed: 'Speed', search: 'Search', access: 'Phones and accessibility' };
export const PERMS: { id: Permission; name: string; text: string; needs: (typeof ACCESS_LEVELS)[number]['id'] }[] = [
  { id: 'view', name: 'View', text: 'See this product in Lab.', needs: 'public' },
  { id: 'analytics', name: 'Analytics', text: 'Read visits and conversions.', needs: 'analytics' },
  { id: 'content', name: 'Content editing', text: 'Change text, images and products.', needs: 'cms' },
  { id: 'publish', name: 'Publishing', text: 'Publish approved changes.', needs: 'hosting' },
  { id: 'repository', name: 'Repository', text: 'Prepare code changes for review.', needs: 'source' },
  { id: 'deploy', name: 'Deployments', text: 'Deploy approved changes and roll back.', needs: 'hosting' },
  { id: 'domain', name: 'Domain management', text: 'Change domain settings. Always asks you first.', needs: 'domain' },
  { id: 'release', name: 'App releases', text: 'Submit app updates to the stores.', needs: 'source' },
];

export default function Product() {
  const { productId } = useParams();
  const { api, session } = useApp();
  const nav = useNavigate();
  const toast = useToast();
  const [p, setP] = useState<DigitalProduct | null>(null);
  const [report, setReport] = useState<InspectionReport | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const owner = session?.role === 'owner' || session?.role === 'admin';

  const load = async () => {
    try {
      setError('');
      const [ps, r, g] = await Promise.all([api.products(), api.lastInspection(productId!), api.grants()]);
      const found = ps.find((x) => x.id === productId); if (!found) throw new Error('This product is not connected to your account.');
      setP(found); setReport(r); setGrants(g.filter((x) => x.productId === productId));
    } catch (e) { setError((e as Error).message); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [api, productId]);
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!p) return <LoadingBlock rows={4} />;

  const act = async (key: string, fn: () => Promise<unknown>, ok?: string) => { setBusy(key); try { await fn(); if (ok) toast(ok); await load(); } catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(null); } };
  const run = () => act('inspect', async () => setReport(await api.inspect(p.id)), 'Inspection finished.');
  const active = grants.filter((g) => !g.revokedAt);
  const failing = report?.checks.filter((c) => !c.ok) || [];
  const copy = (t: string) => navigator.clipboard?.writeText(t).then(() => toast('Copied.'));
  const host = p.url.replace(/^https?:\/\//, '').split('/')[0];

  return (
    <div className="enter">
      <Link to="/app/control" className="inline-flex items-center gap-1.5 text-small font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" />Control Centre</Link>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0"><h1 className="text-page">{p.name}</h1><p className="mt-1 truncate text-small text-muted">{p.url} · {p.origin === 'built' ? 'Built with Oliskey Lab' : 'Connected'}</p></div>
        <ActionButton busy={busy === 'inspect'} onClick={run}>{busy === 'inspect' ? 'Inspecting…' : report ? 'Inspect again' : 'Inspect now'}</ActionButton>
      </div>

      <Section title="Health" lead={report ? `Checked ${fmtDate(report.checkedAt)} · ${report.finalUrl}` : 'Lab reads the public page and reports what helps or hurts your business. It changes nothing.'}>
        {!report ? (
          <div className="panel px-5 py-8 text-center text-small text-muted">Not inspected yet. Choose “Inspect now”.</div>
        ) : (
          <div className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-6">
              <div><p className="text-caption text-muted">Score</p><p className={`tnum text-[44px] font-bold leading-none ${report.score >= 85 ? 'text-good' : report.score >= 65 ? 'text-warn' : 'text-bad'}`}>{report.score}<span className="text-[18px] text-faint">/100</span></p></div>
              <p className="max-w-md text-small">{failing.length ? `${failing.length} ${failing.length === 1 ? 'thing' : 'things'} to fix, most important first.` : 'Everything checked looks good.'}</p>
            </div>
            {api.demo && <p className="mt-4 rounded-field bg-surface px-3.5 py-2.5 text-caption text-muted">Demo: this is a sample report. In a real account, Lab reads the live website.</p>}
            {!!failing.length && <ul className="mt-6 space-y-3">{failing.map((c) => <li key={c.id} className="flex gap-3"><XCircle size={20} className="mt-0.5 shrink-0 text-bad" aria-hidden="true" /><div><p className="text-[15px] font-semibold">{c.title} <span className="font-normal text-faint">· {AREAS[c.area]}</span></p><p className="text-small text-muted">{c.detail}</p></div></li>)}</ul>}
            <details className="mt-6 border-t border-line pt-4"><summary className="cursor-pointer text-small font-semibold">All {report.checks.length} checks</summary>
              <ul className="mt-3 grid gap-2 sm:grid-cols-2 grid-cols-1">{report.checks.map((c) => <li key={c.id} className="flex gap-2 text-small">{c.ok ? <CheckCircle2 size={18} className="shrink-0 text-good" aria-label="Passed" /> : <XCircle size={18} className="shrink-0 text-bad" aria-label="Needs work" />}{c.title}</li>)}</ul>
            </details>
          </div>
        )}
      </Section>

      <Section title="Domain ownership" lead="Proves the business owns the address. Needed before Lab can manage anything beyond inspection.">
        <div className="panel p-5">
          {p.domainVerifiedAt ? (
            <p className="flex items-center gap-2 text-[15px]"><ShieldCheck size={20} className="text-good" aria-hidden="true" />Verified {fmtDate(p.domainVerifiedAt)}</p>
          ) : p.domainToken ? (
            <div>
              <p className="text-small">Add this TXT record where you manage your domain (your registrar or DNS provider), then check. It can take a few minutes to appear.</p>
              <dl className="mt-4 grid gap-3 text-small">
                <div><dt className="text-caption text-muted">Type</dt><dd className="font-semibold">TXT</dd></div>
                <div><dt className="text-caption text-muted">Name / host</dt><dd className="flex items-center gap-2 font-mono text-[13px]">_oliskey.{host}<button className="icon-btn h-9 w-9" onClick={() => copy(`_oliskey.${host}`)} aria-label="Copy name"><Copy size={15} /></button></dd></div>
                <div><dt className="text-caption text-muted">Value</dt><dd className="flex items-center gap-2 break-all font-mono text-[13px]">{p.domainToken}<button className="icon-btn h-9 w-9 shrink-0" onClick={() => copy(p.domainToken!)} aria-label="Copy value"><Copy size={15} /></button></dd></div>
              </dl>
              <ActionButton className="mt-5" kind="secondary" busy={busy === 'check'} onClick={() => act('check', async () => { const r = await api.checkDomain(p.id); toast(r.message, r.found ? 'good' : 'bad'); })}>Check now</ActionButton>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-small text-muted">Not verified.</p>{owner && <ActionButton kind="secondary" busy={busy === 'start'} onClick={() => act('start', () => api.startDomainCheck(p.id))}>Verify ownership</ActionButton>}</div>
          )}
        </div>
      </Section>

      <Section title="What Lab can do" lead="Access only grows when you grant it, and you can take it back at any time.">
        <ol className="panel divide-y divide-line">
          {ACCESS_LEVELS.map((l) => { const on = p.levels.includes(l.id); return (
            <li key={l.id} className="flex gap-3 px-5 py-3.5">
              <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full ${on ? 'bg-good/15 text-good' : 'bg-ink/[0.06] text-faint'}`}>{on ? <Check size={14} aria-hidden="true" /> : null}</span>
              <div className="min-w-0 flex-1"><p className={`text-[15px] font-semibold ${on ? '' : 'text-muted'}`}>{l.name}<span className="sr-only">{on ? ' — allowed' : ' — not allowed'}</span></p><p className="text-small text-muted">{l.allows}</p></div>
              {!on && l.id !== 'public' && l.id !== 'domain' && <Badge>Needs your approval</Badge>}
            </li>
          ); })}
        </ol>
        <p className="mt-3 text-caption text-muted">Content, code and hosting access are granted through the provider’s own sign-in (for example WordPress, GitHub or your host). Lab never asks for your passwords.</p>
      </Section>

      <Section title="Permissions granted">
        {active.length ? (
          <ul className="panel divide-y divide-line">
            {active.map((g) => { const def = PERMS.find((x) => x.id === g.permission); return (
              <li key={g.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div><p className="text-[15px] font-semibold">{def?.name || g.permission}</p><p className="text-caption text-muted">Granted by {g.grantedBy} · {fmtDate(g.grantedAt)}</p></div>
                {owner && <ActionButton kind="secondary" size="sm" busy={busy === g.id} onClick={() => act(g.id, () => api.revoke(g.id), 'Access taken back.')}>Revoke</ActionButton>}
              </li>
            ); })}
          </ul>
        ) : <div className="panel px-5 py-5 text-small text-muted">No permissions granted. Lab can only inspect public pages.</div>}
        {owner && <GrantForm p={p} active={active} onGrant={(perm) => act(`g-${perm}`, () => api.grant(p.id, perm), 'Permission granted.')} busy={busy} />}
      </Section>

      {owner && (
        <Section title="Disconnect">
          <div className="panel flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="max-w-lg text-small text-muted">Removes it from Lab and revokes every permission. {p.origin === 'built' ? 'A published website stays online until you unpublish it.' : 'Your website itself is not affected.'}</p>
            <button className="btn-danger" onClick={() => setConfirm(true)}>Disconnect</button>
          </div>
        </Section>
      )}
      <Dialog open={confirm} onClose={() => setConfirm(false)} title={`Disconnect ${p.name}?`} footer={<><button className="btn-quiet" onClick={() => setConfirm(false)}>Keep connected</button><ActionButton kind="danger" busy={busy === 'disc'} onClick={() => act('disc', async () => { await api.disconnectProduct(p.id); nav('/app/control'); }, 'Disconnected. All access revoked.')}>Disconnect and revoke access</ActionButton></>}>
        <p className="text-body">Lab will stop inspecting and managing it, and every permission is revoked. This is recorded in your history.</p>
      </Dialog>
    </div>
  );
}

const GrantForm: React.FC<{ p: DigitalProduct; active: Grant[]; onGrant: (p: Permission) => void; busy: string | null }> = ({ p, active, onGrant, busy }) => {
  const avail = PERMS.filter((x) => !active.some((g) => g.permission === x.id));
  if (!avail.length) return null;
  return (
    <div className="mt-4">
      <p className="field-label">Grant a permission</p>
      <ul className="grid gap-2 sm:grid-cols-2 grid-cols-1">
        {avail.map((x) => { const ok = p.levels.includes(x.needs); return (
          <li key={x.id} className="flex items-center justify-between gap-3 rounded-field border border-line bg-raised px-4 py-3">
            <div className="min-w-0"><p className="text-[14px] font-semibold">{x.name}</p><p className="text-caption text-muted">{ok ? x.text : `Needs ${ACCESS_LEVELS.find((l) => l.id === x.needs)?.name.toLowerCase()} first.`}</p></div>
            <ActionButton kind="secondary" size="sm" disabled={!ok} busy={busy === `g-${x.id}`} onClick={() => onGrant(x.id)}>Grant</ActionButton>
          </li>
        ); })}
      </ul>
    </div>
  );
};
