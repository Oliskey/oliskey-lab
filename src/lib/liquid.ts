// Liquid Glass for the web, from the owner's Frontend Skills (oliskey-liquid-glass.reference.md, proven in Fleet and Alpha).
// A web approximation of Apple's material: refraction maps (Chromium only) plus a rim-light map in every browser.
import { useCallback, useLayoutEffect, useRef, type RefObject } from 'react';

/**
 * Liquid Glass, built like a real lens (after kube.io's "Liquid Glass in the browser").
 *
 * Each glass element gets two maps made for its exact size:
 *  - a refraction map: the rim is a convex "squircle" bevel; for each point we follow a straight-down ray
 *    through it with Snell's law (glass n = 1.5) and record how far sideways it lands. The backdrop is then
 *    shifted by that amount (feDisplacementMap), so content bends and magnifies at the edge and the centre
 *    stays clear. Chromium only (backdrop-filter with an SVG filter; html[data-refract] set by theme.js).
 *  - a rim-light map: a bright edge where the bevel faces the light (top-left), drawn as a background
 *    layer, so it shows in every browser.
 * Maps are rebuilt when the element changes size.
 */

const N = 1.5; // index of refraction of glass

/** Height of a convex squircle bevel at x ∈ [0, 1] (0 = outer edge, 1 = where the flat top starts). */
const squircle = (x: number) => Math.pow(1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4), 0.25);

/** Sideways shift of a vertical ray across the bevel, sampled at 128 points, normalised to a peak of 1. */
function refractionProfile(thicknessPx: number, bezelPx: number) {
  const out = new Float32Array(128);
  let max = 0;
  for (let i = 0; i < 128; i++) {
    const x = (i + 0.5) / 128;
    const d = 0.001;
    const slope = ((squircle(x + d) - squircle(x - d)) / (2 * d)) * (thicknessPx / bezelPx);
    const t1 = Math.atan(slope); // angle between the ray and the surface normal
    const t2 = Math.asin(Math.sin(t1) / N);
    const shift = thicknessPx * squircle(x) * Math.tan(t1 - t2); // depth travelled × sideways angle
    out[i] = shift;
    max = Math.max(max, shift);
  }
  for (let i = 0; i < 128; i++) out[i] = max ? out[i]! / max : 0;
  return { profile: out, maxShift: max };
}

/** Signed distance to a rounded rectangle (negative inside) and the outward normal at that point. */
function roundedRect(px: number, py: number, hw: number, hh: number, r: number) {
  const qx = Math.abs(px) - (hw - r);
  const qy = Math.abs(py) - (hh - r);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const outside = Math.hypot(ox, oy);
  const dist = outside + Math.min(Math.max(qx, qy), 0) - r;
  let nx: number, ny: number;
  if (qx > 0 && qy > 0) { nx = ox / outside; ny = oy / outside; }
  else if (qx > qy) { nx = 1; ny = 0; }
  else { nx = 0; ny = 1; }
  return { dist, nx: nx * Math.sign(px || 1), ny: ny * Math.sign(py || 1) };
}

export interface GlassShape {
  /** Corner radius in px, or 'pill' for fully round ends. */
  radius: number | 'pill';
  /** Width of the curved rim in px. */
  bezel?: number;
  /** Optical thickness in px: thicker glass bends more. */
  thickness?: number;
  /** Strength of the bend, 0–1. */
  strength?: number;
  /** Brightness of the rim light, 0–1. */
  shine?: number;
}

function buildMaps(w: number, h: number, shape: Required<GlassShape>) {
  const r = shape.radius === 'pill' ? Math.min(w, h) / 2 : Math.min(shape.radius, w / 2, h / 2);
  const bezel = Math.max(4, Math.min(shape.bezel, r, Math.min(w, h) / 2));
  const { profile, maxShift } = refractionProfile(shape.thickness, bezel);
  const disp = document.createElement('canvas');
  const spec = document.createElement('canvas');
  disp.width = spec.width = w;
  disp.height = spec.height = h;
  const dctx = disp.getContext('2d')!, sctx = spec.getContext('2d')!;
  const dimg = dctx.createImageData(w, h), simg = sctx.createImageData(w, h);
  // Light from the top-left (screen y points down).
  const lx = -0.62, ly = -0.78;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const { dist, nx, ny } = roundedRect(x + 0.5 - w / 2, y + 0.5 - h / 2, w / 2, h / 2, r);
      const inside = -dist;
      const k = (y * w + x) * 4;
      let vx = 0, vy = 0, light = 0;
      if (inside >= 0 && inside < bezel) {
        const t = inside / bezel;
        const m = profile[Math.min(127, Math.floor(t * 128))]!;
        // Look inward: the rim shows what lies a little further in, so content swells at the edge like a lens.
        vx = -nx * m;
        vy = -ny * m;
        const facing = Math.max(0, nx * lx + ny * ly); // rim facing the light
        const back = Math.max(0, -(nx * lx + ny * ly)); // the far rim catches a little reflected light
        const edge = Math.pow(1 - t, 2.2);
        light = Math.min(1, edge * (0.95 * Math.pow(facing, 1.6) + 0.35 * Math.pow(back, 2) + 0.18));
      }
      dimg.data[k] = 128 + vx * 127;
      dimg.data[k + 1] = 128 + vy * 127;
      dimg.data[k + 2] = 128;
      dimg.data[k + 3] = 255;
      simg.data[k] = simg.data[k + 1] = simg.data[k + 2] = 255;
      simg.data[k + 3] = Math.round(light * 255 * shape.shine);
    }
  }
  dctx.putImageData(dimg, 0, 0);
  sctx.putImageData(simg, 0, 0);
  // feDisplacementMap shifts by scale × (channel − 0.5), so a full channel (±127) moves by about scale / 2.
  return { disp: disp.toDataURL('image/png'), spec: spec.toDataURL('image/png'), scale: 2 * maxShift * shape.strength };
}

let host: SVGSVGElement | null = null;
let seq = 0;
function filterHost() {
  if (host?.isConnected) return host;
  host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  host.setAttribute('aria-hidden', 'true');
  host.setAttribute('width', '0');
  host.setAttribute('height', '0');
  host.style.cssText = 'position:absolute;width:0;height:0;pointer-events:none';
  document.body.appendChild(host);
  return host;
}

function setFilter(id: string, w: number, h: number, dispUrl: string, scale: number) {
  const ns = 'http://www.w3.org/2000/svg';
  let f = document.getElementById(id) as SVGFilterElement | null;
  if (!f) {
    f = document.createElementNS(ns, 'filter') as SVGFilterElement;
    f.id = id;
    f.setAttribute('color-interpolation-filters', 'sRGB');
    f.setAttribute('filterUnits', 'userSpaceOnUse');
    f.setAttribute('primitiveUnits', 'userSpaceOnUse');
    const img = document.createElementNS(ns, 'feImage');
    img.setAttribute('result', 'map');
    img.setAttribute('preserveAspectRatio', 'none');
    const dm = document.createElementNS(ns, 'feDisplacementMap');
    dm.setAttribute('in', 'SourceGraphic');
    dm.setAttribute('in2', 'map');
    dm.setAttribute('xChannelSelector', 'R');
    dm.setAttribute('yChannelSelector', 'G');
    f.append(img, dm);
    filterHost().appendChild(f);
  }
  for (const [k, v] of Object.entries({ x: '0', y: '0', width: String(w), height: String(h) })) f.setAttribute(k, v);
  const img = f.firstElementChild!, dm = f.lastElementChild!;
  for (const [k, v] of Object.entries({ x: '0', y: '0', width: String(w), height: String(h) })) img.setAttribute(k, v);
  img.setAttribute('href', dispUrl);
  dm.setAttribute('scale', scale.toFixed(1));
}

/** Attach to a `glass` / `glass-lens` element: it gets refraction and rim light made for its size. */
export function useLiquidGlass<T extends HTMLElement>(shape: GlassShape) {
  const cleanup = useRef<() => void>();
  const opts = useRef(shape);
  opts.current = shape;
  return useCallback((el: T | null) => {
    cleanup.current?.();
    cleanup.current = undefined;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const id = `lg-${++seq}`;
    const refract = document.documentElement.dataset.refract === '1';
    let last = '';
    let frame = 0;
    const apply = () => {
      const w = Math.round(el.offsetWidth), h = Math.round(el.offsetHeight);
      if (w < 8 || h < 8 || `${w}x${h}` === last) return;
      last = `${w}x${h}`;
      const o = { bezel: 18, thickness: 22, strength: 1, shine: 1, ...opts.current };
      const maps = buildMaps(w, h, o as Required<GlassShape>);
      el.style.setProperty('--lg-rim-light', `url("${maps.spec}")`);
      if (refract) {
        setFilter(id, w, h, maps.disp, maps.scale);
        el.style.setProperty('--glass-filter', `url(#${id}) blur(var(--lg-blur)) saturate(var(--lg-saturate)) brightness(var(--lg-bright))`);
        el.style.setProperty('--lens-filter', `url(#${id}) blur(0.4px) saturate(150%) brightness(1.06)`);
      }
    };
    // While the element is changing size (e.g. the tab bar shrinking), show plain clear glass and rebuild the
    // maps once it has settled: rebuilding every frame would stutter.
    let settle = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      if (!last) {
        frame = requestAnimationFrame(apply);
        return;
      }
      if (refract) el.style.setProperty('--glass-filter', 'blur(var(--lg-blur)) saturate(var(--lg-saturate)) brightness(var(--lg-bright))');
      settle = window.setTimeout(() => (frame = requestAnimationFrame(apply)), 160);
    });
    ro.observe(el);
    apply();
    cleanup.current = () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      document.getElementById(id)?.remove();
    };
  }, []);
}

/** Bending the backdrop with backdrop-filter:url() works only in Chromium; Firefox's @supports lies, so detect by brand. */
export function detectRefraction() {
  try {
    const brands = (navigator as unknown as { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands || [];
    const chromium = brands.some((b) => /Chromium|Google Chrome|Microsoft Edge/.test(b.brand));
    const reduceT = matchMedia('(prefers-reduced-transparency: reduce)').matches;
    if (chromium && !reduceT) document.documentElement.dataset.refract = '1';
  } catch { /* plain frosted glass */ }
}

const reducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * A drop behind the selected item of a group (rail, sidebar, segmented control). It is measured against the group
 * itself (bounding rects, not offsetTop, which is wrong inside transformed layers) and glides with a short stretch.
 * Put the returned ref on an absolutely positioned element inside the (position: relative) group.
 */
export function useSlidingDrop<T extends HTMLElement>(group: RefObject<HTMLElement | null>, selector: string, choice: unknown, ms = 420) {
  const drop = useRef<T>(null);
  const prev = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const place = (animate: boolean) => {
      const g = group.current, d = drop.current;
      if (!g || !d) return;
      const el = g.querySelector<HTMLElement>(selector);
      if (!el) { d.style.opacity = '0'; prev.current = null; return; }
      const gr = g.getBoundingClientRect(), er = el.getBoundingClientRect();
      const b = { x: er.left - gr.left + g.scrollLeft, y: er.top - gr.top + g.scrollTop, w: el.offsetWidth, h: el.offsetHeight };
      const a = prev.current; prev.current = b;
      Object.assign(d.style, { width: `${b.w}px`, height: `${b.h}px`, transform: `translate3d(${b.x}px,${b.y}px,0)`, opacity: '1' });
      if (!animate || !a || reducedMotion() || (a.x === b.x && a.y === b.y)) return;
      const vertical = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      const mid = vertical
        ? { transform: `translate3d(${(a.x + b.x) / 2}px,${(a.y + b.y) / 2}px,0) scaleX(0.94) scaleY(1.06)` }
        : { transform: `translate3d(${(a.x + b.x) / 2}px,${(a.y + b.y) / 2}px,0) scaleY(0.92)`, width: `${(a.w + b.w) / 2 + Math.min(Math.abs(b.x - a.x) * 0.4, b.w)}px` };
      d.animate([
        { transform: `translate3d(${a.x}px,${a.y}px,0)`, width: `${a.w}px`, height: `${a.h}px` },
        { ...mid, offset: 0.45 },
        { transform: `translate3d(${b.x}px,${b.y}px,0)`, width: `${b.w}px`, height: `${b.h}px` },
      ], { duration: ms, easing: 'cubic-bezier(.32,.72,0,1)' });
    };
    place(true);
    const g = group.current;
    if (!g || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => place(false));
    ro.observe(g);
    return () => ro.disconnect();
  }, [group, selector, choice, ms]);
  return drop;
}
