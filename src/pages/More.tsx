
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Headphones, LogOut, Moon, Sun } from 'lucide-react';
import { useApp } from '../app/context';
import { useTheme } from '../app/Shell';
import { NAV } from '../app/nav';
import { HubHeader } from '../components/blocks';
import { Duo, IconBadge, type Hue } from '../components/icons';

const HUE: Record<string, Hue> = { '/app/digitise': 'violet', '/app/automation': 'violet', '/app/coach': 'teal', '/app/integrations': 'violet', '/app/billing': 'blue', '/app/marketing': 'rose', '/app/social': 'rose', '/app/insights': 'blue', '/app/improve': 'amber', '/app/discovery': 'teal', '/app/admin': 'green' };

/** All features: every area as a tile (the owner's design), then support, appearance and sign out. */
export default function More() {
  const { api, leaveDemo, refresh } = useApp();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const signOut = async () => { if (api.demo) { leaveDemo(); nav('/'); return; } await api.signOut(); await refresh(); nav('/sign-in'); };
  const tiles = NAV.filter((n) => n.to !== '/app/admin' || api.demo);
  return (
    <div className="enter">
      <HubHeader title="All Features" lead="Everything you need to run and grow your business." />
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map((n) => (
          <li key={n.to}>
            <Link to={n.to} className="card flex h-full min-h-[124px] flex-col p-4 transition-transform duration-150 hover:-translate-y-0.5 sm:p-5">
              <Duo icon={n.icon} size={32} hue={HUE[n.to] || 'blue'} />
              <span className="mt-3 text-[16px] font-bold leading-snug text-ink">{n.short}</span>
              <span className="mt-0.5 text-[13px] leading-snug text-muted">{n.desc}</span>
            </Link>
          </li>
        ))}
      </ul>
      <a href="https://wa.me/2349049417103" target="_blank" rel="noreferrer" className="card mt-6 flex items-center gap-4 p-5 transition-transform hover:-translate-y-px" style={{ backgroundImage: 'linear-gradient(120deg, rgb(var(--accent) / 0.10), rgb(var(--raised)) 70%)' }}>
        <IconBadge icon={Headphones} size="lg" />
        <span className="min-w-0 flex-1"><span className="block text-[17px] font-bold">Get Support</span><span className="block text-[14px] text-muted">Chat with our team on WhatsApp.</span></span>
        <ChevronRight size={20} className="text-faint" aria-hidden="true" />
      </a>
      <div className="mt-6 flex flex-wrap gap-2 xl:hidden">
        <button className="btn-secondary" onClick={toggle}>{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}{dark ? 'Light mode' : 'Dark mode'}</button>
        <button className="btn-quiet" onClick={signOut}><LogOut size={18} aria-hidden="true" />{api.demo ? 'Leave demo' : 'Sign out'}</button>
      </div>
    </div>
  );
}
