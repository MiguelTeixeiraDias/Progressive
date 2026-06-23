import { MuscleGroup } from '../types';

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

/** Muscle visualizations stay monochrome (bone); emphasis comes from lime + borders. */
export const muscleColor = colors.text;
export const muscleColors: Record<MuscleGroup, string> = {
  Chest: muscleColor,
  Back: muscleColor,
  Shoulders: muscleColor,
  Legs: muscleColor,
  Arms: muscleColor,
  Core: muscleColor,
};
