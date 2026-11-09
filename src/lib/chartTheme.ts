/** Chart colours read the same CSS tokens as Tailwind, so charts follow the design system. */
const v = (name: string, alpha?: number) => (alpha === undefined ? `rgb(var(--c-${name}))` : `rgb(var(--c-${name}) / ${alpha})`);

export const chart = {
  primary: v('primary'),
  primarySoft: v('primary-soft'),
  secondary: v('secondary'),
  accent: v('accent'),
  ink: v('ink'),
  ink2: v('ink-2'),
  line: v('line'),
  surface: v('surface'),
  danger: v('danger'),
  warning: v('warning'),
  success: v('success'),
  grid: v('line', 0.8),
  tick: { fill: v('ink-2'), fontSize: 12, fontFamily: 'Inter' },
  tooltip: {
    contentStyle: { borderRadius: 12, border: `1px solid ${v('line')}`, boxShadow: 'var(--shadow-card)', fontFamily: 'Inter', fontSize: 14, color: v('ink') },
    labelStyle: { fontWeight: 600, color: v('ink') },
  },
};
