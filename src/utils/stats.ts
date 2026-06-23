import {
  MUSCLE_GROUPS,
  MuscleGroup,
  PersonalRecord,
  SetEntry,
  WorkoutExercise,
  WorkoutSession,
} from '../types';
import {
  addDays,
  dayKey,
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
  return s.reps * s.weight;
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
// Lookups used by the logging flow
// ---------------------------------------------------------------------------

export function lastWorkout(sessions: WorkoutSession[]): WorkoutSession | null {
  const done = [...completed(sessions)].sort((a, b) => b.startedAt - a.startedAt);
  return done[0] ?? null;
}

export interface PreviousPerformance {
  date: number;
  sets: { reps: number; weight: number }[];
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
    return { date: sn.startedAt, sets: sets.map((s) => ({ reps: s.reps, weight: s.weight })) };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Plain-English insights
// ---------------------------------------------------------------------------

export function overloadInsights(
  sessions: WorkoutSession[],
  weeklyGoal: number,
): string[] {
  const out: string[] = [];

  const mi = mostImproved(sessions);
  if (mi && mi.deltaWeight > 0) {
    out.push(
      `Your ${mi.name} top set is up ${formatWeight(mi.deltaWeight)}kg (${Math.round(
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
