// Draws a business website from its content. Used for previews in the Studio and for published sites (/s/name).
// Self-contained styling (its own colours per theme), responsive by itself, accessible, and with a working enquiry form.
import React, { useMemo, useState } from 'react';
import { CheckCircle2, Mail, MapPin, Menu, MessageCircle, Phone, X } from 'lucide-react';
import type { SiteContent, SiteSection } from '../../shared/types';

const THEMES = {
  clean: { bg: '#FFFFFF', alt: '#F5F7FB', ink: '#0F172A', muted: '#475569', line: '#E2E8F0', font: '"Inter Variable", Inter, system-ui, sans-serif', radius: 16 },
  warm: { bg: '#FFFBF5', alt: '#FFF1E2', ink: '#2B1A10', muted: '#6B4F3A', line: '#F1DEC9', font: '"Inter Variable", Inter, system-ui, sans-serif', radius: 20 },
  bold: { bg: '#FFFFFF', alt: '#F1F3F8', ink: '#0A1A3A', muted: '#3F4D6B', line: '#DCE1EC', font: '"Inter Variable", Inter, system-ui, sans-serif', radius: 10 },
} as const;

export interface LeadInput { name: string; email: string; phone: string; message: string }

export const SiteRenderer: React.FC<{ content: SiteContent; page?: string; onNavigate?: (slug: string) => void; onLead?: (l: LeadInput) => Promise<void>; preview?: boolean }> = ({ content, page = '', onNavigate, onLead, preview }) => {
  const t = THEMES[content.theme] || THEMES.clean;
  const accent = content.brand.accent || '#1F6BFF';
  const current = content.pages.find((p) => p.slug === page) || content.pages[0];
  const [menu, setMenu] = useState(false);
  const go = (slug: string) => { setMenu(false); onNavigate?.(slug); };
  const style = useMemo(() => ({ ['--a' as string]: accent, background: t.bg, color: t.ink, fontFamily: t.font, minHeight: '100vh' }), [accent, t]);
  const wa = content.brand.whatsapp?.replace(/[^0-9]/g, '');

  return (
    <div style={style} className="site">
      <style>{`
        .site a, .site button { color: inherit; }
        .site .s-btn { display:inline-flex; align-items:center; justify-content:center; gap:8px; min-height:46px; padding:0 22px; border-radius:999px; background:var(--a); color:#fff; font-weight:600; font-size:15px; transition: filter .15s, transform .15s; }
        .site .s-btn:hover { filter:brightness(1.08); } .site .s-btn:active { transform:scale(.97); }
        .site .s-in { width:100%; min-height:46px; border:1px solid ${t.line}; border-radius:12px; padding:10px 14px; font-size:16px; background:#fff; color:${t.ink}; }
        .site .s-in:focus { outline:none; border-color:var(--a); box-shadow:0 0 0 4px color-mix(in srgb, var(--a) 18%, transparent); }
        .site .wrap { max-width:1080px; margin:0 auto; padding:0 20px; }
        .site h1,.site h2,.site h3 { letter-spacing:-0.02em; }
      `}</style>
      <header style={{ borderBottom: `1px solid ${t.line}`, background: t.bg, position: 'sticky', top: 0, zIndex: 5 }}>
        <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64 }}>
          <button onClick={() => go('')} style={{ fontWeight: 700, fontSize: 19 }}>{content.brand.name}</button>
          <nav aria-label="Site" className="hidden sm:flex" style={{ gap: 4 }}>
            {content.pages.map((p) => <button key={p.slug} onClick={() => go(p.slug)} aria-current={p.slug === current.slug ? 'page' : undefined} style={{ padding: '10px 14px', borderRadius: 999, fontSize: 15, fontWeight: p.slug === current.slug ? 650 : 500, background: p.slug === current.slug ? t.alt : 'transparent' }}>{p.title}</button>)}
          </nav>
          <button className="sm:hidden" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-label={menu ? 'Close menu' : 'Open menu'} style={{ width: 44, height: 44, display: 'grid', placeItems: 'center' }}>{menu ? <X size={22} /> : <Menu size={22} />}</button>
        </div>
        {menu && <nav aria-label="Site" className="sm:hidden" style={{ borderTop: `1px solid ${t.line}`, padding: '8px 12px 14px' }}>{content.pages.map((p) => <button key={p.slug} onClick={() => go(p.slug)} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 10px', fontSize: 16, fontWeight: p.slug === current.slug ? 650 : 500 }}>{p.title}</button>)}</nav>}
      </header>
      <main>
        {current.sections.map((s, i) => <Block key={i} s={s} t={t} content={content} first={i === 0} onLead={onLead} preview={preview} onCta={() => go(content.pages.find((p) => p.slug === 'contact') ? 'contact' : current.slug)} />)}
      </main>
      <footer style={{ borderTop: `1px solid ${t.line}`, background: t.alt }}>
        <div className="wrap" style={{ padding: '28px 20px', display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'space-between', fontSize: 14, color: t.muted }}>
          <div>
            <p style={{ fontWeight: 650, color: t.ink }}>{content.brand.name}</p>
            {content.brand.address && <p style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 6 }}><MapPin size={15} aria-hidden="true" />{content.brand.address}</p>}
          </div>
          <div style={{ display: 'grid', gap: 6 }}>
            {content.brand.phone && <a href={`tel:${content.brand.phone.replace(/\s/g, '')}`} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Phone size={15} aria-hidden="true" />{content.brand.phone}</a>}
            {wa && <a href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer" style={{ display: 'flex', gap: 6, alignItems: 'center' }}><MessageCircle size={15} aria-hidden="true" />WhatsApp</a>}
            {content.brand.email && <a href={`mailto:${content.brand.email}`} style={{ display: 'flex', gap: 6, alignItems: 'center' }}><Mail size={15} aria-hidden="true" />{content.brand.email}</a>}
          </div>
          <p style={{ width: '100%', fontSize: 12 }}>Made with Oliskey Lab</p>
        </div>
      </footer>
    </div>
  );
};

const Block: React.FC<{ s: SiteSection; t: (typeof THEMES)[keyof typeof THEMES]; content: SiteContent; first: boolean; onLead?: (l: LeadInput) => Promise<void>; onCta: () => void; preview?: boolean }> = ({ s, t, content, first, onLead, onCta, preview }) => {
  const pad = { padding: first ? '56px 0' : '48px 0' };
  const H2 = ({ children }: { children: React.ReactNode }) => first ? <h1 style={{ fontSize: 'clamp(28px,4vw,40px)', fontWeight: 700, lineHeight: 1.1 }}>{children}</h1> : <h2 style={{ fontSize: 'clamp(24px,3vw,30px)', fontWeight: 700, lineHeight: 1.15 }}>{children}</h2>;
  switch (s.type) {
    case 'hero': return (
      <section style={{ ...pad, padding: '72px 0 64px', background: `linear-gradient(180deg, ${t.alt}, ${t.bg})` }}>
        <div className="wrap">
          <h1 style={{ fontSize: 'clamp(34px,6vw,58px)', fontWeight: 750, lineHeight: 1.04, maxWidth: 760 }}>{s.heading}</h1>
          <p style={{ fontSize: 'clamp(17px,1.6vw,20px)', color: t.muted, marginTop: 16, maxWidth: 620, lineHeight: 1.55 }}>{s.text}</p>
          <button className="s-btn" style={{ marginTop: 28 }} onClick={onCta}>{s.cta}</button>
        </div>
      </section>
    );
    case 'features': return (
      <section style={pad}><div className="wrap"><H2>{s.heading}</H2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24, marginTop: 24 }}>
          {s.items.map((it) => <div key={it.title}><span style={{ display: 'block', width: 28, height: 4, borderRadius: 4, background: 'var(--a)' }} /><h3 style={{ fontSize: 18, fontWeight: 650, marginTop: 14 }}>{it.title}</h3><p style={{ color: t.muted, marginTop: 6, lineHeight: 1.55 }}>{it.text}</p></div>)}
        </div></div></section>
    );
    case 'offers': return (
      <section style={{ ...pad, background: first ? t.bg : t.alt }}><div className="wrap"><H2>{s.heading}</H2>
        <ul style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 24 }}>
          {s.items.map((it) => <li key={it.name} style={{ background: t.bg, border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 20 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}><h3 style={{ fontSize: 17, fontWeight: 650 }}>{it.name}</h3>{it.price && <p style={{ fontWeight: 700, color: 'var(--a)', whiteSpace: 'nowrap' }}>{it.price}</p>}</div><p style={{ color: t.muted, marginTop: 6, lineHeight: 1.5, fontSize: 15 }}>{it.text}</p></li>)}
        </ul></div></section>
    );
    case 'about': return <section style={pad}><div className="wrap" style={{ maxWidth: 760 }}><H2>{s.heading}</H2><p style={{ marginTop: 16, fontSize: 17, lineHeight: 1.7, color: t.muted }}>{s.text}</p></div></section>;
    case 'testimonials': return (
      <section style={pad}><div className="wrap"><H2>{s.heading}</H2><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16, marginTop: 24 }}>{s.items.map((q) => <figure key={q.name} style={{ border: `1px solid ${t.line}`, borderRadius: t.radius, padding: 20 }}><blockquote style={{ lineHeight: 1.6 }}>“{q.quote}”</blockquote><figcaption style={{ marginTop: 10, color: t.muted, fontSize: 14 }}>{q.name}</figcaption></figure>)}</div></div></section>
    );
    case 'faq': return (
      <section style={pad}><div className="wrap" style={{ maxWidth: 760 }}><H2>{s.heading}</H2><div style={{ marginTop: 16 }}>{s.items.map((f) => <details key={f.q} style={{ borderBottom: `1px solid ${t.line}`, padding: '14px 0' }}><summary style={{ cursor: 'pointer', fontWeight: 600, fontSize: 16 }}>{f.q}</summary><p style={{ marginTop: 8, color: t.muted, lineHeight: 1.6 }}>{f.a}</p></details>)}</div></div></section>
    );
    case 'contact': return <section style={{ ...pad, background: first ? t.bg : t.alt }}><div className="wrap" style={{ maxWidth: 640 }}><H2>{s.heading}</H2><p style={{ marginTop: 8, color: t.muted }}>{s.text}</p><LeadForm t={t} onLead={onLead} preview={preview} name={content.brand.name} /></div></section>;
  }
};

const LeadForm: React.FC<{ t: (typeof THEMES)[keyof typeof THEMES]; onLead?: (l: LeadInput) => Promise<void>; preview?: boolean; name: string }> = ({ t, onLead, preview, name }) => {
  const [f, setF] = useState<LeadInput>({ name: '', email: '', phone: '', message: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'sent' | 'error'>('idle');
  const [err, setErr] = useState('');
  const uid = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  if (state === 'sent') return <p role="status" style={{ marginTop: 20, display: 'flex', gap: 8, alignItems: 'center', fontWeight: 600 }}><CheckCircle2 color="#0A8449" aria-hidden="true" />Thank you. {name} has your message and will reply soon.</p>;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.name.trim() || (!f.email.trim() && !f.phone.trim()) || !f.message.trim()) { setErr('Please add your name, a phone number or email, and your message.'); setState('error'); return; }
    if (!onLead) { setState('sent'); return; }
    setState('busy'); setErr('');
    try { await onLead(f); setState('sent'); } catch (x) { setErr((x as Error).message || 'Your message could not be sent. Please try again.'); setState('error'); }
  };
  const lab = { display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 6 } as const;
  return (
    <form onSubmit={submit} noValidate style={{ display: 'grid', gap: 14, marginTop: 20 }}>
      <div><label style={lab} htmlFor={`n${uid}`}>Your name</label><input id={`n${uid}`} className="s-in" autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
        <div><label style={lab} htmlFor={`p${uid}`}>Phone</label><input id={`p${uid}`} className="s-in" type="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
        <div><label style={lab} htmlFor={`e${uid}`}>Email</label><input id={`e${uid}`} className="s-in" type="email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></div>
      </div>
      <div><label style={lab} htmlFor={`m${uid}`}>Message</label><textarea id={`m${uid}`} className="s-in" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></div>
      {state === 'error' && <p role="alert" style={{ color: '#B91C1C', fontSize: 14 }}>{err}</p>}
      <div><button className="s-btn" disabled={state === 'busy'}>{state === 'busy' ? 'Sending…' : 'Send message'}</button></div>
      {preview && <p style={{ fontSize: 13, color: t.muted }}>Preview: messages sent here appear in Customers, marked as a website enquiry.</p>}
    </form>
  );
};
