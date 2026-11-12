import React, { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLiquidGlass } from '../lib/liquid';
import { HUBS } from './nav';

/**
 * The phone navigation (Frontend Skills §33.3, §34, §35.3):
 *  - four tabs in ONE liquid glass pill, and More as its own round glass button beside it (they rest apart, 10px);
 *  - the selection is a neutral glass drop that glides to the tapped tab (420ms, iOS deceleration curve);
 *  - scrolling down folds the bar IN PROPORTION to the scroll (one screen = fully folded; up reverses at the same
 *    rate; top always open, bottom always folded). Other tabs are absorbed farthest first, and the pill becomes one
 *    round drop in the centre showing the current icon. It settles in the scroll direction after 160ms of stillness;
 *  - while it moves, a liquid layer (gooey filter) joins the pill and More with a neck that thins and snaps;
 *  - layers are siblings: empty glass, then the drop, then icons and labels (a drop nested in glass cannot bend);
 *  - only transform and opacity animate on the items; the glass shape changes width on one isolated element with the
 *    light filter while moving (data-moving), and its maps are rebuilt once it rests.
 *  The open layout is plain CSS so it is correct before any script runs. Reduce Motion: no fold, no stretch.
 */
const BAR = 64, INSET = 5, GAP = 10, SIDE = 16;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export const TabBar: React.FC<{ hub: string }> = ({ hub }) => {
  const tabs = HUBS.filter((h) => h.to !== '/app/more');
  const more = HUBS.find((h) => h.to === '/app/more')!;
  const activeIdx = tabs.findIndex((t) => t.to === hub);

  const navRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLSpanElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const gooA = useRef<HTMLElement>(null);
  const gooB = useRef<HTMLElement>(null);
  const gooRef = useRef<HTMLDivElement>(null);
  const pillGlass = useLiquidGlass<HTMLDivElement>({ radius: 'pill', bezel: 24, thickness: 40 });
  const moreGlass = useLiquidGlass<HTMLDivElement>({ radius: 'pill', bezel: 22, thickness: 36 });
  const setPill = useCallback((el: HTMLDivElement | null) => { pillRef.current = el; pillGlass(el); }, [pillGlass]);

  // live values kept in refs, so the scroll handler keeps one identity (§31.3)
  const st = useRef({ p: 0, w: 0, active: activeIdx, boxes: [] as { x: number; w: number }[], anim: 0, settle: 0, lastY: 0, dir: 1 });
  st.current.active = activeIdx;

  /** draw the bar for fold progress p (0 open … 1 folded) */
  const draw = useCallback((p: number) => {
    const s = st.current; s.p = p;
    const nav = navRef.current, pill = pillRef.current, list = listRef.current, lens = lensRef.current;
    if (!nav || !pill || !list || !lens || !s.w) return;
    const W0 = s.w - SIDE * 2 - BAR - GAP;                // open pill width
    const cx = s.w / 2;                                    // folded drop centre
    const e = ease(p);
    const left = SIDE + (cx - BAR / 2 - SIDE) * e;
    const width = W0 + (BAR - W0) * e;
    pill.style.left = `${left}px`; pill.style.width = `${width}px`;
    if (p > 0.001 && p < 0.999) nav.setAttribute('data-moving', ''); else nav.removeAttribute('data-moving');

    const a = s.boxes[s.active];
    const tx = a ? (cx - (SIDE + a.x + a.w / 2)) * e : 0;
    list.style.transform = `translate3d(${tx}px,0,0)`;
    // clip the items to the glass shape, in the list's own coordinates
    const l = left - SIDE - tx, r = W0 - (l + width);
    list.style.clipPath = p > 0.001 ? `inset(0 ${Math.max(0, r)}px 0 ${Math.max(0, l)}px round ${BAR / 2}px)` : '';
    const items = list.children;
    const order = s.boxes.map((_, i) => i).filter((i) => i !== s.active).sort((i, j) => Math.abs(j - s.active) - Math.abs(i - s.active));
    order.forEach((i, rank) => { const o = 1 - clamp((p - rank * 0.16) / 0.3); (items[i] as HTMLElement).style.opacity = String(o); });
    const act = items[s.active] as HTMLElement | undefined;
    if (act) {
      act.style.opacity = '1';
      const lab = act.querySelector<HTMLElement>('[data-label]'), ico = act.querySelector<HTMLElement>('[data-icon]');
      const lf = clamp((p - 0.55) / 0.3);
      if (lab) lab.style.opacity = String(1 - lf);
      if (ico) ico.style.transform = `translate3d(0,${8 * lf}px,0)`;
    }
    // the drop follows the current tab and becomes a round drop inside the folded circle (concentric inset)
    if (a && !lens.getAnimations().length) {
      const lw = (a.w) + (BAR - INSET * 2 - a.w) * e;
      lens.style.width = `${lw}px`;
      lens.style.transform = `translate3d(${SIDE + a.x + a.w / 2 - lw / 2 + tx}px,0,0)`;
    }
    // liquid layer: copies of the two shapes reach out while moving, so they fuse; the neck thins and snaps as the gap grows
    const goo = gooRef.current, ga = gooA.current, gb = gooB.current;
    if (goo && ga && gb) {
      const moving = p > 0.001 && p < 0.999;
      // the copies reach only towards each other, so nothing pokes out beside the glass
      const reach = moving ? 12 : -6;
      const moreLeft = s.w - SIDE - BAR;
      ga.style.cssText = `left:${30 + left + 4}px;top:${30 + 4}px;width:${Math.max(0, width - 8 + reach)}px;height:${BAR - 8}px`;
      gb.style.cssText = `left:${30 + moreLeft + 4 - reach}px;top:${30 + 4}px;width:${BAR - 8 + reach}px;height:${BAR - 8}px`;
      goo.style.opacity = moving ? String(0.5 * Math.min(1, p * 10, (1 - p) * 10)) : '0';
    }
  }, []);

  const measure = useCallback(() => {
    const s = st.current, wrap = wrapRef.current, list = listRef.current;
    if (!wrap || !list) return;
    s.w = wrap.clientWidth;
    // measure the link inside each item (inset 5px from the pill: a concentric drop), in the list's own unscaled coordinates
    s.boxes = Array.from(list.children).map((li) => { const a = li.firstElementChild as HTMLElement; return { x: a.offsetLeft, w: a.offsetWidth }; });
    draw(s.p);
  }, [draw]);

  useLayoutEffect(() => {
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (wrapRef.current) ro?.observe(wrapRef.current);
    document.fonts?.ready.then(measure).catch(() => undefined);
    return () => ro?.disconnect();
  }, [measure]);

  /** animate p to a target (settle, tap to open) */
  const to = useCallback((target: number, ms = 380) => {
    const s = st.current; cancelAnimationFrame(s.anim);
    const from = s.p, t0 = performance.now();
    const step = (t: number) => { const k = clamp((t - t0) / ms); draw(from + (target - from) * (1 - Math.pow(1 - k, 3))); if (k < 1) s.anim = requestAnimationFrame(step); };
    s.anim = requestAnimationFrame(step);
  }, [draw]);

  // scroll drives the fold (proportional, follows the finger, never moves the page)
  useEffect(() => {
    const s = st.current; s.lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY, dy = y - s.lastY; s.lastY = y;
        if (reduced() || st.current.active < 0) { if (s.p) draw(0); return; }
        const max = document.documentElement.scrollHeight - innerHeight;
        if (max < 40) { if (s.p) draw(0); return; }
        cancelAnimationFrame(s.anim);
        const dist = Math.max(200, Math.min(innerHeight, max));
        if (dy) s.dir = dy > 0 ? 1 : -1;
        let p = clamp(s.p + dy / dist);
        if (y <= 2) p = 0; else if (y >= max - 2) p = 1;
        draw(p);
        window.clearTimeout(s.settle);
        s.settle = window.setTimeout(() => { if (s.p > 0 && s.p < 1) to(window.scrollY <= 2 ? 0 : s.dir > 0 ? 1 : 0); }, 160);
      });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(frame); window.clearTimeout(s.settle); };
  }, [draw, to]);

  // a new page starts at the top, so the bar opens; the drop glides to the new tab with a gentle squash
  const prevIdx = useRef(activeIdx);
  useLayoutEffect(() => {
    const s = st.current, lens = lensRef.current, from = s.boxes[prevIdx.current], dest = s.boxes[activeIdx];
    prevIdx.current = activeIdx;
    cancelAnimationFrame(s.anim); draw(0);
    if (!lens || !from || !dest || from === dest || reduced()) return;
    const x0 = SIDE + from.x, x1 = SIDE + dest.x;
    const midW = (from.w + dest.w) / 2 + Math.min(Math.abs(x1 - x0) * 0.35, dest.w * 0.6);
    lens.animate([
      { transform: `translate3d(${x0}px,0,0)`, width: `${from.w}px` },
      { transform: `translate3d(${(x0 + x1) / 2 - (midW - (from.w + dest.w) / 2) / 2}px,0,0) scaleY(0.93)`, width: `${midW}px`, offset: 0.45 },
      { transform: `translate3d(${x1}px,0,0) scaleY(1.03)`, width: `${dest.w}px`, offset: 0.8 },
      { transform: `translate3d(${x1}px,0,0)`, width: `${dest.w}px` },
    ], { duration: 420, easing: 'cubic-bezier(.32,.72,0,1)' }).finished.then(() => draw(st.current.p)).catch(() => undefined);
    try { navigator.vibrate?.(8); } catch { /* no web haptics on iOS */ }
  }, [activeIdx, draw]);

  const onTab = (i: number) => (e: React.MouseEvent) => {
    // folded: tapping the drop opens the bar instead of navigating
    if (st.current.p > 0.5 && i === activeIdx) { e.preventDefault(); to(0); }
  };
  const moreOn = hub === more.to;

  return (
    <nav ref={navRef} data-tabbar aria-label="Main" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 md:hidden" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <filter id="lg-goo" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="b" />
          <feColorMatrix in="b" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -9" />
        </filter>
      </svg>
      <div ref={wrapRef} className="lg-press relative mx-auto h-[64px] max-w-[480px]">
        {/* 0. liquid layer (only while moving) */}
        <div ref={gooRef} className="lg-goo" style={{ opacity: 0 }} aria-hidden="true"><i ref={gooA as React.Ref<HTMLElement>} /><i ref={gooB as React.Ref<HTMLElement>} /></div>
        {/* 1. empty glass */}
        <div ref={setPill} className="lg pointer-events-auto top-0 h-[64px]" style={{ left: SIDE, right: SIDE + BAR + GAP }} aria-hidden="true" />
        <div ref={moreGlass} className="lg pointer-events-auto top-0 h-[64px] w-[64px]" style={{ right: SIDE }} aria-hidden="true" />
        {/* 2. the selected drop */}
        <span ref={lensRef} className="lg-lens left-0 top-[5px] h-[54px]" style={{ opacity: activeIdx < 0 ? 0 : 1 }} aria-hidden="true" />
        {moreOn && <span className="lg-lens h-[54px] w-[54px]" style={{ right: SIDE + INSET, top: INSET }} aria-hidden="true" />}
        {/* 3. icons and labels */}
        <ul ref={listRef} className="glass-ink pointer-events-auto absolute top-0 flex h-[64px] will-change-transform" style={{ left: SIDE, right: SIDE + BAR + GAP }}>
          {tabs.map((t, i) => { const on = i === activeIdx; return (
            <li key={t.to} className="flex flex-1 justify-center px-[5px]">
              <Link to={t.to} onClick={onTab(i)} aria-current={on ? 'page' : undefined}
                className={`lg-item flex h-[64px] w-full flex-col items-center justify-center gap-[3px] text-[11px] font-semibold ${on ? 'text-accent-ink' : 'text-ink'}`}>
                <span data-icon className="block"><t.icon size={23} strokeWidth={2.15} aria-hidden="true" /></span>
                <span data-label className="leading-none">{t.label}</span>
              </Link>
            </li>
          ); })}
        </ul>
        <Link to={more.to} aria-current={moreOn ? 'page' : undefined} aria-label={more.label}
          className={`lg-item glass-ink pointer-events-auto absolute top-0 grid h-[64px] w-[64px] place-items-center ${moreOn ? 'text-accent-ink' : 'text-ink'}`} style={{ right: SIDE }}>
          <span className="flex flex-col items-center gap-[3px] text-[11px] font-semibold"><more.icon size={23} strokeWidth={2.15} aria-hidden="true" /><span className="leading-none">{more.label}</span></span>
        </Link>
      </div>
    </nav>
  );
};
