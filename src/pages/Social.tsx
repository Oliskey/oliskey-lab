import { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useApp } from '../app/context';
import { ActionButton, Badge, Dialog, ErrorState, LoadingBlock, PageHeader, useLoad, useToast } from '../components/ui';
import { PLATFORMS } from './Grow';
import { BrandTile } from '../components/icons';
import type { SocialAccount, SocialPlatform } from '../../shared/types';

const ASKS: Record<SocialPlatform, string[]> = {
  facebook: ['Read your Page’s posts, comments and results', 'Publish posts you approve'], instagram: ['Read your business account’s posts and results', 'Publish posts you approve', 'Read and reply to direct messages'],
  tiktok: ['Read your videos and results', 'Upload videos you approve'], youtube: ['Read your channel’s videos and results', 'Upload videos you approve'],
  linkedin: ['Read your company page results', 'Publish posts you approve'], whatsapp: ['Send and receive messages from your business number'], google: ['Read your Maps listing and reviews', 'Reply to reviews you approve'],
};

/** Social media accounts: connected through each platform's own sign-in, never with a password typed into Lab. */
export default function Social() {
  const { api } = useApp();
  const toast = useToast();
  const { data, error, loading, reload, set } = useLoad(() => api.social(), [api]);
  const [pick, setPick] = useState<SocialAccount | null>(null);
  const [busy, setBusy] = useState(false);
  if (loading) return <LoadingBlock rows={5} />;
  if (error || !data) return <ErrorState message={error || ''} onRetry={reload} />;
  const connect = async () => {
    if (!pick) return; setBusy(true);
    try { const a = await api.requestSocial(pick.platform); set(data.map((x) => (x.platform === a.platform ? a : x))); setPick(null); toast(`${PLATFORMS[a.platform].name} is waiting for the platform’s approval of Oliskey Lab.`); }
    catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(false); }
  };
  return (
    <div className="enter">
      <PageHeader title="Social media accounts" lead="Connect each account through the platform’s own sign-in. You choose what Lab may do, and you can disconnect at any time." />
      <ul className="mt-6 grid gap-3 md:grid-cols-2 grid-cols-1">
        {data.map((s) => { const P = PLATFORMS[s.platform]; return (
          <li key={s.platform} className="card flex items-center gap-4 p-4">
            <BrandTile platform={s.platform} size={48} muted={s.status !== 'connected'} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">{P.name}</p>
              <p className="truncate text-caption text-muted">{s.status === 'connected' ? `${s.handle}${s.followers ? ` · ${s.followers.toLocaleString()} followers` : ''}` : s.status === 'awaiting_platform_approval' ? 'Waiting for the platform to approve Oliskey Lab' : 'Not connected'}</p>
            </div>
            {s.status === 'connected' ? <Badge tone="good"><Check size={13} aria-hidden="true" />Connected</Badge>
              : s.status === 'awaiting_platform_approval' ? <Badge tone="warn">Pending</Badge>
                : <button className="btn-secondary btn-sm" onClick={() => setPick(s)}>Connect</button>}
          </li>
        ); })}
      </ul>
      {api.demo && <p className="mt-4 text-caption text-faint">Demo: follower numbers are sample data.</p>}

      <Dialog open={!!pick} onClose={() => setPick(null)} title={pick ? `Connect ${PLATFORMS[pick.platform].name}` : ''}
        footer={<><button className="btn-quiet" onClick={() => setPick(null)}>Cancel</button><ActionButton busy={busy} onClick={connect}>Continue to {pick ? PLATFORMS[pick.platform].name : ''}</ActionButton></>}>
        {pick && (<>
          <p className="text-body">You will sign in on {PLATFORMS[pick.platform].name}’s own page and choose your business account. Oliskey Lab will ask to:</p>
          <ul className="mt-3 space-y-2">{ASKS[pick.platform].map((a) => <li key={a} className="flex gap-2 text-small"><Check size={17} className="mt-0.5 shrink-0 text-good" aria-hidden="true" />{a}</li>)}</ul>
          <p className="mt-4 flex gap-2 rounded-field bg-surface p-3.5 text-caption text-muted"><Lock size={15} className="mt-0.5 shrink-0" aria-hidden="true" />Lab never sees your password, and nothing is posted without your approval.</p>
          <p className="mt-3 text-caption text-muted">Before live connections open, each platform reviews Oliskey Lab. Until then your request is saved and you are told the moment it can complete.</p>
        </>)}
      </Dialog>
    </div>
  );
}
