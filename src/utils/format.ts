export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

/** Compact volume display: 12,540 -> "12.5k". */
export function formatVolume(kg: number): string {
  if (kg >= 100_000) return `${(kg / 1000).toFixed(0)}k`;
  if (kg >= 10_000) return `${(kg / 1000).toFixed(1)}k`;
  return formatNumber(kg);
}

/** Drops trailing ".0" so 60.0 -> "60" and 62.5 -> "62.5". */
export function formatWeight(kg: number): string {
  const r = Math.round(kg * 10) / 10;
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
