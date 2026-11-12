// Shared building blocks. Every screen uses these, so spacing, type, states and behaviour stay consistent.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';

export const Logo: React.FC<{ className?: string; label?: string }> = ({ className = 'h-7', label = 'Oliskey Lab' }) => (
  <span className={`inline-flex items-center gap-2 ${className}`}>
    <svg viewBox="0 0 100 100" fill="none" className="h-full w-auto" aria-hidden="true">
      <g stroke="currentColor" strokeWidth="8" strokeLinecap="round"><circle cx="35" cy="62" r="22" /><circle cx="65" cy="62" r="22" /><circle cx="50" cy="36" r="22" /></g>
      <path d="M 65.55 20.44 A 22 22 0 0 1 72 36" stroke="#3b82f6" strokeWidth="8" strokeLinecap="round" />
    </svg>
    <span className="text-[19px] font-bold tracking-tight">{label}</span>
  </span>
);

/** Page title, one line of context and the page's one primary action. */
export const PageHeader: React.FC<{ title: string; lead?: React.ReactNode; action?: React.ReactNode; eyebrow?: string }> = ({ title, lead, action, eyebrow }) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div className="min-w-0">
      {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
      <h1 className="text-title text-ink">{title}</h1>
      {lead && <p className="mt-2 max-w-read text-body text-muted">{lead}</p>}
    </div>
    {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
  </header>
);

export const Section: React.FC<{ title: string; lead?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ title, lead, action, children, className = '' }) => (
  <section className={`mt-10 ${className}`}>
    <div className="mb-4 flex items-end justify-between gap-4">
      <div><h2 className="text-section text-ink">{title}</h2>{lead && <p className="mt-1 text-small text-muted">{lead}</p>}</div>
      {action}
    </div>
    {children}
  </section>
);

export const Spinner: React.FC<{ className?: string }> = ({ className = 'h-5 w-5' }) => <Loader2 className={`${className} animate-spin`} aria-hidden="true" />;

/** A button that shows its own progress and never runs twice at once. */
export const ActionButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean; kind?: 'primary' | 'secondary' | 'quiet' | 'danger'; size?: 'sm' | 'md' }> = ({ busy, kind = 'primary', size = 'md', className = '', children, disabled, ...rest }) => (
  <button {...rest} disabled={disabled || busy} aria-busy={busy || undefined} className={`btn-${kind} ${size === 'sm' ? 'btn-sm' : ''} ${className}`}>
    {busy && <Spinner className="h-4 w-4" />}{children}
  </button>
);

export const Field: React.FC<{ label: string; help?: string; error?: string; children: React.ReactElement<{ id?: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }>; id: string }> = ({ label, help, error, children, id }) => (
  <div>
    <label htmlFor={id} className="field-label">{label}</label>
    {React.cloneElement(children, { id, 'aria-describedby': help || error ? `${id}-help` : undefined, 'aria-invalid': error ? true : undefined })}
    {(error || help) && <p id={`${id}-help`} className={`field-help ${error ? '!text-bad' : ''}`}>{error || help}</p>}
  </div>
);

export const Badge: React.FC<{ tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'accent'; children: React.ReactNode }> = ({ tone = 'neutral', children }) => {
  const t = { neutral: 'bg-ink/[0.06] text-muted', good: 'bg-good/10 text-good', warn: 'bg-warn/10 text-warn', bad: 'bg-bad/10 text-bad', accent: 'bg-accent/10 text-accent-ink' }[tone];
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-control px-2.5 py-1 text-caption font-semibold ${t}`}>{children}</span>;
};

export const EmptyState: React.FC<{ icon: React.ElementType; title: string; text: string; action?: React.ReactNode }> = ({ icon: Icon, title, text, action }) => (
  <div className="panel flex flex-col items-center px-6 py-12 text-center">
    <span className="grid h-12 w-12 place-items-center rounded-full bg-accent/10 text-accent-ink"><Icon size={22} aria-hidden="true" /></span>
    <h3 className="mt-4 text-card text-ink">{title}</h3>
    <p className="mt-1.5 max-w-sm text-small text-muted">{text}</p>
    {action && <div className="mt-5">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({ message, onRetry }) => (
  <div role="alert" className="panel flex flex-col items-center px-6 py-10 text-center">
    <AlertCircle className="h-8 w-8 text-bad" aria-hidden="true" />
    <h3 className="mt-3 text-card">This could not load</h3>
    <p className="mt-1 max-w-sm text-small text-muted">{message}</p>
    {onRetry && <button className="btn-secondary btn-sm mt-5" onClick={onRetry}>Try again</button>}
  </div>
);

export const LoadingBlock: React.FC<{ rows?: number }> = ({ rows = 3 }) => (
  <div aria-busy="true" aria-label="Loading" className="space-y-3">{Array.from({ length: rows }, (_, i) => <div key={i} className="skeleton h-16" />)}</div>
);

/** Load data with loading, error and retry handled the same way everywhere. */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, setState] = useState<{ data: T | null; error: string | null; loading: boolean }>({ data: null, error: null, loading: true });
  const run = useCallback(() => {
    setState((s) => ({ ...s, loading: true, error: null }));
    fn().then((data) => setState({ data, error: null, loading: false })).catch((e: Error) => setState({ data: null, error: e.message, loading: false }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(run, [run]);
  return { ...state, reload: run, set: (data: T) => setState({ data, error: null, loading: false }) };
}

/** Accessible dialog on the native element: focus is trapped, Escape closes, focus returns to the opener. */
export const Dialog: React.FC<{ open: boolean; onClose: () => void; title: string; children: React.ReactNode; footer?: React.ReactNode }> = ({ open, onClose, title, children, footer }) => {
  const titleId = React.useId();
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={(e) => { e.preventDefault(); onClose(); }} aria-labelledby={titleId}
      className="w-[min(560px,calc(100vw-32px))] rounded-card border border-line bg-raised p-0 text-ink shadow-2xl backdrop:bg-navy/40 backdrop:backdrop-blur-[2px]">
      <div className="flex items-center justify-between gap-4 border-b border-line px-6 py-4">
        <h2 id={titleId} className="text-card">{title}</h2>
        <button className="icon-btn -mr-2" onClick={onClose} aria-label="Close"><X size={20} /></button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto px-6 py-5">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-6 py-4">{footer}</div>}
    </dialog>
  );
};

type Toast = { id: number; text: string; tone: 'good' | 'bad' };
const ToastCtx = createContext<(text: string, tone?: Toast['tone']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [list, setList] = useState<Toast[]>([]);
  const push = useCallback((text: string, tone: Toast['tone'] = 'good') => {
    const id = Date.now() + Math.random(); setList((l) => [...l, { id, text, tone }]);
    setTimeout(() => setList((l) => l.filter((t) => t.id !== id)), 3200 + text.length * 25);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-4" role="status" aria-live="polite">
        {list.map((t) => (
          <div key={t.id} className="glass-toast enter pointer-events-auto flex max-w-md items-center gap-2.5 rounded-control px-4 py-2.5 text-small font-medium text-ink">
            {t.tone === 'good' ? <CheckCircle2 className="h-5 w-5 shrink-0 text-good" aria-hidden="true" /> : <AlertCircle className="h-5 w-5 shrink-0 text-bad" aria-hidden="true" />}{t.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
};

export const Stat: React.FC<{ label: string; value: React.ReactNode; note?: React.ReactNode }> = ({ label, value, note }) => (
  <div className="min-w-0">
    <p className="text-caption font-medium text-muted">{label}</p>
    <p className="tnum mt-1 text-stat text-ink">{value}</p>
    {note && <p className="mt-1 text-caption text-muted">{note}</p>}
  </div>
);

export const fmtDate = (iso: string) => new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtAgo = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'just now'; if (m < 60) return `${m} min ago`; const h = Math.round(m / 60); if (h < 24) return `${h} h ago`; const d = Math.round(h / 24); return d === 1 ? 'yesterday' : `${d} days ago`;
};
