import { colors } from '../theme';
import { MuscleGroup } from '../types';

/** The palette users can assign to muscle groups; the first entry is the app default. */
export const MUSCLE_COLOR_OPTIONS = [
  colors.primary, // acid-lime — the default, matches the rest of the app
  '#FF6B6B', // red
  '#FF9F43', // orange
  '#FECA57', // yellow
  '#1DD1A1', // teal
  '#54A0FF', // blue
  '#A55EEA', // purple
  '#FF6BCB', // pink
] as const;

/** A muscle group's accent color — the user's override, or the lime default. */
export function muscleColor(
  group: MuscleGroup,
  overrides?: Partial<Record<MuscleGroup, string>>,
): string {
  return overrides?.[group] ?? colors.primary;
}

/** Convert a #RRGGBB (or #RGB) hex color to an rgba() string with given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
