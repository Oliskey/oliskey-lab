import { Link } from 'react-router-dom';
import { Workflow } from 'lucide-react';
import { useApp } from '../app/context';
import { EmptyState, ErrorState, LoadingBlock, useLoad, useToast } from '../components/ui';
import { HubHeader } from '../components/blocks';
import { Automations } from '../components/BlueprintView';
import { SAMPLE } from '../lib/demoData';
import { Badge } from '../components/ui';

/** Automation: the jobs this business can hand over, worked out from its own answers, with the steps to set each up. */
export default function Automation() {
  const { api } = useApp();
  const toast = useToast();
  const { data, error, loading, reload } = useLoad(() => api.strategy(), [api]);
  if (loading) return <LoadingBlock rows={4} />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const b = data?.blueprint;
  return (
    <div className="enter">
      <HubHeader title="Automation" lead="Routine work that can run by itself — what it is, what it needs and how to set it up." />
      {!b ? (
        <div className="mt-8"><EmptyState icon={Workflow} title="Tell Lab about your business first" text="Lab finds what you can automate from what takes your time." action={<Link to="/app/discovery" className="btn-primary">Start Business Discovery</Link>} /></div>
      ) : (<>
        {api.demo && (
          <section className="mt-6">
            <h2 className="text-[19px] font-bold">Running now</h2>
            <ul className="mt-3 grid gap-3 md:grid-cols-3">
              {SAMPLE.automations.map((a) => <li key={a.name} className="card p-4"><div className="flex items-start justify-between gap-2"><p className="text-[15px] font-semibold">{a.name}</p><Badge tone={a.on ? 'good' : 'neutral'}>{a.on ? 'On' : 'Off'}</Badge></div><p className="tnum mt-2 text-caption text-muted">Ran {a.runs} times · sample data</p></li>)}
            </ul>
          </section>
        )}
        <section className="mt-8">
          <h2 className="text-[19px] font-bold">{b.automations.length} jobs you can automate</h2>
          <p className="mt-1 text-small text-muted">Ordered by how much time they save you. Nothing runs until you approve it.</p>
          <div className="mt-4"><Automations b={b} onRequest={async (a) => { try { await api.requestAutomation(a.id, a.title); toast('Request sent. We will set it up with you.'); } catch (e) { toast((e as Error).message, 'bad'); throw e; } }} /></div>
        </section>
      </>)}
    </div>
  );
}
