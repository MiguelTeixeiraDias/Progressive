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

/** A reusable training plan the user can start a workout from. */
export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  muscleGroup: MuscleGroup;
  notes?: string;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: TemplateExercise[];
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export type UnitPreference = 'kg' | 'lb';

export type ExperienceLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type TrainingSplit =
  | 'Push/Pull/Legs'
  | 'Upper/Lower'
  | 'Full Body'
  | 'Bro Split'
  | 'Custom';

export type FitnessGoal =
  | 'Build muscle'
  | 'Get stronger'
  | 'Lose fat'
  | 'Improve fitness'
  | 'General health';

/**
 * Local-only training profile. There is no auth/database yet — these values are
 * persisted on-device and structured so they can be lifted to real user accounts
 * (and used by future calculations / AI) without reshaping the data.
 */
export interface UserProfile {
  name?: string;
  email?: string;
  experienceLevel?: ExperienceLevel;
  preferredSplit?: TrainingSplit;
}

export interface UserGoals {
  primaryFitnessGoal?: FitnessGoal;
  targetBodyWeight?: number;
  focusMuscleGroup?: MuscleGroup;
}

export interface BodyStats {
  currentWeight?: number;
  height?: number;
}

export interface Settings {
  userName: string;
  weeklyGoal: number; // target workouts per week (canonical weekly target)
  unit: UnitPreference;
  profile: UserProfile;
  goals: UserGoals;
  bodyStats: BodyStats;
  /** Exercise ids pinned to the Progress "key lifts" PR tiles (defaults: squat/bench/deadlift). */
  featuredExercises: string[];
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
