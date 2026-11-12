import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useBlocker, useParams } from 'react-router-dom';
import { ArrowLeft, Columns2, ExternalLink, History, Monitor, Plus, Smartphone, Tablet, Trash2 } from 'lucide-react';
import { useApp } from '../app/context';
import { ActionButton, Badge, Dialog, ErrorState, Field, LoadingBlock, fmtDate, useToast } from '../components/ui';
import type { SiteDetail } from '../lib/api';
import type { SiteContent, SiteSection } from '../../shared/types';

const DEVICES = { phone: { w: 390, h: 844, icon: Smartphone, label: 'Phone' }, tablet: { w: 820, h: 1180, icon: Tablet, label: 'Tablet' }, computer: { w: 1280, h: 800, icon: Monitor, label: 'Computer' } } as const;
type Device = keyof typeof DEVICES;
const STATUS = { published: { t: 'Live', tone: 'good' }, awaiting_approval: { t: 'Waiting for approval', tone: 'warn' }, draft: { t: 'Draft', tone: 'neutral' } } as const;
const clone = <T,>(x: T): T => JSON.parse(JSON.stringify(x));

/** A device frame: the real page in an iframe at the device's width, scaled to fit, with unsaved edits sent in live. */
const Frame: React.FC<{ src: string; device: Device; content?: SiteContent; title: string }> = ({ src, device, content, title }) => {
  const box = useRef<HTMLDivElement>(null); const frame = useRef<HTMLIFrameElement>(null);
  const [w, setW] = useState(600);
  const d = DEVICES[device];
  useEffect(() => { const el = box.current; if (!el) return; const ro = new ResizeObserver(([e]) => setW(e.contentRect.width)); ro.observe(el); return () => ro.disconnect(); }, []);
  const post = () => content && frame.current?.contentWindow?.postMessage({ type: 'lab-preview', content }, location.origin);
  useEffect(() => { const t = setTimeout(post, 120); return () => clearTimeout(t); }); // eslint-disable-line react-hooks/exhaustive-deps
  const scale = Math.min(1, w / d.w);
  const h = Math.min(d.h, device === 'computer' ? 800 : 900);
  return (
    <div ref={box} className="w-full">
      <div className="mx-auto overflow-hidden rounded-[22px] border border-line bg-white shadow-[0_24px_60px_-30px_rgb(var(--shadow)/0.45)]" style={{ width: d.w * scale, height: h * scale }}>
        <iframe ref={frame} src={src} title={title} onLoad={post} style={{ width: d.w, height: h, transform: `scale(${scale})`, transformOrigin: '0 0', border: 0 }} />
      </div>
    </div>
  );
};

export default function Editor() {
  const { siteId } = useParams();
  const { api, session } = useApp();
  const toast = useToast();
  const [d, setD] = useState<SiteDetail | null>(null);
  const [c, setC] = useState<SiteContent | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'brand' | 'pages' | 'search'>('pages');
  const [page, setPage] = useState(0);
  const [device, setDevice] = useState<Device>('phone');
  const [compare, setCompare] = useState(false);
  const [view, setView] = useState<'edit' | 'preview'>('edit');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const canPublish = session?.role === 'owner' || session?.role === 'admin';

  const load = async () => { try { setError(''); const x = await api.site(siteId!); setD(x); setC(clone(x.draft.content)); } catch (e) { setError((e as Error).message); } };
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [api, siteId]);
  const dirty = useMemo(() => !!d && !!c && JSON.stringify(c) !== JSON.stringify(d.draft.content), [c, d]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);
  const blocker = useBlocker(({ currentLocation, nextLocation }) => dirty && currentLocation.pathname !== nextLocation.pathname);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!d || !c) return <LoadingBlock rows={4} />;
  const base = import.meta.env.BASE_URL;
  const set = (fn: (x: SiteContent) => void) => setC((prev) => { const n = clone(prev!); fn(n); return n; });
  const p = c.pages[Math.min(page, c.pages.length - 1)];

  const save = async () => {
    setBusy('save');
    try { const x = await api.saveDraft(d.site.id, c, note.trim()); setD(x); setC(clone(x.draft.content)); setNote(''); toast(`Saved as version ${x.draft.number}.`); }
    catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(null); }
  };
  const ask = async () => { setBusy('ask'); try { setD(await api.requestApproval(d.site.id)); toast('Sent for approval.'); } catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(null); } };
  const publish = async () => { setBusy('publish'); try { const x = await api.approveAndPublish(d.site.id); setD(x); setPublishOpen(false); toast(`Version ${x.draft.number} is live.`); } catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(null); } };
  const restore = async (vid: string, n: number) => { setBusy(vid); try { const x = await api.restoreVersion(d.site.id, vid); setD(x); setC(clone(x.draft.content)); setVersionsOpen(false); toast(`Version ${n} restored as a new draft.`); } catch (e) { toast((e as Error).message, 'bad'); } finally { setBusy(null); } };

  const isLive = d.site.liveVersionId === d.draft.id && d.site.status === 'published';
  const previewSrc = `${base}preview/${d.site.id}/${d.draft.id}`;
  const st = STATUS[d.site.status];

  const Preview = (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-control border border-line bg-raised p-1" role="group" aria-label="Preview size">
          {(Object.keys(DEVICES) as Device[]).map((k) => { const D = DEVICES[k]; return (
            <button key={k} onClick={() => setDevice(k)} aria-pressed={device === k} className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-control px-3 text-[13px] font-semibold transition-colors ${device === k ? 'bg-accent/12 text-accent-ink' : 'text-muted hover:text-ink'}`}><D.icon size={16} aria-hidden="true" />{D.label}</button>
          ); })}
        </div>
        {d.live && !isLive && <button className="btn-quiet btn-sm hidden xl:inline-flex" aria-pressed={compare} onClick={() => setCompare(!compare)}><Columns2 size={16} aria-hidden="true" />{compare ? 'Hide live version' : 'Compare with live'}</button>}
      </div>
      <div className={compare && d.live ? 'grid grid-cols-2 gap-4' : ''}>
        {compare && d.live && <div><p className="mb-2 text-caption font-semibold text-muted">Live — version {d.live.number}</p><Frame src={`${base}preview/${d.site.id}/${d.live.id}`} device={device} title="Live version" /></div>}
        <div>{compare && d.live && <p className="mb-2 text-caption font-semibold text-muted">Your changes{dirty ? ' (not saved)' : ''}</p>}<Frame src={previewSrc} device={device} content={c} title="Preview of your changes" /></div>
      </div>
    </div>
  );

  return (
    <div className="enter">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <Link to="/app/studio" className="inline-flex items-center gap-1.5 text-small font-semibold text-muted hover:text-ink"><ArrowLeft size={16} aria-hidden="true" />Studio</Link>
          <div className="mt-2 flex flex-wrap items-center gap-3"><h1 className="text-page">{d.site.name}</h1><Badge tone={st.tone}>{st.t}</Badge>{dirty && <Badge tone="accent">Unsaved changes</Badge>}</div>
          <p className="mt-1 text-caption text-muted">Version {d.draft.number}{d.live ? ` · live: version ${d.live.number}` : ' · not published yet'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn-secondary btn-sm" onClick={() => setVersionsOpen(true)}><History size={16} aria-hidden="true" />Versions</button>
          {d.live && <a className="btn-secondary btn-sm" href={`${base}s/${d.site.slug}`} target="_blank" rel="noreferrer">View live<ExternalLink size={15} aria-hidden="true" /></a>}
          {dirty ? <ActionButton size="sm" busy={busy === 'save'} onClick={save}>Save changes</ActionButton>
            : !isLive && (canPublish ? <ActionButton size="sm" onClick={() => setPublishOpen(true)}>Review and publish</ActionButton>
              : d.site.status !== 'awaiting_approval' && <ActionButton size="sm" busy={busy === 'ask'} onClick={ask}>Ask for approval</ActionButton>)}
        </div>
      </div>

      {/* phones: edit and preview as two views of the same page */}
      <div className="mt-6 inline-flex w-full rounded-control border border-line bg-raised p-1 lg:hidden" role="tablist" aria-label="Editor view">
        {(['edit', 'preview'] as const).map((v) => <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} className={`min-h-[40px] flex-1 rounded-control text-[14px] font-semibold ${view === v ? 'bg-accent/12 text-accent-ink' : 'text-muted'}`}>{v === 'edit' ? 'Edit' : 'Preview'}</button>)}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(340px,420px)_1fr] grid-cols-1">
        <div className={`${view === 'preview' ? 'hidden lg:block' : ''}`}>
          <div className="mb-5 flex gap-1 border-b border-line" role="tablist" aria-label="What to edit">
            {([['pages', 'Pages'], ['brand', 'Business details'], ['search', 'Search']] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)} className={`-mb-px min-h-[44px] border-b-2 px-3 text-[14px] font-semibold ${tab === k ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>

          {tab === 'brand' && (
            <div className="space-y-4">
              <Field id="b-name" label="Business name"><input className="input" value={c.brand.name} onChange={(e) => set((x) => { x.brand.name = e.target.value; })} /></Field>
              <Field id="b-tag" label="One-line description"><input className="input" value={c.brand.tagline} onChange={(e) => set((x) => { x.brand.tagline = e.target.value; })} /></Field>
              <Field id="b-phone" label="Phone" help="Shown on every page with a tap-to-call link."><input className="input" type="tel" value={c.brand.phone || ''} onChange={(e) => set((x) => { x.brand.phone = e.target.value; })} /></Field>
              <Field id="b-wa" label="WhatsApp number"><input className="input" type="tel" value={c.brand.whatsapp || ''} onChange={(e) => set((x) => { x.brand.whatsapp = e.target.value; })} /></Field>
              <Field id="b-email" label="Email"><input className="input" type="email" value={c.brand.email || ''} onChange={(e) => set((x) => { x.brand.email = e.target.value; })} /></Field>
              <Field id="b-addr" label="Address"><input className="input" value={c.brand.address || ''} onChange={(e) => set((x) => { x.brand.address = e.target.value; })} /></Field>
              <fieldset><legend className="field-label">Look</legend>
                <div className="flex flex-wrap gap-2">{(['clean', 'warm', 'bold'] as const).map((t) => <button key={t} className="chip capitalize" aria-pressed={c.theme === t} onClick={() => set((x) => { x.theme = t; })}>{t}</button>)}</div>
              </fieldset>
              <Field id="b-acc" label="Brand colour" help="Used for buttons and highlights."><input className="h-11 w-20 cursor-pointer rounded-field border border-line bg-raised p-1" type="color" value={c.brand.accent} onChange={(e) => set((x) => { x.brand.accent = e.target.value; })} /></Field>
            </div>
          )}

          {tab === 'search' && (
            <div className="space-y-4">
              <Field id="s-title" label="Title in search results" help={`${c.seo.title.length} characters — keep it under about 60.`}><input className="input" value={c.seo.title} onChange={(e) => set((x) => { x.seo.title = e.target.value; })} /></Field>
              <Field id="s-desc" label="Description in search results" help={`${c.seo.description.length} characters — aim for 50 to 160.`}><textarea className="input" value={c.seo.description} onChange={(e) => set((x) => { x.seo.description = e.target.value; })} /></Field>
              <div className="panel p-4"><p className="text-caption font-semibold text-muted">How it may look on Google</p><p className="mt-2 truncate text-[17px] text-[#1a0dab] dark:text-[#8ab4f8]">{c.seo.title || 'Your title'}</p><p className="truncate text-caption text-good">lab.oliskey.com › s › {d.site.slug}</p><p className="mt-0.5 line-clamp-2 text-small text-muted">{c.seo.description}</p></div>
            </div>
          )}

          {tab === 'pages' && (
            <div>
              <label className="field-label" htmlFor="pg">Page</label>
              <select id="pg" className="input" value={page} onChange={(e) => setPage(+e.target.value)}>{c.pages.map((x, i) => <option key={x.slug} value={i}>{x.title}</option>)}</select>
              {p.slug !== '' && <div className="mt-3"><Field id="pg-title" label="Page name in the menu"><input className="input" value={p.title} onChange={(e) => set((x) => { x.pages[page].title = e.target.value; })} /></Field></div>}
              <div className="mt-6 space-y-6">{p.sections.map((s, si) => <SectionEditor key={si} s={s} onChange={(fn) => set((x) => fn(x.pages[page].sections[si]))} />)}</div>
            </div>
          )}

          {dirty && (
            <div className="sticky bottom-24 z-10 mt-8 rounded-card border border-line bg-raised p-4 shadow-lg lg:bottom-4">
              <Field id="note" label="What did you change?" help="Optional. Helps you find this version later."><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. New prices for party catering" /></Field>
              <div className="mt-3 flex gap-2"><ActionButton busy={busy === 'save'} onClick={save}>Save changes</ActionButton><button className="btn-quiet" onClick={() => setC(clone(d.draft.content))}>Discard</button></div>
            </div>
          )}
        </div>
        <div className={`${view === 'edit' ? 'hidden lg:block' : ''} lg:sticky lg:top-6 lg:self-start`}>{Preview}</div>
      </div>

      <Dialog open={versionsOpen} onClose={() => setVersionsOpen(false)} title="Versions">
        <p className="text-small text-muted">Every save is kept. Restoring copies an older version into a new draft — nothing is lost and nothing goes live until you publish.</p>
        <ol className="mt-4 divide-y divide-line">
          {d.versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0"><p className="text-[15px] font-semibold">Version {v.number}{v.id === d.site.liveVersionId && <span className="ml-2"><Badge tone="good">Live</Badge></span>}{v.id === d.draft.id && v.id !== d.site.liveVersionId && <span className="ml-2"><Badge>Current draft</Badge></span>}</p>
                <p className="truncate text-caption text-muted">{v.note} · {v.createdBy} · {fmtDate(v.createdAt)}</p></div>
              <div className="flex gap-2">
                <a className="btn-quiet btn-sm" href={`${base}preview/${d.site.id}/${v.id}`} target="_blank" rel="noreferrer">Preview</a>
                {v.id !== d.draft.id && <ActionButton kind="secondary" size="sm" busy={busy === v.id} onClick={() => restore(v.id, v.number)}>Restore</ActionButton>}
              </div>
            </li>
          ))}
        </ol>
      </Dialog>

      <Dialog open={publishOpen} onClose={() => setPublishOpen(false)} title={`Publish version ${d.draft.number}?`}
        footer={<><button className="btn-quiet" onClick={() => setPublishOpen(false)}>Not yet</button><ActionButton busy={busy === 'publish'} onClick={publish}>Approve and publish</ActionButton></>}>
        <p className="text-body">Version {d.draft.number} will replace {d.live ? `version ${d.live.number}` : 'nothing'} at <span className="font-semibold">lab.oliskey.com/s/{d.site.slug}</span>. Anyone with the address can see it.</p>
        <p className="mt-3 text-small text-muted">You can restore an earlier version at any time. This approval is recorded in your history.</p>
      </Dialog>

      <Dialog open={blocker.state === 'blocked'} onClose={() => blocker.reset?.()} title="Leave without saving?"
        footer={<><button className="btn-quiet" onClick={() => blocker.reset?.()}>Keep editing</button><button className="btn-danger" onClick={() => blocker.proceed?.()}>Leave and lose changes</button></>}>
        <p className="text-body">Your changes to {d.site.name} are not saved yet.</p>
      </Dialog>
    </div>
  );
}

/** Edits one section's text and lists. Items can be added and removed; headings stay required. */
const SectionEditor: React.FC<{ s: SiteSection; onChange: (fn: (s: SiteSection) => void) => void }> = ({ s, onChange }) => {
  const NAMES: Record<SiteSection['type'], string> = { hero: 'Top of page', features: 'Reasons to choose you', offers: 'Products and services', about: 'About', testimonials: 'Customer words', faq: 'Questions', contact: 'Contact form' };
  const id = (k: string) => `${s.type}-${k}-${Math.abs(s.heading.length)}`;
  return (
    <fieldset className="panel p-4">
      <legend className="px-1 text-caption font-semibold uppercase tracking-[0.1em] text-faint">{NAMES[s.type]}</legend>
      <div className="space-y-3">
        <Field id={id('h')} label="Heading"><input className="input" value={s.heading} onChange={(e) => onChange((x) => { x.heading = e.target.value; })} /></Field>
        {(s.type === 'hero' || s.type === 'about' || s.type === 'contact') && <Field id={id('t')} label="Text"><textarea className="input" value={s.text} onChange={(e) => onChange((x) => { (x as typeof s).text = e.target.value; })} /></Field>}
        {s.type === 'hero' && <Field id={id('c')} label="Button text"><input className="input" value={s.cta} onChange={(e) => onChange((x) => { (x as typeof s).cta = e.target.value; })} /></Field>}
        {s.type === 'offers' && (
          <div className="space-y-3">
            {s.items.map((it, i) => (
              <div key={i} className="rounded-field border border-line p-3">
                <div className="flex items-start gap-2">
                  <div className="grid flex-1 gap-2">
                    <label className="sr-only" htmlFor={id(`on${i}`)}>Name</label><input id={id(`on${i}`)} className="input" placeholder="Name" value={it.name} onChange={(e) => onChange((x) => { (x as typeof s).items[i].name = e.target.value; })} />
                    <label className="sr-only" htmlFor={id(`op${i}`)}>Price</label><input id={id(`op${i}`)} className="input" placeholder="Price (optional), e.g. ₦8,500" value={it.price || ''} onChange={(e) => onChange((x) => { (x as typeof s).items[i].price = e.target.value; })} />
                    <label className="sr-only" htmlFor={id(`ot${i}`)}>Description</label><textarea id={id(`ot${i}`)} className="input !min-h-[72px]" placeholder="Short description" value={it.text} onChange={(e) => onChange((x) => { (x as typeof s).items[i].text = e.target.value; })} />
                  </div>
                  <button className="icon-btn text-bad" aria-label={`Remove ${it.name || 'item'}`} onClick={() => onChange((x) => { (x as typeof s).items.splice(i, 1); })}><Trash2 size={17} /></button>
                </div>
              </div>
            ))}
            <button className="btn-secondary btn-sm" onClick={() => onChange((x) => { (x as typeof s).items.push({ name: 'New item', text: 'Ask us for details and the current price.' }); })}><Plus size={16} aria-hidden="true" />Add item</button>
          </div>
        )}
        {s.type === 'features' && s.items.map((it, i) => (
          <div key={i} className="grid gap-2 rounded-field border border-line p-3">
            <label className="sr-only" htmlFor={id(`ft${i}`)}>Title</label><input id={id(`ft${i}`)} className="input" value={it.title} onChange={(e) => onChange((x) => { (x as typeof s).items[i].title = e.target.value; })} />
            <label className="sr-only" htmlFor={id(`fx${i}`)}>Text</label><textarea id={id(`fx${i}`)} className="input !min-h-[72px]" value={it.text} onChange={(e) => onChange((x) => { (x as typeof s).items[i].text = e.target.value; })} />
          </div>
        ))}
        {s.type === 'faq' && (
          <div className="space-y-3">
            {s.items.map((it, i) => (
              <div key={i} className="flex items-start gap-2 rounded-field border border-line p-3">
                <div className="grid flex-1 gap-2">
                  <label className="sr-only" htmlFor={id(`q${i}`)}>Question</label><input id={id(`q${i}`)} className="input" value={it.q} onChange={(e) => onChange((x) => { (x as typeof s).items[i].q = e.target.value; })} />
                  <label className="sr-only" htmlFor={id(`a${i}`)}>Answer</label><textarea id={id(`a${i}`)} className="input !min-h-[72px]" value={it.a} onChange={(e) => onChange((x) => { (x as typeof s).items[i].a = e.target.value; })} />
                </div>
                <button className="icon-btn text-bad" aria-label="Remove question" onClick={() => onChange((x) => { (x as typeof s).items.splice(i, 1); })}><Trash2 size={17} /></button>
              </div>
            ))}
            <button className="btn-secondary btn-sm" onClick={() => onChange((x) => { (x as typeof s).items.push({ q: 'New question', a: 'Answer' }); })}><Plus size={16} aria-hidden="true" />Add question</button>
          </div>
        )}
      </div>
    </fieldset>
  );
};
