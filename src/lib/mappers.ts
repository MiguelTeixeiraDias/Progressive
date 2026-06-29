// Conversions between Postgres rows (snake_case, flat) and the app's domain
// types (camelCase, nested). Kept pure and dependency-free so both the sync
// loader and the write-through paths can share them.

import {
  Exercise,
  MuscleGroup,
  SetEntry,
  Settings,
  TemplateExercise,
  UnitPreference,
  WorkoutExercise,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';

// ---- Row shapes (mirror supabase/migrations/0001_init.sql) ----------------

export interface ProfileRow {
  id: string;
  user_name: string;
  weekly_goal: number;
  unit: string;
  email: string | null;
  experience_level: string | null;
  preferred_split: string | null;
  primary_fitness_goal: string | null;
  target_body_weight: number | null;
  focus_muscle_group: string | null;
  current_weight: number | null;
  height: number | null;
  featured_exercises: string[] | null;
  hidden_exercise_ids: string[] | null;
}

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  is_custom: boolean;
}

export interface TemplateRow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateExerciseRow {
  id: string;
  template_id: string;
  exercise_id: string;
  exercise_name: string;
  muscle_group: string;
  notes: string | null;
  position: number;
}

export interface WorkoutRow {
  id: string;
  name: string;
  date: string;
  started_at: number;
  ended_at: number | null;
  duration_sec: number;
  total_volume: number;
  completed: boolean;
}

export interface WorkoutExerciseRow {
  id: string;
  workout_id: string;
  exercise_id: string;
  name: string;
  muscle_group: string;
  notes: string | null;
  position: number;
}

export interface SetRow {
  id: string;
  workout_exercise_id: string;
  reps: number;
  weight: number;
  completed: boolean;
  position: number;
}

const mg = (s: string): MuscleGroup => s as MuscleGroup;

// ---- Row -> domain --------------------------------------------------------

export function rowToExercise(r: ExerciseRow): Exercise {
  return { id: r.id, name: r.name, muscleGroup: mg(r.muscle_group), isCustom: r.is_custom };
}

export function rowsToTemplate(t: TemplateRow, exercises: TemplateExerciseRow[]): WorkoutTemplate {
  return {
    id: t.id,
    name: t.name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    exercises: [...exercises]
      .sort((a, b) => a.position - b.position)
      .map<TemplateExercise>((e) => ({
        exerciseId: e.exercise_id,
        exerciseName: e.exercise_name,
        muscleGroup: mg(e.muscle_group),
        notes: e.notes ?? undefined,
      })),
  };
}

export function rowsToWorkout(
  w: WorkoutRow,
  exercises: WorkoutExerciseRow[],
  setsByExercise: Map<string, SetRow[]>,
): WorkoutSession {
  return {
    id: w.id,
    name: w.name,
    date: w.date,
    startedAt: w.started_at,
    endedAt: w.ended_at,
    durationSec: w.duration_sec,
    totalVolume: w.total_volume,
    completed: w.completed,
    exercises: [...exercises]
      .sort((a, b) => a.position - b.position)
      .map<WorkoutExercise>((e) => ({
        id: e.id,
        exerciseId: e.exercise_id,
        name: e.name,
        muscleGroup: mg(e.muscle_group),
        notes: e.notes ?? '',
        sets: [...(setsByExercise.get(e.id) ?? [])]
          .sort((a, b) => a.position - b.position)
          .map<SetEntry>((s) => ({
            id: s.id,
            reps: s.reps,
            weight: s.weight,
            completed: s.completed,
          })),
      })),
  };
}

export function rowToSettings(r: ProfileRow): Settings {
  return {
    userName: r.user_name,
    weeklyGoal: r.weekly_goal,
    unit: (r.unit as UnitPreference) ?? 'kg',
    profile: {
      name: r.user_name || undefined,
      email: r.email ?? undefined,
      experienceLevel: (r.experience_level as Settings['profile']['experienceLevel']) ?? undefined,
      preferredSplit: (r.preferred_split as Settings['profile']['preferredSplit']) ?? undefined,
    },
    goals: {
      primaryFitnessGoal:
        (r.primary_fitness_goal as Settings['goals']['primaryFitnessGoal']) ?? undefined,
      targetBodyWeight: r.target_body_weight ?? undefined,
      focusMuscleGroup: (r.focus_muscle_group as MuscleGroup) ?? undefined,
    },
    bodyStats: {
      currentWeight: r.current_weight ?? undefined,
      height: r.height ?? undefined,
    },
    featuredExercises: r.featured_exercises ?? [],
    hiddenExerciseIds: r.hidden_exercise_ids ?? [],
  };
}

// ---- Domain -> row (for upserts; user_id is added by the caller) ----------

export function settingsToProfileRow(userId: string, s: Settings): ProfileRow & { id: string } {
  return {
    id: userId,
    user_name: s.userName,
    weekly_goal: s.weeklyGoal,
    unit: s.unit,
    email: s.profile.email ?? null,
    experience_level: s.profile.experienceLevel ?? null,
    preferred_split: s.profile.preferredSplit ?? null,
    primary_fitness_goal: s.goals.primaryFitnessGoal ?? null,
    target_body_weight: s.goals.targetBodyWeight ?? null,
    focus_muscle_group: s.goals.focusMuscleGroup ?? null,
    current_weight: s.bodyStats.currentWeight ?? null,
    height: s.bodyStats.height ?? null,
    featured_exercises: s.featuredExercises,
    hidden_exercise_ids: s.hiddenExerciseIds ?? [],
  };
}

export function exerciseToRow(userId: string, e: Exercise) {
  return {
    id: e.id,
    user_id: userId,
    name: e.name,
    muscle_group: e.muscleGroup,
    is_custom: e.isCustom,
  };
}

export function templateToRow(userId: string, t: WorkoutTemplate) {
  return {
    id: t.id,
    user_id: userId,
    name: t.name,
    created_at: t.createdAt,
    updated_at: t.updatedAt,
  };
}

export function templateExerciseRows(userId: string, t: WorkoutTemplate) {
  return t.exercises.map((e, i) => ({
    id: `${t.id}__te_${i}`,
    template_id: t.id,
    user_id: userId,
    exercise_id: e.exerciseId,
    exercise_name: e.exerciseName,
    muscle_group: e.muscleGroup,
    notes: e.notes ?? null,
    position: i,
  }));
}

export function workoutToRow(userId: string, w: WorkoutSession) {
  return {
    id: w.id,
    user_id: userId,
    name: w.name,
    date: w.date,
    started_at: w.startedAt,
    ended_at: w.endedAt,
    duration_sec: w.durationSec,
    total_volume: w.totalVolume,
    completed: w.completed,
  };
}

export function workoutExerciseRows(userId: string, w: WorkoutSession) {
  return w.exercises.map((e, i) => ({
    id: e.id,
    workout_id: w.id,
    user_id: userId,
    exercise_id: e.exerciseId,
    name: e.name,
    muscle_group: e.muscleGroup,
    notes: e.notes ?? null,
    position: i,
  }));
}

export function setRows(userId: string, w: WorkoutSession) {
  return w.exercises.flatMap((e) =>
    e.sets.map((s, i) => ({
      id: s.id,
      workout_exercise_id: e.id,
      user_id: userId,
      reps: s.reps,
      weight: s.weight,
      completed: s.completed,
      position: i,
    })),
  );
}
