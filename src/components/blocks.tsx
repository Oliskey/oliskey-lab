// Larger shared pieces from the owner's approved phone design: hub titles, segmented tabs, list rows and the blue plan card.
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export const HubHeader: React.FC<{ title: string; lead: string; action?: React.ReactNode }> = ({ title, lead, action }) => (
  <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
    <div><h1 className="text-[clamp(1.75rem,3vw,2.5rem)] font-bold leading-tight tracking-[-0.03em]">{title}</h1><p className="mt-1.5 text-[16px] text-muted">{lead}</p></div>
    {action}
  </header>
);

/** Segmented tabs: one selected (filled blue), the rest quiet. Scrolls sideways on narrow phones instead of squeezing. */
export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { v: T; l: string }[]; label: string }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0">
      <div className="inline-flex min-w-full rounded-control bg-ink/[0.05] p-1 sm:min-w-0" role="tablist" aria-label={label}>
        {options.map((o) => (
          <button key={o.v} role="tab" aria-selected={value === o.v} onClick={() => onChange(o.v)}
            className={`min-h-[40px] flex-1 whitespace-nowrap rounded-control px-5 text-[14px] font-semibold transition-[background-color,color,box-shadow] duration-200 ${value === o.v ? 'bg-accent text-white shadow-[0_6px_16px_-8px_rgba(31,107,255,0.8)]' : 'text-ink hover:bg-ink/5'}`}>{o.l}</button>
        ))}
      </div>
    </div>
  );
}

/** A tappable row: icon, title, one line, chevron. Used for the main tasks in each hub. */
export const RowLink: React.FC<{ to?: string; href?: string; onClick?: () => void; icon: React.ElementType; title: string; text?: string; badge?: React.ReactNode }> = ({ to, href, onClick, icon: Icon, title, text, badge }) => {
  const inner = (
    <>
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[14px] bg-accent/10 text-accent"><Icon size={22} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block text-[16px] font-semibold text-ink">{title}</span>{text && <span className="mt-0.5 block text-[14px] text-muted">{text}</span>}</span>
      {badge}
      <ChevronRight size={20} className="shrink-0 text-faint" aria-hidden="true" />
    </>
  );
  const cls = 'flex min-h-[68px] w-full items-center gap-4 rounded-[18px] border border-line bg-raised px-4 py-3 text-left shadow-[0_6px_18px_-16px_rgb(var(--shadow)/0.4)] transition-[transform,background-color] duration-150 hover:bg-surface active:scale-[0.99]';
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} className={cls} target="_blank" rel="noreferrer">{inner}</a>;
  return <button onClick={onClick} className={cls}>{inner}</button>;
};

/** The deep-blue card that leads to a plan or next step. */
export const PlanCard: React.FC<{ to: string; icon: React.ElementType; title: string; text: string }> = ({ to, icon: Icon, title, text }) => (
  <Link to={to} className="group flex items-center gap-4 rounded-[22px] bg-[linear-gradient(135deg,#0A2A8A,#1F6BFF)] p-5 text-white shadow-[0_18px_40px_-22px_rgba(31,107,255,0.8)]">
    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white/15"><Icon size={24} aria-hidden="true" /></span>
    <span className="min-w-0 flex-1"><span className="block text-[18px] font-bold">{title}</span><span className="mt-0.5 block text-[14px] text-white/85">{text}</span></span>
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/20 transition-transform group-hover:translate-x-0.5" aria-hidden="true"><ChevronRight size={20} /></span>
  </Link>
);

/** A small action tile (icon over a short label), in a row of four. */
export const ActionTile: React.FC<{ to?: string; href?: string; onClick?: () => void; icon: React.ElementType; label: string; busy?: boolean }> = ({ to, href, onClick, icon: Icon, label, busy }) => {
  const cls = 'flex min-h-[76px] flex-col items-center justify-center gap-1.5 rounded-[18px] border border-line bg-raised text-[14px] font-medium text-ink transition-[transform,background-color] duration-150 hover:bg-surface active:scale-[0.97] disabled:opacity-50';
  const inner = <><Icon size={22} className={busy ? 'animate-spin' : ''} aria-hidden="true" />{label}</>;
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} target="_blank" rel="noreferrer" className={cls}>{inner}</a>;
  return <button onClick={onClick} disabled={busy} className={cls}>{inner}</button>;
};
