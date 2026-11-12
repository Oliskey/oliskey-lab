import React, { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Moon, RotateCcw, Sun } from 'lucide-react';
import { Logo, useToast } from '../components/ui';
import { HUBS, NAV, hubOf } from './nav';
import { DEMO_ONLY, getDemoApi, useApp } from './context';
import { TabBar } from './TabBar';
import { useLiquidGlass, useSlidingDrop } from '../lib/liquid';

export function useTheme() {
  const [dark, setDark] = React.useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => { const d = !dark; setDark(d); document.documentElement.classList.toggle('dark', d); try { localStorage.setItem('oliskey.lab.theme', d ? 'dark' : 'light'); } catch { /* ok */ }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', d ? '#000000' : '#FFFFFF'); };
  return { dark, toggle };
}

/** Layout by screen (Frontend Skills §33.3, §33.5):
 *  phones (< 768): content, then the liquid glass tab bar (four tabs in one pill + a round More);
 *  tablets (768–1279): a floating glass rail on the left; the selected hub is a vivid accent drop that slides;
 *  computers (>= 1280): a floating glass sidebar with the hubs and every feature by group, same sliding accent drop. */
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
  const top = api.demo ? 38 : 0;

  const railRef = useRef<HTMLDivElement>(null);
  const railDrop = useSlidingDrop<HTMLSpanElement>(railRef, '[aria-current="page"]', hub);
  const sideRef = useRef<HTMLDivElement>(null);
  const sideDrop = useSlidingDrop<HTMLSpanElement>(sideRef, '[aria-current="page"]', loc.pathname + hub);
  const railGlass = useLiquidGlass<HTMLDivElement>({ radius: 28, bezel: 22, thickness: 30 });
  const sideGlass = useLiquidGlass<HTMLDivElement>({ radius: 28, bezel: 22, thickness: 30 });
  const navMatch = NAV.find((n) => loc.pathname === n.to || loc.pathname.startsWith(n.to + '/'));

  return (
    <div className="min-h-screen bg-surface">
      {api.demo && (
        <div className="relative z-50 bg-[#0A1A3A] text-white dark:border-b dark:border-line dark:bg-raised-2">
          <div className="flex min-h-[38px] items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-caption md:pl-[112px] xl:pl-[290px]">
            <p><span className="font-semibold">Demo</span><span className="hidden sm:inline"> · a sample business. Everything works; nothing leaves your browser.</span><span className="sm:hidden"> · sample business</span></p>
            <div className="flex items-center gap-1">
              <button onClick={resetDemo} className="inline-flex min-h-[32px] items-center gap-1.5 rounded-control px-3 font-semibold hover:bg-white/10"><RotateCcw size={14} aria-hidden="true" />Reset</button>
              {DEMO_ONLY ? <a href="/contact" className="inline-flex min-h-[32px] items-center rounded-control bg-white px-3 font-semibold text-black">Talk to us</a>
                : <Link to="/sign-up" onClick={leaveDemo} className="inline-flex min-h-[32px] items-center rounded-control bg-white px-3 font-semibold text-black">Create account</Link>}
            </div>
          </div>
        </div>
      )}

      {/* computers: floating glass sidebar */}
      <aside className="fixed left-3 z-30 hidden w-[262px] xl:block" style={{ top: top + 12, bottom: 12 }}>
        <div ref={sideGlass} className="lg inset-0 !rounded-[28px]" aria-hidden="true" />
        <div className="relative flex h-full flex-col">
          <div className="flex h-16 shrink-0 items-center px-5"><Link to="/app" aria-label="Oliskey Lab home"><Logo /></Link></div>
          <nav aria-label="Oliskey Lab" className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 [scrollbar-width:thin]">
            <div ref={sideRef} className="relative">
              <span ref={sideDrop} className="lg-accent left-0 top-0 !rounded-[14px]" style={{ opacity: 0 }} aria-hidden="true" />
              <ul className="relative space-y-0.5">
                {HUBS.filter((h) => h.to !== '/app/more').map((h) => { const on = h.to === loc.pathname || (h.to === hub && !navMatch); return (
                  <li key={h.to}><Link to={h.to} aria-current={on ? 'page' : undefined} className={`flex min-h-[42px] items-center gap-3 rounded-[14px] px-3 text-[15px] font-semibold transition-colors duration-200 ${on ? 'text-white' : 'text-ink hover:bg-ink/5'}`}><h.icon size={19} strokeWidth={2.1} aria-hidden="true" />{h.label}</Link></li>
                ); })}
              </ul>
              {groups.map((g) => (
                <div key={g} className="relative mt-5">
                  <p className="mb-1 px-3 text-caption font-semibold text-faint">{g}</p>
                  <ul className="space-y-0.5">
                    {NAV.filter((n) => n.group === g && n.to !== '/app/customers').map((n) => { const on = navMatch?.to === n.to; return (
                      <li key={n.to}><Link to={n.to} aria-current={on ? 'page' : undefined} className={`flex min-h-[38px] items-center gap-3 rounded-[14px] px-3 text-[14px] font-medium transition-colors duration-200 ${on ? 'text-white' : 'text-muted hover:bg-ink/5 hover:text-ink'}`}><n.icon size={17} strokeWidth={2.1} aria-hidden="true" />{n.short}</Link></li>
                    ); })}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
          <div className="mx-3 mb-3 rounded-[20px] border border-line/70 p-2.5">
            <div className="flex items-center gap-3 px-1">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/12 text-[14px] font-bold text-accent-ink" aria-hidden="true">{session?.user.name.slice(0, 1)}</span>
              <div className="min-w-0"><p className="truncate text-small font-semibold">{session?.org?.name}</p><p className="truncate text-caption text-muted">{session?.user.name} · {session?.role}</p></div>
            </div>
            <div className="mt-2 flex gap-1">
              <button className="icon-btn" onClick={toggle} aria-label={dark ? 'Use light mode' : 'Use dark mode'}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
              <button className="btn-quiet btn-sm flex-1 justify-start" onClick={signOut}><LogOut size={16} aria-hidden="true" />{api.demo ? 'Leave demo' : 'Sign out'}</button>
            </div>
          </div>
        </div>
      </aside>

      {/* tablets: floating glass rail */}
      <nav aria-label="Main" className="fixed left-3 z-30 hidden w-[84px] md:block xl:hidden" style={{ top: top + 12, bottom: 12 }}>
        <div ref={railGlass} className="lg inset-0 !rounded-[28px]" aria-hidden="true" />
        <div className="relative flex h-full flex-col items-center py-4">
          <Link to="/app" aria-label="Oliskey Lab home" className="mb-4"><Logo className="h-8" label="" /></Link>
          <div ref={railRef} className="relative flex flex-col items-center gap-1.5">
            <span ref={railDrop} className="lg-accent left-0 top-0" style={{ opacity: 0 }} aria-hidden="true" />
            {HUBS.map((h) => (
              <Link key={h.to} to={h.to} aria-current={hub === h.to ? 'page' : undefined} className={`relative flex h-[62px] w-[68px] flex-col items-center justify-center gap-1 rounded-[18px] text-[12px] font-semibold transition-colors duration-200 ${hub === h.to ? 'text-white' : 'text-muted hover:text-ink'}`}>
                <h.icon size={22} strokeWidth={2.1} aria-hidden="true" />{h.label}
              </Link>
            ))}
          </div>
          <div className="mt-auto"><button className="icon-btn" onClick={toggle} aria-label={dark ? 'Use light mode' : 'Use dark mode'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button></div>
        </div>
      </nav>

      <main id="main" className="pb-32 md:pb-12 md:pl-[108px] xl:pl-[286px]">
        <div className="mx-auto w-full max-w-[1160px] px-4 pt-6 sm:px-6 md:pt-8 lg:px-10 xl:pt-10">
          <Outlet />
        </div>
      </main>

      <TabBar hub={hub} />
    </div>
  );
};
