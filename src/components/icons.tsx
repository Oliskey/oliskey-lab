// Premium icons. Duo: a bold two-tone icon (gradient outline with a soft gradient fill) built on Lucide, so every icon in
// the app shares one style. Brand: real platform marks from Simple Icons (CC0), shown only to name a platform you connect.
import React from 'react';
import { siFacebook, siGoogle, siInstagram, siTiktok, siWhatsapp, siYoutube } from 'simple-icons';
import { Linkedin } from 'lucide-react';
import type { SocialPlatform } from '../../shared/types';

export type Hue = 'blue' | 'violet' | 'teal' | 'amber' | 'rose' | 'green';
const HUES: Record<Hue, [string, string]> = {
  blue: ['#1F6BFF', '#5AA2FF'], violet: ['#7C5CFF', '#B794FF'], teal: ['#0EA5B7', '#4FD1C5'],
  amber: ['#F59E0B', '#FBBF24'], rose: ['#F43F5E', '#FB7185'], green: ['#10B981', '#34D399'],
};

/** One set of gradient definitions for the whole page (mounted once in the app shell). */
export const IconDefs: React.FC = () => (
  <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
    <defs>
      {(Object.keys(HUES) as Hue[]).map((h) => (
        <React.Fragment key={h}>
          <linearGradient id={`duo-s-${h}`} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" stopColor={HUES[h][0]} /><stop offset="1" stopColor={HUES[h][1]} /></linearGradient>
          <linearGradient id={`duo-f-${h}`} gradientUnits="userSpaceOnUse" x1="2" y1="2" x2="22" y2="22"><stop offset="0" stopColor={HUES[h][0]} stopOpacity="0.28" /><stop offset="1" stopColor={HUES[h][1]} stopOpacity="0.14" /></linearGradient>
        </React.Fragment>
      ))}
    </defs>
  </svg>
);

export const Duo: React.FC<{ icon: React.ElementType; size?: number; hue?: Hue; className?: string }> = ({ icon: Icon, size = 26, hue = 'blue', className = '' }) => (
  <Icon size={size} strokeWidth={2.1} stroke={`url(#duo-s-${hue})`} fill={`url(#duo-f-${hue})`} className={className} aria-hidden="true" />
);

/** A soft tinted square holding a two-tone icon, for list rows and tiles. */
export const IconBadge: React.FC<{ icon: React.ElementType; hue?: Hue; size?: 'md' | 'lg' }> = ({ icon, hue = 'blue', size = 'md' }) => (
  <span className={`grid shrink-0 place-items-center rounded-[14px] ${size === 'lg' ? 'h-12 w-12' : 'h-11 w-11'}`} style={{ background: `linear-gradient(145deg, ${HUES[hue][0]}1F, ${HUES[hue][1]}12)` }}>
    <Duo icon={icon} hue={hue} size={size === 'lg' ? 26 : 23} />
  </span>
);

const BRANDS: Partial<Record<SocialPlatform, { path: string; hex: string }>> = {
  facebook: siFacebook, instagram: siInstagram, tiktok: siTiktok, youtube: siYoutube, whatsapp: siWhatsapp, google: siGoogle,
};
export const brandColor = (p: SocialPlatform) => (p === 'linkedin' ? '#0A66C2' : `#${BRANDS[p]?.hex}`);

/** A platform's mark in white on its own colour, in a rounded tile. Greyed when not connected. */
export const BrandTile: React.FC<{ platform: SocialPlatform; size?: number; muted?: boolean }> = ({ platform, size = 52, muted }) => {
  const b = BRANDS[platform];
  const bg = muted ? 'rgb(var(--ink) / 0.06)' : brandColor(platform);
  const fg = muted ? 'rgb(var(--faint))' : '#fff';
  return (
    <span className="grid shrink-0 place-items-center rounded-[16px] shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]" style={{ width: size, height: size, background: bg }}>
      {b ? <svg viewBox="0 0 24 24" width={size * 0.5} height={size * 0.5} fill={fg} aria-hidden="true"><path d={b.path} /></svg> : <Linkedin size={size * 0.5} color={fg} fill={fg} strokeWidth={0} aria-hidden="true" />}
    </span>
  );
};
