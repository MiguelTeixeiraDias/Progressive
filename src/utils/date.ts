export const DAY_MS = 86_400_000;

type DateLike = Date | number | string;

export function startOfDay(d: DateLike): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function dayKey(d: DateLike): string {
  const x = startOfDay(d);
  const m = `${x.getMonth() + 1}`.padStart(2, '0');
  const day = `${x.getDate()}`.padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

/** Week starts on Monday. */
export function startOfWeek(d: DateLike): Date {
  const x = startOfDay(d);
  const offset = (x.getDay() + 6) % 7; // Monday = 0
  x.setDate(x.getDate() - offset);
  return x;
}

export function addDays(d: DateLike, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function isSameDay(a: DateLike, b: DateLike): boolean {
  return dayKey(a) === dayKey(b);
}

export function isThisWeek(d: DateLike): boolean {
  const start = startOfWeek(Date.now()).getTime();
  const end = addDays(start, 7).getTime();
  const t = new Date(d).getTime();
  return t >= start && t < end;
}

export function isLastWeek(d: DateLike): boolean {
  const start = addDays(startOfWeek(Date.now()), -7).getTime();
  const end = startOfWeek(Date.now()).getTime();
  const t = new Date(d).getTime();
  return t >= start && t < end;
}

export function relativeDay(d: DateLike): string {
  const today = startOfDay(Date.now()).getTime();
  const target = startOfDay(d).getTime();
  const diff = Math.round((today - target) / DAY_MS);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff > 1 && diff < 7) return `${diff} days ago`;
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function shortDate(d: DateLike): string {
  return new Date(d).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function fullDate(d: DateLike): string {
  return new Date(d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export function weekdayShort(d: DateLike): string {
  return new Date(d).toLocaleDateString(undefined, { weekday: 'short' });
}

export function timeOfDay(): 'morning' | 'afternoon' | 'evening' {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}
