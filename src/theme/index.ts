import type { TextStyle } from 'react-native';

/**
 * Strict three-color system for "Progressive": a near-black training-journal
 * surface, an acid-lime performance accent used sparingly for actions/progress,
 * and a warm bone off-white for text, headings and hairline borders.
 * Everything else is a tonal variation of these three.
 */
export const colors = {
  // Surfaces (tonal steps of the near-black primary)
  bg: '#0B0F14',
  bgElevated: '#0E1319',
  card: '#121821',
  card2: '#1A222D',
  card3: '#2A3441',

  // Acid-lime — key actions, completed states, progress + metric emphasis ONLY
  primary: '#D6FF3F',
  primaryDim: 'rgba(214,255,63,0.12)',
  primarySoft: 'rgba(214,255,63,0.20)',

  // Bone / off-white — primary text, headings, borders, editorial contrast
  secondary: '#E8E2D6', // alias kept so "secondary emphasis" reads as bone, not a new hue
  text: '#E8E2D6',
  textDim: 'rgba(232,226,214,0.62)',
  textFaint: 'rgba(232,226,214,0.38)',

  border: 'rgba(232,226,214,0.12)',
  borderStrong: 'rgba(232,226,214,0.28)',

  // Mapped onto the palette so no extra accent colors leak in
  warning: '#E8E2D6',
  gold: '#D6FF3F',
  danger: 'rgba(232,226,214,0.70)',
  dangerDim: 'rgba(232,226,214,0.06)',

  overlay: 'rgba(7,10,14,0.78)',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 40,
} as const;

/** Width thresholds used to switch between phone, tablet and desktop layouts. */
export const breakpoints = {
  tablet: 768,
  desktop: 1024,
} as const;

/** Desktop/web layout constants — capped content widths and the sidebar rail. */
export const layout = {
  maxContentWidth: 1440,
  formMaxWidth: 560,
  sidebarWidth: 248,
} as const;

/** Sharp, deliberate corners — 4px controls, 8px cards. */
export const radius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 8,
  xl: 8,
  pill: 999,
} as const;

export const font = {
  display: 40,
  h1: 30,
  h2: 24,
  h3: 19,
  lg: 16,
  body: 15,
  label: 13,
  small: 12,
  tiny: 11,
} as const;

/** Bebas Neue for athletic display/metrics; Space Grotesk for everything else. */
export const family = {
  display: 'BebasNeue_400Regular',
  body: 'SpaceGrotesk_400Regular',
  medium: 'SpaceGrotesk_500Medium',
  semibold: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
} as const;

/**
 * Single source of truth for Bebas Neue display type. Bebas caps sit high in the
 * em box, so with `includeFontPadding: false` (which we want for tight layout) a
 * lineHeight at or below the font size clips the tops of letters and numbers.
 * A ~1.15x line box guarantees headroom for ascenders without dead space — use
 * this for every large heading / KPI number instead of hand-tuning lineHeight.
 */
export function displayText(size: number, letterSpacing = 0): TextStyle {
  return {
    fontFamily: family.display,
    fontSize: size,
    lineHeight: Math.ceil(size * 1.15),
    letterSpacing,
    includeFontPadding: false,
  };
}

