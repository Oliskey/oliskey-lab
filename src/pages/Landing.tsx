
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Globe, PlugZap } from 'lucide-react';
import { Logo } from '../components/ui';
import { DEMO_ONLY, useApp } from '../app/context';
import { NAV } from '../app/nav';

const STEPS = [
  { t: 'Tell us about your business', d: 'A short conversation: what you sell, who buys, where they are, what takes your time.' },
  { t: 'Get a clear plan', d: 'What you need — website, installable app, store app or none yet — with the honest costs.' },
  { t: 'Build or connect', d: 'Lab builds your website from your answers, or connects the one you have. You approve before anything goes live.' },
  { t: 'Keep growing', d: 'Enquiries, social media and results in one place, with the next improvement suggested every month.' },
];

export default function Landing() {
  const { enterDemo } = useApp();
  const nav = useNavigate();
  const tryDemo = () => { enterDemo(); nav('/app'); };
  const groups = ['Build and connect', 'Grow', 'Run'] as const;
  return (
    <div className="min-h-screen bg-page">
      <header className="page-x flex h-16 items-center justify-between">
        <a href={DEMO_ONLY ? '/' : '/'} aria-label="Oliskey"><Logo /></a>
        <div className="flex items-center gap-1">
          {!DEMO_ONLY && <Link to="/sign-in" className="btn-quiet btn-sm">Sign in</Link>}
          <button onClick={tryDemo} className="btn-primary btn-sm">Try the demo</button>
        </div>
      </header>

      <main>
        <section className="page-x pb-16 pt-10 md:pb-24 md:pt-20">
          <p className="eyebrow">Oliskey Lab</p>
          <h1 className="mt-3 max-w-[820px] text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.05] tracking-[-0.035em]">Bring your business online. Keep it growing.</h1>
          <p className="mt-5 max-w-read text-[clamp(1.0625rem,1.3vw,1.25rem)] leading-relaxed text-muted">
            Oliskey Lab builds or connects your website and app, brings your social media and customers into one place, and keeps improving them — from one account.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button onClick={tryDemo} className="btn-primary">Try the demo<ArrowRight size={18} aria-hidden="true" /></button>
            {!DEMO_ONLY ? <Link to="/sign-up" className="btn-secondary">Create your account</Link> : <a href="/contact" className="btn-secondary">Talk to us</a>}
          </div>
          <p className="mt-3 text-caption text-muted">The demo opens a sample restaurant. No account, nothing to install.</p>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {[{ icon: Globe, t: 'Starting online', d: 'No website or app yet. Lab understands your business, builds the right website, and connects your enquiries and social media.' },
              { icon: PlugZap, t: 'Already online', d: 'You have a website, app or social pages. Lab connects them with your permission, checks them and improves what holds customers back — without rebuilding what works.' }].map((c) => (
              <div key={c.t} className="panel p-6">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-accent/10 text-accent-ink"><c.icon size={20} aria-hidden="true" /></span>
                <h2 className="mt-4 text-card">{c.t}</h2>
                <p className="mt-1.5 text-small text-muted">{c.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-line bg-surface py-16 md:py-24">
          <div className="page-x">
            <h2 className="text-page">How it works</h2>
            <ol className="mt-10 grid gap-8 md:grid-cols-4">
              {STEPS.map((s, i) => (
                <li key={s.t}>
                  <span className="tnum grid h-9 w-9 place-items-center rounded-full bg-navy text-[14px] font-bold text-white dark:bg-white dark:text-navy">{i + 1}</span>
                  <h3 className="mt-4 text-card">{s.t}</h3>
                  <p className="mt-1.5 text-small text-muted">{s.d}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="page-x">
            <h2 className="text-page">Everything in one account</h2>
            <p className="mt-2 max-w-read text-body text-muted">Each area shares the same business information, permissions and results.</p>
            <div className="mt-10 grid gap-10 md:grid-cols-3">
              {groups.map((g) => (
                <div key={g}>
                  <h3 className="text-caption font-semibold uppercase tracking-[0.12em] text-faint">{g}</h3>
                  <ul className="mt-4 space-y-4">
                    {NAV.filter((n) => n.group === g).map((n) => (
                      <li key={n.to} className="flex gap-3">
                        <n.icon size={20} className="mt-0.5 shrink-0 text-accent-ink" aria-hidden="true" />
                        <div><p className="text-[15px] font-semibold">{n.label}</p><p className="text-small text-muted">{n.desc}</p></div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line bg-surface py-16">
          <div className="page-x">
            <h2 className="text-section">Your business stays yours</h2>
            <ul className="mt-5 grid gap-3 md:grid-cols-3">
              {['Lab only does what you allow, and you can take access back at any time.', 'Nothing goes live without your approval, and every change can be undone.', 'Your domain, content, customers and code remain yours. Lab never asks for your passwords.'].map((t) => (
                <li key={t} className="flex gap-2.5 text-small text-ink"><Check size={18} className="mt-0.5 shrink-0 text-good" aria-hidden="true" />{t}</li>
              ))}
            </ul>
            <button onClick={tryDemo} className="btn-primary mt-10">Try the demo<ArrowRight size={18} aria-hidden="true" /></button>
          </div>
        </section>
      </main>
      <footer className="page-x flex flex-wrap items-center justify-between gap-3 py-8 text-caption text-muted">
        <p>© {new Date().getFullYear()} Oliskeylee Ltd. Oliskey Lab.</p>
        <a href="https://www.oliskey.com" className="font-semibold text-ink hover:text-accent-ink">Part of Oliskey</a>
      </footer>
    </div>
  );
}
