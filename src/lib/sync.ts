// Sync layer: load a user's data from Supabase into domain objects, and persist
// individual entities back. Writes are owner-scoped by Row Level Security, but we
// still pass user_id explicitly because the columns are NOT NULL and RLS checks
// `auth.uid() = user_id` on insert.

import {
  BodyWeightEntry,
  Exercise,
  Settings,
  WorkoutSession,
  WorkoutTemplate,
} from '../types';
import {
  BodyWeightRow,
  ExerciseRow,
  ProfileRow,
  SetRow,
  TemplateExerciseRow,
  TemplateRow,
  WorkoutExerciseRow,
  WorkoutRow,
  bodyWeightToRow,
  exerciseToRow,
  rowToBodyWeight,
  rowToExercise,
  rowToSettings,
  rowsToTemplate,
  rowsToWorkout,
  setRows,
  settingsToProfileRow,
  templateExerciseRows,
  templateToRow,
  workoutExerciseRows,
  workoutToRow,
} from './mappers';
import { supabase } from './supabase';

export interface UserData {
  settings: Settings | null;
  customExercises: Exercise[];
  templates: WorkoutTemplate[];
  workouts: WorkoutSession[]; // newest first
  bodyWeights: BodyWeightEntry[]; // oldest first
}

function groupBy<T, K>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = map.get(k);
    if (bucket) bucket.push(item);
    else map.set(k, [item]);
  }
  return map;
}

/** Fetch everything for a signed-in user and assemble it into domain objects. */
export async function loadUserData(userId: string): Promise<UserData> {
  const [profileRes, exercisesRes, templatesRes, templateExRes, workoutsRes, workoutExRes, setsRes, bodyWeightsRes] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('exercises').select('*').eq('user_id', userId),
      supabase.from('templates').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('template_exercises').select('*').eq('user_id', userId),
      supabase.from('workouts').select('*').eq('user_id', userId).order('started_at', { ascending: false }),
      supabase.from('workout_exercises').select('*').eq('user_id', userId),
      supabase.from('sets').select('*').eq('user_id', userId),
      supabase.from('body_weights').select('*').eq('user_id', userId).order('date', { ascending: true }),
    ]);

  const firstError =
    profileRes.error ||
    exercisesRes.error ||
    templatesRes.error ||
    templateExRes.error ||
    workoutsRes.error ||
    workoutExRes.error ||
    setsRes.error ||
    bodyWeightsRes.error;
  if (firstError) throw firstError;

  const templateExByTemplate = groupBy(
    (templateExRes.data ?? []) as TemplateExerciseRow[],
    (r) => r.template_id,
  );
  const workoutExByWorkout = groupBy(
    (workoutExRes.data ?? []) as WorkoutExerciseRow[],
    (r) => r.workout_id,
  );
  const setsByExercise = groupBy((setsRes.data ?? []) as SetRow[], (r) => r.workout_exercise_id);

  return {
    settings: profileRes.data ? rowToSettings(profileRes.data as ProfileRow) : null,
    customExercises: ((exercisesRes.data ?? []) as ExerciseRow[]).map(rowToExercise),
    templates: ((templatesRes.data ?? []) as TemplateRow[]).map((t) =>
      rowsToTemplate(t, templateExByTemplate.get(t.id) ?? []),
    ),
    workouts: ((workoutsRes.data ?? []) as WorkoutRow[]).map((w) =>
      rowsToWorkout(w, workoutExByWorkout.get(w.id) ?? [], setsByExercise),
    ),
    bodyWeights: ((bodyWeightsRes.data ?? []) as BodyWeightRow[]).map(rowToBodyWeight),
  };
}

// ---- Write-through persistence (callers fire-and-forget + .catch) ----------

export async function saveSettings(userId: string, settings: Settings): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .upsert(settingsToProfileRow(userId, settings), { onConflict: 'id' });
  if (error) throw error;
}

export async function saveCustomExercise(userId: string, exercise: Exercise): Promise<void> {
  const { error } = await supabase.from('exercises').upsert(exerciseToRow(userId, exercise));
  if (error) throw error;
}

export async function deleteCustomExercise(exerciseId: string): Promise<void> {
  const { error } = await supabase.from('exercises').delete().eq('id', exerciseId);
  if (error) throw error;
}

export async function saveBodyWeight(userId: string, entry: BodyWeightEntry): Promise<void> {
  // One row per day: upsert on (user_id, date) so re-logging today overwrites.
  const { error } = await supabase
    .from('body_weights')
    .upsert(bodyWeightToRow(userId, entry), { onConflict: 'user_id,date' });
  if (error) throw error;
}

export async function saveTemplate(userId: string, template: WorkoutTemplate): Promise<void> {
  const { error: tErr } = await supabase.from('templates').upsert(templateToRow(userId, template));
  if (tErr) throw tErr;
  // Replace child rows wholesale so removed exercises don't linger.
  const { error: delErr } = await supabase
    .from('template_exercises')
    .delete()
    .eq('template_id', template.id);
  if (delErr) throw delErr;
  const rows = templateExerciseRows(userId, template);
  if (rows.length) {
    const { error: insErr } = await supabase.from('template_exercises').insert(rows);
    if (insErr) throw insErr;
  }
}

export async function deleteTemplate(templateId: string): Promise<void> {
  // ON DELETE CASCADE removes template_exercises.
  const { error } = await supabase.from('templates').delete().eq('id', templateId);
  if (error) throw error;
}

/** PostgREST `in.(...)` filter value for a list of text ids. */
function idList(ids: string[]): string {
  return `(${ids.map((id) => `"${id}"`).join(',')})`;
}

export async function saveWorkout(userId: string, workout: WorkoutSession): Promise<void> {
  const { error: wErr } = await supabase.from('workouts').upsert(workoutToRow(userId, workout));
  if (wErr) throw wErr;

  // Upsert children first and prune stale rows last, so a failure part-way
  // through never leaves the workout empty on the server. (The previous
  // delete-then-insert order did: a schema or RLS error on the insert wiped
  // the server copy, which then clobbered local history on the next merge.)
  const exRows = workoutExerciseRows(userId, workout);
  if (exRows.length) {
    const { error: exErr } = await supabase.from('workout_exercises').upsert(exRows);
    if (exErr) throw exErr;
  }
  const sRows = setRows(userId, workout);
  if (sRows.length) {
    const { error: sErr } = await supabase.from('sets').upsert(sRows);
    if (sErr) throw sErr;
  }

  // Prune exercises removed since the last sync (cascade clears their sets),
  // then sets removed from the exercises that remain.
  const exIds = exRows.map((r) => r.id);
  let pruneEx = supabase.from('workout_exercises').delete().eq('workout_id', workout.id);
  if (exIds.length) pruneEx = pruneEx.not('id', 'in', idList(exIds));
  const { error: pruneExErr } = await pruneEx;
  if (pruneExErr) throw pruneExErr;

  if (exIds.length) {
    let pruneSets = supabase.from('sets').delete().in('workout_exercise_id', exIds);
    if (sRows.length) pruneSets = pruneSets.not('id', 'in', idList(sRows.map((r) => r.id)));
    const { error: pruneSetsErr } = await pruneSets;
    if (pruneSetsErr) throw pruneSetsErr;
  }
}

/** Wrap a write-through call so a failed sync logs but never breaks the UI. */
export function fireAndForget(label: string, p: Promise<unknown>): void {
  p.catch((err) => console.warn(`[sync] ${label} failed:`, err?.message ?? err));
}
