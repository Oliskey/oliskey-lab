# Oliskey Lab design system (decision record)

Source rules: `Frontend Skills/` (copied from the Alpha repo). Read them before any UI change.

## Approved patterns (2026-11)
- **Dark mode**: pure black page (#000), cards #0E0E10 with a #26262A hairline, inputs #1A1A1D; depth from lighter surfaces, not shadows. Muted text #A0A0A8, faint #8C8C96. Brighter accent (#4D94FF) and status colours in dark.
- **Phone navigation** (`src/app/TabBar.tsx`): four tabs in one liquid glass pill plus a separate round More, resting 10px apart. Neutral glass selection drop, concentric 5px inset, glides 420ms on cubic-bezier(.32,.72,0,1). Scroll folds the bar in proportion (one screen = folded; top open, bottom folded); tabs are absorbed farthest first into one centred round drop showing the icon. A gooey liquid layer joins pill and More while moving. Tap the folded drop to reopen. Reduce Motion: no fold.
- **Tablet rail / desktop sidebar** (`src/app/Shell.tsx`): floating glass capsules (radius 28, 12px from the edges); the selected item is a vivid accent drop that slides (`useSlidingDrop`).
- **Glass** (`.lg` in `src/index.css`, `useLiquidGlass` in `src/lib/liquid.ts`): near-clear body, thin top-bright ring with two glints, faint chromatic fringe, rim-light map per element; refraction map on Chromium only (`html[data-refract]`). Light filter and no rim image while moving.
- **Segmented controls**: one track, one drop gliding under the choice, chosen label in the accent at the same weight; no backdrop filter (inside the scrolling page).
- **Touch**: navigation press 0.96 for 120ms; no hover effects on navigation.
