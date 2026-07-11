/** @type {import('tailwindcss').Config} */

// All colors resolve to theme.css custom properties (RGB triples), so every
// utility — including opacity modifiers like bg-forest/10 — follows the active
// theme. Legacy `white`/`gray-*` classes are mapped onto semantic tokens so the
// existing markup is theme-aware without a refactor; prefer the semantic names
// (surface, primary, muted, …) in new code.
const t = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./src/**/*.{html,tsx,ts}'],
  theme: {
    extend: {
      colors: {
        // semantic roles
        cream: t('bg-page'),
        surface: t('bg-surface'),
        primary: t('text-primary'),
        secondary: t('text-secondary'),
        muted: t('text-muted'),
        forest: t('accent'), // legacy alias: "forest" now resolves to the interactive blue
        accent: t('accent'),
        tint: t('tint'),
        'tint-fg': t('tint-fg'),
        'accent-fg': t('accent-fg'),
        danger: t('danger'),
        'danger-fg': t('danger-fg'),
        // legacy mappings (existing markup)
        white: t('bg-surface'),
        gray: {
          50: t('neutral-50'),
          100: t('neutral-100'),
          200: t('neutral-200'),
          300: t('neutral-300'),
          400: t('neutral-400'),
          500: t('neutral-500'),
          600: t('neutral-600'),
          700: t('neutral-700'),
          800: t('neutral-800'),
          900: t('neutral-900'),
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '14px',
      },
    },
  },
  plugins: [],
};
