import {
  MUSCLE_GROUPS,
  MuscleGroup,
  PersonalRecord,
  SetEntry,
  UnitPreference,
  WorkoutExercise,
  WorkoutSession,
} from '../types';
import {
  addDays,
  dayKey,
  dayMonth,
  DAY_MS,
  isLastWeek,
  isThisWeek,
  shortDate,
  startOfDay,
  startOfWeek,
} from './date';
import { formatWeight } from './format';

// ---------------------------------------------------------------------------
// Primitive calculations
// ---------------------------------------------------------------------------

export function setVolume(s: SetEntry): number {
  const dropsVolume = s.drops?.reduce((v, d) => v + d.reps * d.weight, 0) ?? 0;
  return s.reps * s.weight + dropsVolume;
}

/** Epley estimated one-rep max. */
export function epley1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function exerciseVolume(we: WorkoutExercise, completedOnly = false): number {
  return we.sets.reduce(
    (v, s) => v + (completedOnly && !s.completed ? 0 : setVolume(s)),
    0,
  );
}

export function sessionVolume(sn: WorkoutSession, completedOnly = false): number {
  return sn.exercises.reduce((v, we) => v + exerciseVolume(we, completedOnly), 0);
}

export function sessionSetCount(sn: WorkoutSession, completedOnly = false): number {
  return sn.exercises.reduce(
    (n, we) => n + we.sets.filter((s) => (completedOnly ? s.completed : true)).length,
    0,
  );
}

const completed = (sessions: WorkoutSession[]) => sessions.filter((s) => s.completed);

// ---------------------------------------------------------------------------
// Weekly aggregates (dashboard)
// ---------------------------------------------------------------------------

export function workoutsThisWeek(sessions: WorkoutSession[]): number {
  return completed(sessions).filter((s) => isThisWeek(s.startedAt)).length;
}

export function workoutsLastWeek(sessions: WorkoutSession[]): number {
  return completed(sessions).filter((s) => isLastWeek(s.startedAt)).length;
}

export function volumeThisWeek(sessions: WorkoutSession[]): number {
  return completed(sessions)
    .filter((s) => isThisWeek(s.startedAt))
    .reduce((sum, s) => sum + s.totalVolume, 0);
}

export function volumeLastWeek(sessions: WorkoutSession[]): number {
  return completed(sessions)
    .filter((s) => isLastWeek(s.startedAt))
    .reduce((sum, s) => sum + s.totalVolume, 0);
}

export function muscleGroupsThisWeek(sessions: WorkoutSession[]): MuscleGroup[] {
  const set = new Set<MuscleGroup>();
  completed(sessions)
    .filter((s) => isThisWeek(s.startedAt))
    .forEach((s) => s.exercises.forEach((e) => set.add(e.muscleGroup)));
  return MUSCLE_GROUPS.filter((g) => set.has(g));
}

export function totalVolume(sessions: WorkoutSession[]): number {
  return completed(sessions).reduce((sum, s) => sum + s.totalVolume, 0);
}

// ---------------------------------------------------------------------------
// Streaks
// ---------------------------------------------------------------------------

export function currentStreak(sessions: WorkoutSession[]): number {
  const days = new Set(completed(sessions).map((s) => dayKey(s.startedAt)));
  if (days.size === 0) return 0;

  let cursor = startOfDay(Date.now());
  // Allow the streak to "hold" if today has no workout yet but yesterday did.
  if (!days.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

export function longestStreak(sessions: WorkoutSession[]): number {
  const times = [
    ...new Set(completed(sessions).map((s) => startOfDay(s.startedAt).getTime())),
  ].sort((a, b) => a - b);

  let best = 0;
  let run = 0;
  let prev = 0;
  for (const t of times) {
    if (run === 0) run = 1;
    else if (t - prev === DAY_MS) run += 1;
    else run = 1;
    best = Math.max(best, run);
    prev = t;
  }
  return best;
}

/** Distinct local calendar days (YYYY-MM-DD) on which a workout was logged, oldest first. */
export function uniqueWorkoutDays(sessions: WorkoutSession[]): string[] {
  return [...new Set(completed(sessions).map((s) => dayKey(s.startedAt)))].sort();
}

export interface LongestStreakInfo {
  length: number;
  start: number | null; // epoch ms, start-of-day
  end: number | null; // epoch ms, start-of-day
}

/** Longest run of consecutive unique workout days plus the dates it spanned. */
export function longestStreakInfo(sessions: WorkoutSession[]): LongestStreakInfo {
  const days = [
    ...new Set(completed(sessions).map((s) => startOfDay(s.startedAt).getTime())),
  ].sort((a, b) => a - b);
  if (days.length === 0) return { length: 0, start: null, end: null };

  let bestLen = 1;
  let bestStart = days[0];
  let bestEnd = days[0];
  let runLen = 1;
  let runStart = days[0];

  for (let i = 1; i < days.length; i++) {
    if (days[i] - days[i - 1] === DAY_MS) {
      runLen += 1;
    } else {
      runLen = 1;
      runStart = days[i];
    }
    if (runLen > bestLen) {
      bestLen = runLen;
      bestStart = runStart;
      bestEnd = days[i];
    }
  }
  return { length: bestLen, start: bestStart, end: bestEnd };
}

// ---------------------------------------------------------------------------
// Weekly goal: week streak + rolling consistency (unique workout days vs goal)
// ---------------------------------------------------------------------------

/** Fallback when the user has not configured a weekly workout target. */
export const DEFAULT_WEEKLY_GOAL = 3;

export function resolveWeeklyGoal(goal?: number | null): number {
  return goal && goal > 0 ? goal : DEFAULT_WEEKLY_GOAL;
}

/** Start-of-day epoch times that had at least one completed workout. */
function workoutDayTimes(sessions: WorkoutSession[]): Set<number> {
  return new Set(completed(sessions).map((s) => startOfDay(s.startedAt).getTime()));
}

/** Unique workout days within the week at the given offset (0 = current week). */
export function uniqueWorkoutDaysInWeek(sessions: WorkoutSession[], weekOffset = 0): number {
  const ws = addDays(startOfWeek(Date.now()), 7 * weekOffset).getTime();
  const we = ws + 7 * DAY_MS;
  let count = 0;
  for (const t of workoutDayTimes(sessions)) if (t >= ws && t < we) count += 1;
  return count;
}

export interface WeekProgress {
  done: number; // unique workout days this week
  goal: number;
  met: boolean;
}

/** Current-week progress toward the weekly goal, counting unique workout days. */
export function currentWeekProgress(sessions: WorkoutSession[], goal?: number): WeekProgress {
  const g = resolveWeeklyGoal(goal);
  const done = uniqueWorkoutDaysInWeek(sessions, 0);
  return { done, goal: g, met: done >= g };
}

/**
 * Consecutive weeks that met the weekly goal (unique workout days ≥ goal). The
 * current week is treated as in-progress: if it has not met the goal yet it does
 * not break the streak — counting simply resumes from last week.
 */
export function weekStreak(sessions: WorkoutSession[], goal?: number): number {
  const g = resolveWeeklyGoal(goal);
  const dayTimes = workoutDayTimes(sessions);
  if (dayTimes.size === 0) return 0;
  const start = startOfWeek(Date.now());
  const met = (offset: number) => {
    const ws = addDays(start, 7 * offset).getTime();
    const we = ws + 7 * DAY_MS;
    let c = 0;
    for (const t of dayTimes) if (t >= ws && t < we) c += 1;
    return c >= g;
  };

  let offset = 0;
  if (!met(0)) {
    offset = -1; // current week not done yet — hold and start from last week
    if (!met(-1)) return 0;
  }
  let streak = 0;
  while (met(offset)) {
    streak += 1;
    offset -= 1;
  }
  return streak;
}

export function weekLabel(offset: number): string {
  if (offset === 0) return 'This week';
  if (offset === -1) return 'Last week';
  return `${-offset} weeks ago`;
}

export interface WeekConsistency {
  offset: number; // 0 = this week, -1 = last week, …
  label: string;
  days: boolean[]; // Mon..Sun — whether a workout was logged that day
  uniqueDays: number;
  goal: number;
  met: boolean;
  isCurrent: boolean;
}

/** Rolling consistency for the last `count` weeks, newest first. */
export function rollingWeekConsistency(
  sessions: WorkoutSession[],
  goal?: number,
  count = 4,
): WeekConsistency[] {
  const g = resolveWeeklyGoal(goal);
  const dayTimes = workoutDayTimes(sessions);
  const start = startOfWeek(Date.now());
  const out: WeekConsistency[] = [];
  for (let i = 0; i < count; i++) {
    const offset = -i;
    const ws = addDays(start, 7 * offset);
    const days: boolean[] = [];
    for (let d = 0; d < 7; d++) days.push(dayTimes.has(addDays(ws, d).getTime()));
    const uniqueDays = days.filter(Boolean).length;
    out.push({
      offset,
      label: weekLabel(offset),
      days,
      uniqueDays,
      goal: g,
      met: uniqueDays >= g,
      isCurrent: offset === 0,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Progressive-overload percentage increase (exercise volume vs previous logging)
// ---------------------------------------------------------------------------

/** Percentage change between two exercise volumes. null when no prior data to compare. */
export function percentageIncrease(
  currentVolume: number,
  previousVolume: number | null,
): number | null {
  if (previousVolume === null || previousVolume <= 0) return null;
  return ((currentVolume - previousVolume) / previousVolume) * 100;
}

interface DayVolumes {
  key: string;
  time: number; // start-of-day epoch ms
  vols: Map<string, number>; // exerciseId -> completed volume that day
}

/** Completed exercise volume aggregated per local day, oldest day first. */
function dayVolumeTimeline(sessions: WorkoutSession[]): DayVolumes[] {
  const map = new Map<string, DayVolumes>();
  for (const s of completed(sessions)) {
    const key = dayKey(s.startedAt);
    let entry = map.get(key);
    if (!entry) {
      entry = { key, time: startOfDay(s.startedAt).getTime(), vols: new Map() };
      map.set(key, entry);
    }
    for (const we of s.exercises) {
      const v = exerciseVolume(we, true);
      if (v > 0) entry.vols.set(we.exerciseId, (entry.vols.get(we.exerciseId) ?? 0) + v);
    }
  }
  return [...map.values()].sort((a, b) => a.time - b.time);
}

function averageOrNull(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Average per-exercise percentage increase for one local day, comparing each
 * exercise's volume that day to the most recent earlier day it was trained.
 * Exercises with no prior data are excluded; null when nothing is comparable.
 */
export function dayAvgPctIncrease(sessions: WorkoutSession[], key: string): number | null {
  const timeline = dayVolumeTimeline(sessions);
  const idx = timeline.findIndex((d) => d.key === key);
  if (idx < 0) return null;

  const pcts: number[] = [];
  for (const [exId, vol] of timeline[idx].vols) {
    for (let j = idx - 1; j >= 0; j--) {
      const prev = timeline[j].vols.get(exId);
      if (prev && prev > 0) {
        pcts.push(((vol - prev) / prev) * 100);
        break;
      }
    }
  }
  return averageOrNull(pcts);
}

/**
 * Average per-exercise percentage increase for a single session, comparing each
 * exercise to the previous session it appeared in. Powers the Last Session card.
 */
export function workoutAvgPctIncrease(
  sessions: WorkoutSession[],
  session: WorkoutSession,
): number | null {
  const ordered = [...completed(sessions)].sort((a, b) => a.startedAt - b.startedAt);
  const idx = ordered.findIndex((s) => s.id === session.id);
  const before = idx >= 0 ? idx : ordered.length;

  const pcts: number[] = [];
  for (const we of session.exercises) {
    const cur = exerciseVolume(we, true);
    if (cur <= 0) continue;
    for (let j = before - 1; j >= 0; j--) {
      const prevWe = ordered[j].exercises.find((e) => e.exerciseId === we.exerciseId);
      if (!prevWe) continue;
      const prevVol = exerciseVolume(prevWe, true);
      if (prevVol > 0) {
        pcts.push(((cur - prevVol) / prevVol) * 100);
        break;
      }
    }
  }
  return averageOrNull(pcts);
}

export interface PctPoint {
  label: string;
  key: string;
  value: number; // pct ?? 0, for bar height
  pct: number | null; // null = no comparison data that day
  highlight?: boolean;
}

/** Daily average percentage increase for the current week (Mon–Sun) for the graph. */
export function dailyPctIncreaseThisWeek(sessions: WorkoutSession[]): PctPoint[] {
  const start = startOfWeek(Date.now());
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayKey = dayKey(Date.now());
  return labels.map((label, i) => {
    const d = addDays(start, i);
    const key = dayKey(d);
    const pct = dayAvgPctIncrease(sessions, key);
    return { label, key, value: pct ?? 0, pct, highlight: key === todayKey };
  });
}

/** Average of this week's daily percentage increases. null when nothing comparable. */
export function weekAvgPctIncrease(sessions: WorkoutSession[]): number | null {
  const pcts = dailyPctIncreaseThisWeek(sessions)
    .map((p) => p.pct)
    .filter((p): p is number => p !== null);
  return averageOrNull(pcts);
}

/** True once any exercise has been logged on two different days (comparison possible). */
export function hasComparisonData(sessions: WorkoutSession[]): boolean {
  const timeline = dayVolumeTimeline(sessions);
  for (let i = 1; i < timeline.length; i++) {
    for (const exId of timeline[i].vols.keys()) {
      for (let j = i - 1; j >= 0; j--) {
        if ((timeline[j].vols.get(exId) ?? 0) > 0) return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Muscle grid + progression target (Home cards)
// ---------------------------------------------------------------------------

export interface MuscleGridRow {
  group: MuscleGroup;
  /** 7 booleans, Mon..Sun — whether the group was trained that day this week. */
  days: boolean[];
}

/** 6x7 grid of which muscle groups were trained on which day of the current week. */
export function muscleGridThisWeek(sessions: WorkoutSession[]): MuscleGridRow[] {
  const start = startOfWeek(Date.now()).getTime();
  const grid = Object.fromEntries(
    MUSCLE_GROUPS.map((g) => [g, [false, false, false, false, false, false, false]]),
  ) as Record<MuscleGroup, boolean[]>;

  for (const s of completed(sessions)) {
    const idx = Math.floor((startOfDay(s.startedAt).getTime() - start) / DAY_MS);
    if (idx < 0 || idx > 6) continue;
    for (const we of s.exercises) grid[we.muscleGroup][idx] = true;
  }
  return MUSCLE_GROUPS.map((g) => ({ group: g, days: grid[g] }));
}

export interface NextTargetInfo {
  exerciseId: string;
  name: string;
  topWeight: number;
  reps: number;
  increment: number;
}

/**
 * The lift most ready to progress: trained at least twice with non-declining
 * volume on its latest session. Suggests a small load bump on the top set.
 */
export function nextTarget(sessions: WorkoutSession[]): NextTargetInfo | null {
  const byEx: Record<
    string,
    { name: string; entries: { time: number; vol: number; topWeight: number; reps: number }[] }
  > = {};

  for (const s of [...completed(sessions)].sort((a, b) => a.startedAt - b.startedAt)) {
    for (const we of s.exercises) {
      const sets = we.sets.filter((x) => x.completed && x.weight > 0);
      if (sets.length === 0) continue;
      const topWeight = Math.max(...sets.map((x) => x.weight));
      const reps = Math.max(
        ...sets.filter((x) => x.weight === topWeight).map((x) => x.reps),
      );
      (byEx[we.exerciseId] ??= { name: we.name, entries: [] }).entries.push({
        time: s.startedAt,
        vol: exerciseVolume(we, true),
        topWeight,
        reps,
      });
    }
  }

  let best: (NextTargetInfo & { time: number }) | null = null;
  for (const [exId, info] of Object.entries(byEx)) {
    const e = info.entries;
    if (e.length < 2) continue;
    const last = e[e.length - 1];
    const prev = e[e.length - 2];
    if (last.vol < prev.vol) continue; // only lifts that held or progressed are "ready"
    const increment = last.topWeight >= 60 ? 5 : 2.5;
    if (
      !best ||
      last.time > best.time ||
      (last.time === best.time && last.topWeight > best.topWeight)
    ) {
      best = {
        exerciseId: exId,
        name: info.name,
        topWeight: last.topWeight,
        reps: last.reps,
        increment,
        time: last.time,
      };
    }
  }
  if (!best) return null;
  const { time: _t, ...rest } = best;
  return rest;
}

// ---------------------------------------------------------------------------
// Personal records
// ---------------------------------------------------------------------------

export function computePRs(sessions: WorkoutSession[]): Record<string, PersonalRecord> {
  const prs: Record<string, PersonalRecord> = {};
  const ordered = [...completed(sessions)].sort((a, b) => a.startedAt - b.startedAt);

  for (const sn of ordered) {
    for (const we of sn.exercises) {
      let pr = prs[we.exerciseId];
      if (!pr) {
        pr = {
          exerciseId: we.exerciseId,
          exerciseName: we.name,
          muscleGroup: we.muscleGroup,
          maxWeight: 0,
          repsAtMaxWeight: 0,
          estimatedOneRepMax: 0,
          bestVolume: 0,
          achievedAt: sn.date,
        };
        prs[we.exerciseId] = pr;
      }
      for (const s of we.sets) {
        if (!s.completed || s.weight <= 0) continue;
        if (s.weight > pr.maxWeight) {
          pr.maxWeight = s.weight;
          pr.repsAtMaxWeight = s.reps;
          pr.achievedAt = sn.date;
        }
        const e1 = epley1RM(s.weight, s.reps);
        if (e1 > pr.estimatedOneRepMax) pr.estimatedOneRepMax = e1;
      }
      const vol = exerciseVolume(we, true);
      if (vol > pr.bestVolume) pr.bestVolume = vol;
    }
  }
  return prs;
}

export function personalRecordList(sessions: WorkoutSession[]): PersonalRecord[] {
  return Object.values(computePRs(sessions))
    .filter((p) => p.maxWeight > 0)
    .sort((a, b) => b.estimatedOneRepMax - a.estimatedOneRepMax);
}

// ---------------------------------------------------------------------------
// Improvement / overload
// ---------------------------------------------------------------------------

export interface ImprovementInfo {
  exerciseId: string;
  name: string;
  deltaWeight: number;
  deltaPct: number;
}

/** Exercise with the biggest top-set weight improvement (needs 2+ sessions). */
export function mostImproved(sessions: WorkoutSession[]): ImprovementInfo | null {
  const map: Record<
    string,
    { name: string; first: number; last: number; firstTime: number; lastTime: number }
  > = {};

  for (const sn of completed(sessions)) {
    for (const we of sn.exercises) {
      const top = Math.max(
        0,
        ...we.sets.filter((s) => s.completed).map((s) => s.weight),
      );
      if (top <= 0) continue;
      const m = map[we.exerciseId];
      if (!m) {
        map[we.exerciseId] = {
          name: we.name,
          first: top,
          last: top,
          firstTime: sn.startedAt,
          lastTime: sn.startedAt,
        };
        continue;
      }
      if (sn.startedAt <= m.firstTime) {
        m.first = top;
        m.firstTime = sn.startedAt;
      }
      if (sn.startedAt >= m.lastTime) {
        m.last = top;
        m.lastTime = sn.startedAt;
      }
    }
  }

  let best: ImprovementInfo | null = null;
  for (const [id, m] of Object.entries(map)) {
    if (m.lastTime === m.firstTime) continue;
    const delta = m.last - m.first;
    if (delta <= 0) continue;
    const pct = (delta / m.first) * 100;
    if (!best || pct > best.deltaPct) {
      best = { exerciseId: id, name: m.name, deltaWeight: delta, deltaPct: pct };
    }
  }
  return best;
}

/**
 * Progressive overload score (0-100). 50 means "maintaining"; higher means you
 * are adding volume week over week. Compares per-exercise volume for lifts
 * trained in both the current and previous week, falling back to total volume.
 */
export function overloadScore(sessions: WorkoutSession[]): number {
  const thisW = completed(sessions).filter((s) => isThisWeek(s.startedAt));
  const lastW = completed(sessions).filter((s) => isLastWeek(s.startedAt));

  const volumeByExercise = (arr: WorkoutSession[]) => {
    const m: Record<string, number> = {};
    for (const sn of arr)
      for (const we of sn.exercises)
        m[we.exerciseId] = (m[we.exerciseId] ?? 0) + exerciseVolume(we, true);
    return m;
  };

  const a = volumeByExercise(thisW);
  const b = volumeByExercise(lastW);
  const shared = Object.keys(a).filter((k) => (b[k] ?? 0) > 0);

  let base: number;
  if (shared.length > 0) {
    const avgPct =
      shared.reduce((sum, k) => sum + (a[k] - b[k]) / b[k], 0) / shared.length;
    base = 50 + avgPct * 120;
  } else {
    const tv = thisW.reduce((s, x) => s + x.totalVolume, 0);
    const lv = lastW.reduce((s, x) => s + x.totalVolume, 0);
    if (lv > 0) base = 50 + ((tv - lv) / lv) * 100;
    else base = thisW.length > 0 ? 62 : 40;
  }
  return Math.max(0, Math.min(100, Math.round(base)));
}

export function overloadLabel(score: number): string {
  if (score >= 75) return 'Crushing it';
  if (score >= 60) return 'Progressing';
  if (score >= 45) return 'Maintaining';
  if (score >= 25) return 'Easing off';
  return 'Let’s rebuild';
}

// ---------------------------------------------------------------------------
// Series for charts
// ---------------------------------------------------------------------------

export interface SeriesPoint {
  label: string;
  value: number;
  highlight?: boolean;
}

export function dailyVolumeThisWeek(sessions: WorkoutSession[]): SeriesPoint[] {
  const start = startOfWeek(Date.now());
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const todayKey = dayKey(Date.now());
  return labels.map((label, i) => {
    const d = addDays(start, i);
    const next = addDays(d, 1);
    const value = completed(sessions)
      .filter((s) => s.startedAt >= d.getTime() && s.startedAt < next.getTime())
      .reduce((sum, s) => sum + s.totalVolume, 0);
    return { label, value, highlight: dayKey(d) === todayKey };
  });
}

export function weeklyVolumeSeries(
  sessions: WorkoutSession[],
  weeks = 8,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(startOfWeek(Date.now()), -7 * i);
    const we = addDays(ws, 7);
    const value = completed(sessions)
      .filter((s) => s.startedAt >= ws.getTime() && s.startedAt < we.getTime())
      .reduce((sum, s) => sum + s.totalVolume, 0);
    out.push({
      label: `${ws.getMonth() + 1}/${ws.getDate()}`,
      value,
      highlight: i === 0,
    });
  }
  return out;
}

export function weeklyWorkoutSeries(
  sessions: WorkoutSession[],
  weeks = 8,
): SeriesPoint[] {
  const out: SeriesPoint[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const ws = addDays(startOfWeek(Date.now()), -7 * i);
    const we = addDays(ws, 7);
    const value = completed(sessions).filter(
      (s) => s.startedAt >= ws.getTime() && s.startedAt < we.getTime(),
    ).length;
    out.push({
      label: `${ws.getMonth() + 1}/${ws.getDate()}`,
      value,
      highlight: i === 0,
    });
  }
  return out;
}

export interface MuscleStat {
  group: MuscleGroup;
  value: number;
}

export function muscleVolumeThisWeek(sessions: WorkoutSession[]): MuscleStat[] {
  const m = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<
    MuscleGroup,
    number
  >;
  completed(sessions)
    .filter((s) => isThisWeek(s.startedAt))
    .forEach((s) => s.exercises.forEach((e) => (m[e.muscleGroup] += exerciseVolume(e, true))));
  return MUSCLE_GROUPS.map((g) => ({ group: g, value: m[g] }));
}

/** How many sessions trained each muscle group over the last N weeks. */
export function muscleFrequency(sessions: WorkoutSession[], weeks = 4): MuscleStat[] {
  const since = addDays(startOfWeek(Date.now()), -7 * (weeks - 1)).getTime();
  const m = Object.fromEntries(MUSCLE_GROUPS.map((g) => [g, 0])) as Record<
    MuscleGroup,
    number
  >;
  completed(sessions)
    .filter((s) => s.startedAt >= since)
    .forEach((s) => {
      const groups = new Set(s.exercises.map((e) => e.muscleGroup));
      groups.forEach((g) => (m[g] += 1));
    });
  return MUSCLE_GROUPS.map((g) => ({ group: g, value: m[g] }));
}

export interface ExercisePoint {
  date: number;
  label: string;
  topWeight: number;
  e1rm: number;
  volume: number;
}

export function exerciseProgress(
  sessions: WorkoutSession[],
  exerciseId: string,
): ExercisePoint[] {
  const out: ExercisePoint[] = [];
  for (const sn of [...completed(sessions)].sort((a, b) => a.startedAt - b.startedAt)) {
    const we = sn.exercises.find((e) => e.exerciseId === exerciseId);
    if (!we) continue;
    const sets = we.sets.filter((s) => s.completed && s.weight > 0);
    if (sets.length === 0) continue;
    out.push({
      date: sn.startedAt,
      label: shortDate(sn.startedAt),
      topWeight: Math.max(...sets.map((s) => s.weight)),
      e1rm: Math.max(...sets.map((s) => epley1RM(s.weight, s.reps))),
      volume: exerciseVolume(we, true),
    });
  }
  return out;
}

/** Exercises ordered by how often they appear, for picking a default chart. */
export function exercisesByFrequency(
  sessions: WorkoutSession[],
): { exerciseId: string; name: string; count: number }[] {
  const m: Record<string, { name: string; count: number }> = {};
  for (const sn of completed(sessions))
    for (const we of sn.exercises) {
      const entry = m[we.exerciseId] ?? { name: we.name, count: 0 };
      entry.count += 1;
      entry.name = we.name;
      m[we.exerciseId] = entry;
    }
  return Object.entries(m)
    .map(([exerciseId, v]) => ({ exerciseId, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);
}

// ---------------------------------------------------------------------------
// Single-exercise detail metrics
// ---------------------------------------------------------------------------

/** Completed sessions that include the exercise, oldest first. */
export function workoutsForExercise(
  sessions: WorkoutSession[],
  exerciseId: string,
): WorkoutSession[] {
  return completed(sessions)
    .filter((sn) => sn.exercises.some((e) => e.exerciseId === exerciseId))
    .sort((a, b) => a.startedAt - b.startedAt);
}

/**
 * Heaviest weight from a genuine single-rep set (reps === 1). Returns null when
 * the user has never logged a true 1-rep set — no estimation is used.
 */
export function actualOneRepMax(
  sessions: WorkoutSession[],
  exerciseId: string,
): number | null {
  let best: number | null = null;
  for (const sn of completed(sessions)) {
    const we = sn.exercises.find((e) => e.exerciseId === exerciseId);
    if (!we) continue;
    for (const s of we.sets) {
      if (s.completed && s.reps === 1 && s.weight > 0) {
        if (best === null || s.weight > best) best = s.weight;
      }
    }
  }
  return best;
}

export interface DailyTopSet {
  time: number; // start-of-day epoch ms
  label: string; // e.g. "12 Jun"
  topWeight: number;
  reps: number; // reps achieved at that top weight
}

/** Heaviest top set per local day for an exercise, oldest → newest (one per day). */
export function dailyTopSets(
  sessions: WorkoutSession[],
  exerciseId: string,
): DailyTopSet[] {
  const byDay = new Map<string, { time: number; topWeight: number; reps: number }>();
  for (const sn of completed(sessions)) {
    const we = sn.exercises.find((e) => e.exerciseId === exerciseId);
    if (!we) continue;
    for (const s of we.sets) {
      if (!s.completed || s.weight <= 0) continue;
      const key = dayKey(sn.startedAt);
      const cur = byDay.get(key);
      if (!cur) {
        byDay.set(key, { time: startOfDay(sn.startedAt).getTime(), topWeight: s.weight, reps: s.reps });
      } else if (s.weight > cur.topWeight || (s.weight === cur.topWeight && s.reps > cur.reps)) {
        cur.topWeight = s.weight;
        cur.reps = s.reps;
      }
    }
  }
  return [...byDay.values()]
    .sort((a, b) => a.time - b.time)
    .map((d) => ({ ...d, label: dayMonth(d.time) }));
}

/**
 * Percentage change in per-session volume over the last 30 days for an exercise:
 * latest vs earliest comparable session inside the window. null when there is
 * not enough data (fewer than two sessions, or a zero earliest volume).
 */
export function exerciseMonthlyIncrease(
  sessions: WorkoutSession[],
  exerciseId: string,
): number | null {
  const since = startOfDay(Date.now()).getTime() - 30 * DAY_MS;
  const points: number[] = [];
  for (const sn of [...completed(sessions)].sort((a, b) => a.startedAt - b.startedAt)) {
    if (sn.startedAt < since) continue;
    const we = sn.exercises.find((e) => e.exerciseId === exerciseId);
    if (!we) continue;
    const vol = exerciseVolume(we, true);
    if (vol > 0) points.push(vol);
  }
  if (points.length < 2) return null;
  const earliest = points[0];
  const latest = points[points.length - 1];
  if (earliest <= 0) return null;
  return ((latest - earliest) / earliest) * 100;
}

// ---------------------------------------------------------------------------
// Progress dashboard
// ---------------------------------------------------------------------------

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Average week-over-week progressive-overload pace across the last N weeks: for
 * each consecutive week pair, the mean per-exercise volume change (shared lifts
 * only), then averaged. e.g. +15 means "≈+15% per week". null when there is no
 * comparable week-over-week data.
 */
export function weeklyOverloadPace(
  sessions: WorkoutSession[],
  weeks = 4,
): number | null {
  const start = startOfWeek(Date.now());
  const done = completed(sessions);

  const volumeForWeek = (weekIndex: number) => {
    const ws = addDays(start, -7 * weekIndex);
    const we = addDays(ws, 7);
    const m = new Map<string, number>();
    for (const sn of done) {
      if (sn.startedAt >= ws.getTime() && sn.startedAt < we.getTime()) {
        for (const ex of sn.exercises) {
          const v = exerciseVolume(ex, true);
          if (v > 0) m.set(ex.exerciseId, (m.get(ex.exerciseId) ?? 0) + v);
        }
      }
    }
    return m;
  };

  // Need one extra older week so the oldest tracked week still has a baseline.
  const maps: Map<string, number>[] = [];
  for (let i = 0; i <= weeks; i++) maps.push(volumeForWeek(i));

  const weekPcts: number[] = [];
  for (let i = 0; i < weeks; i++) {
    const newer = maps[i];
    const older = maps[i + 1];
    const shared = [...newer.keys()].filter((k) => (older.get(k) ?? 0) > 0);
    if (shared.length === 0) continue;
    const avg =
      shared.reduce((sum, k) => sum + ((newer.get(k)! - older.get(k)!) / older.get(k)!) * 100, 0) /
      shared.length;
    weekPcts.push(avg);
  }
  return averageOrNull(weekPcts);
}

/** The most recently achieved personal record (by date), or null if none. */
export function latestPersonalRecord(
  sessions: WorkoutSession[],
): PersonalRecord | null {
  const prs = Object.values(computePRs(sessions)).filter((p) => p.maxWeight > 0);
  if (prs.length === 0) return null;
  return prs.reduce((a, b) =>
    new Date(b.achievedAt).getTime() > new Date(a.achievedAt).getTime() ? b : a,
  );
}

export interface MonthConsistency {
  label: string; // e.g. "June 2026"
  weeks: SeriesPoint[]; // workouts per week, for weeks whose Monday falls in the month
}

/** Workouts-per-week for a single calendar month (monthOffset: 0 = current). */
export function monthlyConsistency(
  sessions: WorkoutSession[],
  monthOffset = 0,
): MonthConsistency {
  const base = new Date();
  base.setDate(1);
  base.setMonth(base.getMonth() + monthOffset);
  const year = base.getFullYear();
  const month = base.getMonth();
  const todayWeek = startOfWeek(Date.now()).getTime();
  const firstMonday = startOfWeek(new Date(year, month, 1));
  const done = completed(sessions);

  const weeks: SeriesPoint[] = [];
  for (let i = 0; i < 6; i++) {
    const ws = addDays(firstMonday, 7 * i);
    if (ws.getFullYear() !== year || ws.getMonth() !== month) continue;
    const we = addDays(ws, 7);
    const value = done.filter(
      (s) => s.startedAt >= ws.getTime() && s.startedAt < we.getTime(),
    ).length;
    weeks.push({ label: `W${weeks.length + 1}`, value, highlight: ws.getTime() === todayWeek });
  }
  return { label: `${MONTH_NAMES[month]} ${year}`, weeks };
}

// ---------------------------------------------------------------------------
// Lookups used by the logging flow
// ---------------------------------------------------------------------------

export function lastWorkout(sessions: WorkoutSession[]): WorkoutSession | null {
  const done = [...completed(sessions)].sort((a, b) => b.startedAt - a.startedAt);
  return done[0] ?? null;
}

export interface PreviousPerformance {
  date: number;
  sets: { reps: number; weight: number; durationSec?: number }[];
}

/** Most recent completed sets for an exercise — powers auto-suggested values. */
export function lastPerformance(
  sessions: WorkoutSession[],
  exerciseId: string,
): PreviousPerformance | null {
  for (const sn of [...completed(sessions)].sort((a, b) => b.startedAt - a.startedAt)) {
    const we = sn.exercises.find((e) => e.exerciseId === exerciseId);
    if (!we) continue;
    const sets = we.sets.filter((s) => s.completed);
    if (sets.length === 0) continue;
    return {
      date: sn.startedAt,
      sets: sets.map((s) => ({ reps: s.reps, weight: s.weight, durationSec: s.durationSec })),
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plain-English insights
// ---------------------------------------------------------------------------

export function overloadInsights(
  sessions: WorkoutSession[],
  weeklyGoal: number,
  unit: UnitPreference = 'kg',
): string[] {
  const out: string[] = [];

  const mi = mostImproved(sessions);
  if (mi && mi.deltaWeight > 0) {
    out.push(
      `Your ${mi.name} top set is up ${formatWeight(mi.deltaWeight, unit)}${unit} (${Math.round(
        mi.deltaPct,
      )}%) since you started tracking it. 💪`,
    );
  }

  const tv = volumeThisWeek(sessions);
  const lv = volumeLastWeek(sessions);
  if (lv > 0) {
    const p = ((tv - lv) / lv) * 100;
    if (p >= 2)
      out.push(`Total training volume is up ${Math.round(p)}% versus last week — momentum is real.`);
    else if (p <= -12)
      out.push(`Volume eased ${Math.round(-p)}% this week. Deloads are part of the plan — come back strong.`);
  }

  const wtw = workoutsThisWeek(sessions);
  if (wtw >= weeklyGoal && weeklyGoal > 0)
    out.push(`You hit your weekly goal of ${weeklyGoal} workouts. That consistency compounds.`);
  else if (wtw > 0)
    out.push(`${wtw} of ${weeklyGoal} workouts done this week — ${Math.max(0, weeklyGoal - wtw)} to go to hit your goal.`);

  const st = currentStreak(sessions);
  if (st >= 2) out.push(`You're on a ${st}-day streak. Keep showing up. 🔥`);

  const muscles = muscleVolumeThisWeek(sessions).filter((m) => m.value > 0);
  if (muscles.length > 0) {
    const top = muscles.reduce((a, b) => (b.value > a.value ? b : a));
    out.push(`${top.group} is your most-trained muscle group this week by volume.`);
  }

  if (out.length === 0)
    out.push('Log a few workouts and personalized progressive-overload insights will appear here.');

  return out;
}
