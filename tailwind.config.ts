import type { Config } from 'tailwindcss';

/** Every value maps to a token in src/styles/theme.css. Arbitrary values are not used in components. */
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: token('surface'),
      primary: { DEFAULT: token('primary'), soft: token('primary-soft') },
      secondary: token('secondary'),
      bg: token('bg'),
      surface: { DEFAULT: token('surface'), 2: token('surface-2') },
      accent: { DEFAULT: token('accent'), soft: token('accent-soft') },
      ink: { DEFAULT: token('ink'), 2: token('ink-2') },
      line: token('line'),
      success: { DEFAULT: token('success'), soft: token('success-soft') },
      warning: { DEFAULT: token('warning'), soft: token('warning-soft') },
      danger: { DEFAULT: token('danger'), soft: token('danger-soft') },
    },
    fontFamily: {
      display: ['Manrope', 'system-ui', 'sans-serif'],
      body: ['Inter', 'system-ui', 'sans-serif'],
    },
    // Display 32 · H1 28 · H2 24 · H3 20 · Body 16 · Small 14 · Caption 12
    fontSize: {
      caption: ['0.75rem', { lineHeight: '1.4' }],
      small: ['0.875rem', { lineHeight: '1.5' }],
      body: ['1rem', { lineHeight: '1.55' }],
      h3: ['1.25rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
      h2: ['1.5rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
      h1: ['1.75rem', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
      display: ['2rem', { lineHeight: '1.15', letterSpacing: '-0.02em' }],
    },
    // Gaps and padding use the 4 px scale: 4, 8, 12, 16, 20, 24, 32, 40, 48.
    // Larger keys are component sizes (touch targets, bars, charts).
    spacing: {
      0: '0',
      px: '1px',
      0.5: '0.125rem',
      1: '0.25rem',
      2: '0.5rem',
      3: '0.75rem',
      4: '1rem',
      5: '1.25rem',
      6: '1.5rem',
      8: '2rem',
      10: '2.5rem',
      7: '1.75rem',
      11: '2.75rem', // 44 px minimum touch target
      12: '3rem',
      14: '3.5rem',
      16: '4rem',
      18: '4.5rem',
      20: '5rem',
      24: '6rem',
      28: '7rem',
      32: '8rem',
      40: '10rem',
      // component sizes (charts, illustrations, panels), not gaps
      48: '12rem',
      56: '14rem',
      60: '15rem',
      64: '16rem',
      72: '18rem',
      80: '20rem',
      96: '24rem',
      sidebar: 'var(--sidebar-w)',
      rail: 'var(--rail-w)',
      topbar: 'var(--topbar-h)',
      bottomnav: 'var(--bottomnav-h)',
    },
    borderRadius: {
      none: '0',
      sm: '0.5rem', // 8
      md: '0.75rem', // 12
      lg: '1rem', // 16
      xl: '1.25rem', // 20
      full: '999px',
    },
    extend: {
      boxShadow: { card: 'var(--shadow-card)', raised: 'var(--shadow-raised)' },
      maxWidth: { content: '80rem', prose: '42rem', dialog: '32rem' },
      screens: { xs: '390px' },
    },
  },
  plugins: [],
} satisfies Config;
