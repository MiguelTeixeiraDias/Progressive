// Small builders for constructing WorkoutSession fixtures in tests. Not a test
// file itself (no `.test.ts` suffix) so Jest won't try to run it.

import { MuscleGroup, SetEntry, WorkoutExercise, WorkoutSession } from '../types';

let counter = 0;
const nextId = (p: string) => `${p}_${counter++}`;

export function makeSet(partial: Partial<SetEntry> = {}): SetEntry {
  return { id: nextId('set'), reps: 5, weight: 100, completed: true, ...partial };
}

export function makeExercise(partial: Partial<WorkoutExercise> = {}): WorkoutExercise {
  const muscleGroup: MuscleGroup = partial.muscleGroup ?? 'Chest';
  return {
    id: nextId('we'),
    exerciseId: partial.exerciseId ?? 'ex_bench',
    name: partial.name ?? 'Bench Press',
    muscleGroup,
    notes: '',
    sets: partial.sets ?? [makeSet()],
    ...partial,
  };
}

export function makeSession(partial: Partial<WorkoutSession> = {}): WorkoutSession {
  const startedAt = partial.startedAt ?? Date.now();
  return {
    id: nextId('w'),
    name: partial.name ?? 'Session',
    date: new Date(startedAt).toISOString(),
    startedAt,
    endedAt: startedAt + 3_600_000,
    durationSec: 3600,
    exercises: partial.exercises ?? [makeExercise()],
    totalVolume: partial.totalVolume ?? 0,
    completed: partial.completed ?? true,
    ...partial,
  };
}
