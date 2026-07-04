import { UnitPreference } from '../types';

export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

// ---------------------------------------------------------------------------
// Units — weights are stored canonically in kilograms and converted to the
// user's preferred unit only at the display/input boundary.
// ---------------------------------------------------------------------------

const LB_PER_KG = 2.2046226218;

/** Canonical kg → the user's display unit. */
export function kgToUnit(kg: number, unit: UnitPreference): number {
  return unit === 'lb' ? kg * LB_PER_KG : kg;
}

/** A value entered in the user's unit → canonical kg for storage. */
export function unitToKg(value: number, unit: UnitPreference): number {
  return unit === 'lb' ? value / LB_PER_KG : value;
}

/** Increment used by weight steppers, in the display unit (5 lb / 2.5 kg). */
export function weightStep(unit: UnitPreference): number {
  return unit === 'lb' ? 5 : 2.5;
}

/** Lowercase unit label, e.g. "kg" / "lb". */
export function unitLabel(unit: UnitPreference): string {
  return unit;
}

/** Compact volume display: 12,540 -> "12.5k". Converts kg to the given unit. */
export function formatVolume(kg: number, unit: UnitPreference = 'kg'): string {
  const v = kgToUnit(kg, unit);
  if (v >= 100_000) return `${(v / 1000).toFixed(0)}k`;
  if (v >= 10_000) return `${(v / 1000).toFixed(1)}k`;
  return formatNumber(v);
}

/**
 * Weight in the user's unit, trailing ".0" dropped (60.0 -> "60", 62.5 -> "62.5").
 * Defaults to kg so existing single-argument callers keep their behaviour.
 */
export function formatWeight(kg: number, unit: UnitPreference = 'kg'): string {
  const r = Math.round(kgToUnit(kg, unit) * 10) / 10;
  return `${r}`;
}

/** Human duration: "45:12" under an hour, "1h 05m" above. */
export function formatDuration(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${`${m}`.padStart(2, '0')}m`;
  return `${m}:${`${ss}`.padStart(2, '0')}`;
}

/** Always mm:ss — used for the live workout timer. */
export function formatClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${`${m}`.padStart(2, '0')}:${`${ss}`.padStart(2, '0')}`;
}

export function signedPct(n: number): string {
  const r = Math.round(n);
  return `${r > 0 ? '+' : ''}${r}%`;
}
