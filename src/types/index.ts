// Core domain types for the Progressive gym tracking app.

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Legs'
  | 'Arms'
  | 'Core';

export const MUSCLE_GROUPS: MuscleGroup[] = [
  'Chest',
  'Back',
  'Shoulders',
  'Legs',
  'Arms',
  'Core',
];

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  isCustom: boolean;
}

/** A single set within a workout exercise. */
export interface SetEntry {
  id: string;
  reps: number;
  weight: number; // kilograms
  completed: boolean;
}

/** An exercise as performed inside a workout session. */
export interface WorkoutExercise {
  id: string; // unique instance id within the session
  exerciseId: string; // reference to the library Exercise
  name: string; // denormalized snapshot for history integrity
  muscleGroup: MuscleGroup;
  notes: string;
  sets: SetEntry[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string; // ISO start date
  startedAt: number; // epoch ms
  endedAt: number | null;
  durationSec: number;
  exercises: WorkoutExercise[];
  totalVolume: number; // kg
  completed: boolean;
}

export interface PersonalRecord {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  maxWeight: number;
  repsAtMaxWeight: number;
  estimatedOneRepMax: number;
  bestVolume: number;
  achievedAt: string; // ISO
}

export interface UserStats {
  totalWorkouts: number;
  totalVolume: number;
  currentStreak: number;
  longestStreak: number;
  workoutsThisWeek: number;
  volumeThisWeek: number;
}

export interface Settings {
  userName: string;
  weeklyGoal: number; // target workouts per week
  unit: 'kg' | 'lb';
}

/** Returned by finishWorkout() to power the celebration screen. */
export interface WorkoutSummary {
  sessionId: string;
  name: string;
  durationSec: number;
  totalVolume: number;
  totalSets: number;
  exerciseCount: number;
  muscleGroups: MuscleGroup[];
  newPRs: NewPR[];
  volumeChangePct: number | null; // vs previous completed workout
}

export interface NewPR {
  exerciseName: string;
  weight: number;
  reps: number;
  e1rm: number;
}
