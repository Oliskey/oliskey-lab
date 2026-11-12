import { useMemo, useState } from 'react';
import { History, ShieldCheck } from 'lucide-react';
import { useApp } from '../app/context';
import { ErrorState, LoadingBlock, PageHeader, Section, fmtDate, useLoad } from '../components/ui';
import { PERMS } from './Product';

/** Settings and access: the business, who can do what on each product, and the full history of what happened. */
export default function Access() {
  const { api, session } = useApp();
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useLoad(async () => ({ grants: await api.grants(), products: await api.products(), audit: await api.audit() }), [api]);
  const audit = useMemo(() => (data?.audit || []).filter((a) => !q || `${a.action} ${a.target} ${a.actor}`.toLowerCase().includes(q.toLowerCase())), [data, q]);
  if (loading) return <LoadingBlock rows={5} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const active = data.grants.filter((g) => !g.revokedAt);
  return (
    <div className="enter">
      <PageHeader title="Settings and access" lead="Your business, what Oliskey Lab may do, and everything that has happened." />
      <Section title="Business">
        <dl className="panel grid gap-4 p-5 sm:grid-cols-3">
          <div><dt className="text-caption text-muted">Business</dt><dd className="mt-0.5 text-[15px] font-semibold">{session?.org?.name}</dd></div>
          <div><dt className="text-caption text-muted">You</dt><dd className="mt-0.5 text-[15px] font-semibold">{session?.user.name} <span className="font-normal text-muted">· {session?.role}</span></dd></div>
          <div><dt className="text-caption text-muted">Sign-in email</dt><dd className="mt-0.5 truncate text-[15px] font-semibold">{session?.user.email}</dd></div>
        </dl>
      </Section>
      <Section title="Access granted" lead="Change or revoke on each product’s page in the Control Centre.">
        {active.length ? (
          <ul className="panel divide-y divide-line">
            {active.map((g) => (
              <li key={g.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <ShieldCheck size={18} className="shrink-0 text-good" aria-hidden="true" />
                <p className="min-w-0 flex-1 text-small"><span className="font-semibold">{PERMS.find((p) => p.id === g.permission)?.name || g.permission}</span> · {data.products.find((p) => p.id === g.productId)?.name || 'Removed product'}</p>
                <p className="text-caption text-muted">by {g.grantedBy} · {fmtDate(g.grantedAt)}</p>
              </li>
            ))}
          </ul>
        ) : <p className="panel px-5 py-5 text-small text-muted">Nothing granted. Lab can only inspect public pages.</p>}
      </Section>
      <Section title="History" lead="Every important action, kept permanently. It cannot be edited or deleted." action={<div className="w-[220px]"><label htmlFor="hq" className="sr-only">Search history</label><input id="hq" className="input !min-h-[40px]" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} /></div>}>
        <ol className="panel divide-y divide-line">
          {audit.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3.5">
              <History size={16} className="mt-0.5 shrink-0 text-faint" aria-hidden="true" />
              <div className="min-w-0 flex-1"><p className="text-small"><span className="font-semibold">{a.action}</span> · {a.target}</p>{a.detail && <p className="text-caption text-muted">{a.detail}</p>}</div>
              <p className="shrink-0 text-caption text-muted">{a.actor}<br className="sm:hidden" /><span className="hidden sm:inline"> · </span>{fmtDate(a.at)}</p>
            </li>
          ))}
          {!audit.length && <li className="px-5 py-5 text-small text-muted">Nothing found.</li>}
        </ol>
      </Section>
    </div>
  );
}
