import {
  ExperienceLevel,
  FitnessGoal,
  MuscleGroup,
  TrainingSplit,
  WorkoutSession,
} from '../types';
import { muscleGridThisWeek } from './stats';

// ---------------------------------------------------------------------------
// Turns the profile/goal data collected in Settings into lightweight coaching
// cues. All pure and defensive — every input may be undefined.
// ---------------------------------------------------------------------------

/** Goal-specific rep-range guidance shown alongside the next-target cue. */
export interface RepGuidance {
  low: number;
  high: number;
  note: string;
}

export function repGuidance(goal?: FitnessGoal): RepGuidance | null {
  switch (goal) {
    case 'Get stronger':
      return { low: 3, high: 6, note: 'Heavy 3–6 rep sets build maximal strength.' };
    case 'Build muscle':
      return { low: 8, high: 12, note: 'Stay in 8–12 reps — chase reps, then add load.' };
    case 'Lose fat':
      return { low: 10, high: 15, note: '10–15 reps with short rest keeps the burn high.' };
    case 'Improve fitness':
    case 'General health':
      return { low: 8, high: 15, note: 'Moderate 8–15 rep sets for steady, sustainable gains.' };
    default:
      return null;
  }
}

/**
 * Suggested load jump (kg) for the next session, scaled by experience: beginners
 * progress in bigger linear steps, advanced lifters in smaller ones. Falls back
 * to the same thresholds the stats layer uses when level is unknown.
 */
export function suggestedIncrement(level: ExperienceLevel | undefined, topWeight: number): number {
  const heavy = topWeight >= 60;
  switch (level) {
    case 'Beginner':
      return heavy ? 5 : 2.5;
    case 'Advanced':
      return heavy ? 2.5 : 1.25;
    case 'Intermediate':
      return 2.5;
    default:
      return heavy ? 5 : 2.5;
  }
}

// ---- Bodyweight & target ---------------------------------------------------

export function bmi(weightKg?: number, heightCm?: number): number | null {
  if (!weightKg || !heightCm) return null;
  const m = heightCm / 100;
  if (m <= 0) return null;
  return weightKg / (m * m);
}

export function bmiLabel(value: number): string {
  if (value < 18.5) return 'Underweight';
  if (value < 25) return 'Healthy';
  if (value < 30) return 'Overweight';
  return 'Obese';
}

export interface TargetProgress {
  delta: number; // absolute distance to target, in the stored unit
  direction: 'lose' | 'gain' | 'reached';
}

export function weightToTarget(current?: number, target?: number): TargetProgress | null {
  if (!current || !target) return null;
  const diff = current - target;
  if (Math.abs(diff) < 0.1) return { delta: 0, direction: 'reached' };
  return { delta: Math.abs(diff), direction: diff > 0 ? 'lose' : 'gain' };
}

// ---- Split-based "train next" ---------------------------------------------

export interface SplitDay {
  name: string;
  groups: MuscleGroup[];
}

/** Ordered rotation of training days for each split. */
const SPLIT_ROTATIONS: Record<TrainingSplit, SplitDay[]> = {
  'Push/Pull/Legs': [
    { name: 'Push', groups: ['Chest', 'Shoulders', 'Arms'] },
    { name: 'Pull', groups: ['Back', 'Arms'] },
    { name: 'Legs', groups: ['Legs', 'Core'] },
  ],
  'Upper/Lower': [
    { name: 'Upper', groups: ['Chest', 'Back', 'Shoulders', 'Arms'] },
    { name: 'Lower', groups: ['Legs', 'Core'] },
  ],
  'Full Body': [{ name: 'Full Body', groups: ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'] }],
  'Bro Split': [
    { name: 'Chest', groups: ['Chest'] },
    { name: 'Back', groups: ['Back'] },
    { name: 'Shoulders', groups: ['Shoulders'] },
    { name: 'Legs', groups: ['Legs', 'Core'] },
    { name: 'Arms', groups: ['Arms'] },
  ],
  Custom: [],
};

/** Muscle groups trained in a single session. */
function sessionGroups(session: WorkoutSession): Set<MuscleGroup> {
  const groups = new Set<MuscleGroup>();
  for (const we of session.exercises) groups.add(we.muscleGroup);
  return groups;
}

/**
 * Suggests the next session to run for the user's split: finds the rotation day
 * that best matches the most recent workout, then returns the following day.
 * Returns null for Custom (or no split). With no history, suggests day one.
 */
export function nextSplitSession(
  split: TrainingSplit | undefined,
  sessions: WorkoutSession[],
): SplitDay | null {
  if (!split) return null;
  const rotation = SPLIT_ROTATIONS[split];
  if (!rotation || rotation.length === 0) return null;
  if (rotation.length === 1) return rotation[0];

  const done = sessions
    .filter((s) => s.completed)
    .sort((a, b) => b.startedAt - a.startedAt);
  if (done.length === 0) return rotation[0];

  const groups = sessionGroups(done[0]);
  // Day whose target groups overlap the last session most.
  let bestIdx = 0;
  let bestOverlap = -1;
  rotation.forEach((day, i) => {
    const overlap = day.groups.filter((g) => groups.has(g)).length;
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      bestIdx = i;
    }
  });
  return rotation[(bestIdx + 1) % rotation.length];
}

// ---- Focus muscle group nudge ---------------------------------------------

export interface FocusStatus {
  group: MuscleGroup;
  trainedThisWeek: boolean;
}

export function focusStatus(
  focus: MuscleGroup | undefined,
  sessions: WorkoutSession[],
): FocusStatus | null {
  if (!focus) return null;
  const row = muscleGridThisWeek(sessions).find((r) => r.group === focus);
  return { group: focus, trainedThisWeek: !!row && row.days.some(Boolean) };
}
