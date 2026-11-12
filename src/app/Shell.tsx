import React, { useEffect } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, RotateCcw, Sun } from 'lucide-react';
import { Logo, useToast } from '../components/ui';
import { HUBS, NAV, hubOf } from './nav';
import { DEMO_ONLY, getDemoApi, useApp } from './context';

export function useTheme() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('oliskey.lab.theme', d ? 'dark' : 'light'); } catch { /* ok */ } };
  return { dark, toggle };
}

/** Layout by screen:
 *  phones (< 768): content, then a five-tab bar at the bottom (Home, Build, Grow, Customers, More) — the owner's design;
 *  tablets (768–1279): the same five hubs as a slim rail on the left, so content gets the full height;
 *  computers (>= 1280): a sidebar with the hubs and every feature by group, so nothing is more than one click away. */
export const Shell: React.FC = () => {
  const { api, session, leaveDemo, refresh } = useApp();
  const { dark, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const toast = useToast();
  const hub = hubOf(loc.pathname);
  useEffect(() => { window.scrollTo(0, 0); }, [loc.pathname]);
  const signOut = async () => { if (api.demo) { leaveDemo(); nav('/'); return; } await api.signOut(); await refresh(); nav('/sign-in'); };
  const resetDemo = async () => { getDemoApi().reset(); await refresh(); toast('The demo is back to its starting point.'); nav('/app'); };
  const groups = ['Build and connect', 'Grow', 'Run', 'Account'] as const;

  return (
    <div className="min-h-screen bg-surface">
      {api.demo && (
        <div className="bg-navy text-white">
          <div className="flex min-h-[38px] items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-caption md:pl-[100px] xl:pl-[284px]">
            <p><span className="font-semibold">Demo</span><span className="hidden sm:inline"> · a sample business. Everything works; nothing leaves your browser.</span><span className="sm:hidden"> · sample business</span></p>
            <div className="flex items-center gap-1">
              <button onClick={resetDemo} className="inline-flex min-h-[32px] items-center gap-1.5 rounded-control px-3 font-semibold hover:bg-white/10"><RotateCcw size={14} aria-hidden="true" />Reset</button>
              {DEMO_ONLY ? <a href="/contact" className="inline-flex min-h-[32px] items-center rounded-control bg-white px-3 font-semibold text-navy">Talk to us</a>
                : <Link to="/sign-up" onClick={leaveDemo} className="inline-flex min-h-[32px] items-center rounded-control bg-white px-3 font-semibold text-navy">Create account</Link>}
            </div>
          </div>
        </div>
      )}

      {/* computers: sidebar */}
      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-[268px] flex-col border-r border-line bg-page xl:flex" style={{ top: api.demo ? 38 : 0 }}>
        <div className="flex h-16 shrink-0 items-center px-5"><Link to="/app" aria-label="Oliskey Lab home"><Logo /></Link></div>
        <nav aria-label="Oliskey Lab" className="flex-1 overflow-y-auto px-3 pb-6">
          <ul className="space-y-0.5">
            {HUBS.filter((h) => h.to !== '/app/more').map((h) => (
              <li key={h.to}><NavLink to={h.to} end={h.to === '/app'} className={() => `flex min-h-[42px] items-center gap-3 rounded-field px-3 text-[15px] font-semibold transition-colors ${hub === h.to ? 'bg-accent/10 text-accent-ink' : 'text-ink hover:bg-ink/5'}`}><h.icon size={19} aria-hidden="true" />{h.label}</NavLink></li>
            ))}
          </ul>
          {groups.map((g) => (
            <div key={g} className="mt-6">
              <p className="mb-1 px-3 text-caption font-semibold text-faint">{g}</p>
              <ul className="space-y-0.5">
                {NAV.filter((n) => n.group === g && n.to !== '/app/customers').map((n) => (
                  <li key={n.to}><NavLink to={n.to} className={({ isActive }) => `flex min-h-[38px] items-center gap-3 rounded-field px-3 text-[14px] font-medium transition-colors ${isActive ? 'bg-accent/10 text-accent-ink' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}><n.icon size={17} aria-hidden="true" />{n.short}</NavLink></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-3">
          <div className="flex items-center gap-3 px-2">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/12 text-[14px] font-bold text-accent-ink" aria-hidden="true">{session?.user.name.slice(0, 1)}</span>
            <div className="min-w-0"><p className="truncate text-small font-semibold">{session?.org?.name}</p><p className="truncate text-caption text-muted">{session?.user.name} · {session?.role}</p></div>
          </div>
          <div className="mt-2 flex gap-1">
            <button className="icon-btn" onClick={toggle} aria-label={dark ? 'Use light mode' : 'Use dark mode'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="btn-quiet btn-sm flex-1 justify-start" onClick={signOut}><LogOut size={16} aria-hidden="true" />{api.demo ? 'Leave demo' : 'Sign out'}</button>
          </div>
        </div>
      </aside>

      {/* tablets: rail */}
      <nav aria-label="Main" className="fixed bottom-0 left-0 z-30 hidden w-[84px] flex-col items-center gap-1 border-r border-line bg-page py-4 md:flex xl:hidden" style={{ top: api.demo ? 38 : 0 }}>
        <Link to="/app" aria-label="Oliskey Lab home" className="mb-4"><Logo className="h-8" label="" /></Link>
        {HUBS.map((h) => (
          <Link key={h.to} to={h.to} aria-current={hub === h.to ? 'page' : undefined} className={`flex w-[68px] flex-col items-center gap-1 rounded-[16px] py-2.5 text-[12px] font-semibold transition-colors ${hub === h.to ? 'bg-accent/10 text-accent-ink' : 'text-muted hover:text-ink'}`}>
            <h.icon size={22} aria-hidden="true" />{h.label}
          </Link>
        ))}
        <div className="mt-auto"><button className="icon-btn" onClick={toggle} aria-label={dark ? 'Use light mode' : 'Use dark mode'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>
      </nav>

      <main id="main" className="pb-28 md:pb-12 md:pl-[84px] xl:pl-[268px]">
        <div className="mx-auto w-full max-w-[1160px] px-4 pt-6 sm:px-6 md:pt-8 lg:px-10 xl:pt-10">
          <Outlet />
        </div>
      </main>

      {/* phones: tab bar */}
      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto flex max-w-lg">
          {HUBS.map((h) => { const on = hub === h.to; return (
            <li key={h.to} className="flex-1">
              <Link to={h.to} aria-current={on ? 'page' : undefined} className={`flex min-h-[58px] flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${on ? 'text-accent' : 'text-muted'}`}>
                <h.icon size={23} strokeWidth={on ? 2.3 : 1.9} aria-hidden="true" />{h.label}
              </Link>
            </li>
          ); })}
        </ul>
      </nav>
    </div>
  );
};
