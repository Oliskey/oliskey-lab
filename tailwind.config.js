/** Oliskey Lab tokens: the same names and values as oliskey.com, so the products feel like one family.
 *  Colours come from CSS variables (src/index.css) so light and dark share one set of names. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`;
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}', './shared/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', 'sans-serif'] },
      colors: {
        page: v('page'), surface: v('surface'), raised: v('raised'), line: v('line'),
        ink: v('ink'), muted: v('muted'), faint: v('faint'),
        accent: v('accent'), 'accent-ink': v('accent-ink'), 'on-accent': v('on-accent'),
        good: v('good'), warn: v('warn'), bad: v('bad'),
        navy: '#0A1A3A', electric: '#1F6BFF',
      },
      fontSize: {
        // semantic type scale: page title, section title, card title, body, secondary, label, caption
        page: ['clamp(1.75rem, 2.6vw, 2.25rem)', { lineHeight: '1.12', letterSpacing: '-0.025em', fontWeight: '700' }],
        section: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.015em', fontWeight: '650' }],
        card: ['1.0625rem', { lineHeight: '1.35', letterSpacing: '-0.01em', fontWeight: '600' }],
        body: ['0.9375rem', { lineHeight: '1.55' }],
        small: ['0.875rem', { lineHeight: '1.5' }],
        caption: ['0.8125rem', { lineHeight: '1.45' }],
        stat: ['1.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em', fontWeight: '700' }],
      },
      borderRadius: { card: '18px', control: '999px', field: '12px' },
      transitionTimingFunction: { glide: 'cubic-bezier(0.32,0.72,0,1)', respond: 'cubic-bezier(0.2,0.8,0.2,1)', exit: 'cubic-bezier(0.3,0,0.8,0.15)' },
      maxWidth: { page: '1200px', read: '680px', form: '440px' },
    },
  },
  plugins: [],
};
