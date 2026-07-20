import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_EXERCISES } from '../data/exercises';
import { mergeWorkoutHistories } from '../lib/merge';
import { loadUserData } from '../lib/sync';
import { drain as drainOutbox, enqueue } from '../lib/outbox';
import {
  BodyWeightEntry,
  DropStage,
  Exercise,
  MuscleGroup,
  NewPR,
  SetEntry,
  Settings,
  TemplateExercise,
  WorkoutExercise,
  WorkoutSession,
  WorkoutSummary,
  WorkoutTemplate,
} from '../types';
import { dayKey } from '../utils/date';
import { uid } from '../utils/id';
import { computePRs, epley1RM, lastPerformance, lastWorkout, setVolume } from '../utils/stats';

interface StoreState {
  // persisted data
  exercises: Exercise[];
  workouts: WorkoutSession[]; // completed history, newest first
  templates: WorkoutTemplate[]; // reusable plans, newest first
  activeWorkout: WorkoutSession | null;
  settings: Settings;
  bodyWeights: BodyWeightEntry[]; // dated weigh-ins, oldest first
  hasSeeded: boolean;

  // runtime only
  hydrated: boolean;
  /** Supabase auth user id of the loaded account, or null when signed out. */
  userId: string | null;

  // lifecycle
  finishHydration: () => void;
  factoryReset: () => void;
  /** Replace local state with the signed-in user's data from Supabase. */
  loadFromServer: (userId: string) => Promise<void>;
  /** Clear the in-memory/local cache on sign-out. */
  resetLocal: () => void;
  /** Adopt an auth user id without touching local data. Used when the server
   *  load can't run (offline) but the rehydrated cache belongs to this account,
   *  so offline writes still enqueue against the right user. */
  setUserId: (userId: string) => void;

  // library
  addExercise: (name: string, muscleGroup: MuscleGroup) => Exercise;
  /** Remove a user-created exercise from the library (no-op for built-ins). */
  deleteExercise: (id: string) => void;

  /** Record today's bodyweight (one entry per day; re-logging overwrites). */
  logBodyWeight: (weight: number) => void;

  // templates
  addTemplate: (name: string, exercises: TemplateExercise[]) => WorkoutTemplate;
  updateTemplate: (
    id: string,
    patch: Partial<Pick<WorkoutTemplate, 'name' | 'exercises'>>,
  ) => void;
  deleteTemplate: (id: string) => void;

  // settings
  updateSettings: (patch: Partial<Settings>) => void;

  // session lifecycle
  startWorkout: (name?: string) => void;
  startWorkoutFrom: (sessionId: string) => boolean;
  startWorkoutFromTemplate: (templateId: string) => boolean;
  repeatLastWorkout: () => boolean;
  discardWorkout: () => void;
  renameWorkout: (name: string) => void;
  /** Restore a prior snapshot of the active session (used to undo a removal). */
  replaceActiveWorkout: (session: WorkoutSession) => void;
  finishWorkout: () => WorkoutSummary | null;

  // active session mutations
  addExerciseToWorkout: (exerciseId: string) => void;
  removeWorkoutExercise: (workoutExerciseId: string) => void;
  setExerciseNotes: (workoutExerciseId: string, notes: string) => void;
  addSet: (workoutExerciseId: string) => void;
  updateSet: (
    workoutExerciseId: string,
    setId: string,
    patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>,
  ) => void;
  updateSetDuration: (workoutExerciseId: string, setId: string, durationSec: number) => void;
  toggleSetComplete: (workoutExerciseId: string, setId: string) => void;
  completeExercise: (workoutExerciseId: string) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;

  // drop sets
  toggleDropSet: (workoutExerciseId: string, setId: string) => void;
  addDropStage: (workoutExerciseId: string, setId: string) => void;
  updateDropStage: (
    workoutExerciseId: string,
    setId: string,
    dropId: string,
    patch: Partial<Pick<DropStage, 'reps' | 'weight'>>,
  ) => void;
  removeDropStage: (workoutExerciseId: string, setId: string, dropId: string) => void;

  // supersets
  linkSuperset: (workoutExerciseIds: string[]) => void;
  unlinkSuperset: (supersetId: string) => void;
}

const DEFAULT_SETTINGS: Settings = {
  userName: 'Athlete',
  weeklyGoal: 4,
  unit: 'kg',
  profile: {},
  goals: {},
  bodyStats: {},
  featuredExercises: ['ex_squat', 'ex_bench_press', 'ex_deadlift'],
  hiddenExerciseIds: [],
  customSplits: [],
  muscleColors: {},
};

/** Default library minus the built-ins this user has hidden/deleted. */
function visibleDefaults(hiddenIds?: string[]): Exercise[] {
  if (!hiddenIds?.length) return DEFAULT_EXERCISES;
  const hidden = new Set(hiddenIds);
  return DEFAULT_EXERCISES.filter((e) => !hidden.has(e.id));
}

function newSession(name: string): WorkoutSession {
  const now = Date.now();
  return {
    id: uid('w'),
    name,
    date: new Date(now).toISOString(),
    startedAt: now,
    endedAt: null,
    durationSec: 0,
    exercises: [],
    totalVolume: 0,
    completed: false,
  };
}

/** Immutably update one exercise inside the active workout. */
function mapExercise(
  active: WorkoutSession,
  workoutExerciseId: string,
  fn: (we: WorkoutExercise) => WorkoutExercise,
): WorkoutSession {
  return {
    ...active,
    exercises: active.exercises.map((we) =>
      we.id === workoutExerciseId ? fn(we) : we,
    ),
  };
}

/** Immutably update one set inside one exercise of the active workout. */
function mapSet(
  active: WorkoutSession,
  workoutExerciseId: string,
  setId: string,
  fn: (s: SetEntry) => SetEntry,
): WorkoutSession {
  return mapExercise(active, workoutExerciseId, (we) => ({
    ...we,
    sets: we.sets.map((s) => (s.id === setId ? fn(s) : s)),
  }));
}

/** A fresh set, shaped for cardio (timer) or strength (weight/reps) exercises. */
function defaultSet(muscleGroup: MuscleGroup): SetEntry {
  if (muscleGroup === 'Cardio') {
    return { id: uid('set'), reps: 0, weight: 0, durationSec: 0, completed: false };
  }
  return { id: uid('set'), reps: 10, weight: 20, completed: false };
}

/** Default weight for a new drop stage — ~20% lighter than the stage before it. */
function nextDropWeight(weight: number): number {
  return Math.max(0, Math.round(((weight * 0.8) / 2.5)) * 2.5);
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      exercises: DEFAULT_EXERCISES,
      workouts: [],
      templates: [],
      activeWorkout: null,
      settings: DEFAULT_SETTINGS,
      bodyWeights: [],
      hasSeeded: false,
      hydrated: false,
      userId: null,

      finishHydration: () => {
        const state = get();
        // Backfill settings shape for stores persisted before profile/goals/body
        // stats existed, so the Settings screen can read nested fields safely.
        // Server data (loadFromServer) overwrites this once the user is signed in;
        // until then the AsyncStorage cache provides instant, offline-first state.
        const s = state.settings ?? DEFAULT_SETTINGS;
        set({
          templates: state.templates ?? [],
          bodyWeights: state.bodyWeights ?? [],
          settings: {
            ...DEFAULT_SETTINGS,
            ...s,
            profile: { ...DEFAULT_SETTINGS.profile, ...s.profile },
            goals: { ...DEFAULT_SETTINGS.goals, ...s.goals },
            bodyStats: { ...DEFAULT_SETTINGS.bodyStats, ...s.bodyStats },
            featuredExercises:
              s.featuredExercises?.length ? s.featuredExercises : DEFAULT_SETTINGS.featuredExercises,
            hiddenExerciseIds: s.hiddenExerciseIds ?? [],
            customSplits: s.customSplits ?? [],
            muscleColors: s.muscleColors ?? {},
          },
          hydrated: true,
        });
      },

      loadFromServer: async (userId) => {
        // Drain any writes queued while offline first, so the server reflects them
        // before we read back and merge.
        await drainOutbox();
        const data = await loadUserData(userId);
        const settings = data.settings ?? DEFAULT_SETTINGS;
        const local = get();

        // Workouts and weigh-ins are append-only (never deleted in-app), so union
        // by id/date — server wins on conflict — to guarantee a session or weigh-in
        // that failed to sync offline is never lost. A server workout that came
        // back empty (partial sync) loses to a non-empty local copy and is
        // re-uploaded below. Templates, custom exercises and settings stay
        // server-authoritative so deletions are honoured.
        const { merged: workouts, needsResync } = mergeWorkoutHistories(
          local.workouts,
          data.workouts,
        );
        const mergeBodyWeights = () => {
          const byDate = new Map<string, BodyWeightEntry>();
          for (const e of local.bodyWeights) byDate.set(e.date, e);
          for (const e of data.bodyWeights) byDate.set(e.date, e);
          return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
        };

        set({
          userId,
          // Custom (server) exercises first, then the default library minus any
          // built-ins this user has hidden.
          exercises: [...data.customExercises, ...visibleDefaults(settings.hiddenExerciseIds)],
          // Merge unconditionally: sign-out clears local data (resetLocal), so any
          // restored local workouts/weigh-ins belong to the account signing in.
          workouts,
          templates: data.templates,
          settings,
          bodyWeights: mergeBodyWeights(),
          // Keep the in-progress workout across a reload / PWA reopen. `userId` is
          // runtime-only (never persisted), so after a cold start local.userId is
          // null even though the rehydrated activeWorkout belongs to this account —
          // treat null as "same user" and keep it. Only a genuine account switch (a
          // different non-null id still in memory) drops it; sign-out already clears
          // it via resetLocal.
          activeWorkout:
            local.userId === null || local.userId === userId ? local.activeWorkout : null,
        });

        // Heal the server: push back any workout whose server copy lost its
        // exercises to a partial sync.
        for (const w of needsResync) enqueue(userId, { kind: 'workout', payload: w });
      },

      resetLocal: () =>
        set({
          userId: null,
          exercises: DEFAULT_EXERCISES,
          workouts: [],
          templates: [],
          activeWorkout: null,
          settings: DEFAULT_SETTINGS,
          bodyWeights: [],
        }),

      setUserId: (userId) => set({ userId }),

      factoryReset: () =>
        set({
          exercises: DEFAULT_EXERCISES,
          workouts: [],
          templates: [],
          activeWorkout: null,
          settings: DEFAULT_SETTINGS,
          bodyWeights: [],
          hasSeeded: true,
        }),

      addTemplate: (name, exercises) => {
        const now = new Date().toISOString();
        const template: WorkoutTemplate = {
          id: uid('tpl'),
          name: name.trim() || 'Template',
          exercises,
          createdAt: now,
          updatedAt: now,
        };
        set((s) => ({ templates: [template, ...s.templates] }));
        const userId = get().userId;
        if (userId) enqueue(userId, { kind: 'template', payload: template });
        return template;
      },

      updateTemplate: (id, patch) => {
        set((s) => ({
          templates: s.templates.map((t) =>
            t.id === id
              ? {
                  ...t,
                  ...patch,
                  name: patch.name !== undefined ? patch.name.trim() || t.name : t.name,
                  updatedAt: new Date().toISOString(),
                }
              : t,
          ),
        }));
        const userId = get().userId;
        const updated = get().templates.find((t) => t.id === id);
        if (userId && updated) enqueue(userId, { kind: 'template', payload: updated });
      },

      deleteTemplate: (id) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
        const userId = get().userId;
        if (userId) enqueue(userId, { kind: 'templateDelete', payload: { id } });
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        const userId = get().userId;
        if (userId) enqueue(userId, { kind: 'settings', payload: get().settings });
      },

      addExercise: (name, muscleGroup) => {
        const exercise: Exercise = {
          id: uid('ex_custom'),
          name: name.trim(),
          muscleGroup,
          isCustom: true,
        };
        set((s) => ({ exercises: [exercise, ...s.exercises] }));
        const userId = get().userId;
        if (userId) enqueue(userId, { kind: 'customExercise', payload: exercise });
        return exercise;
      },

      deleteExercise: (id) => {
        const ex = get().exercises.find((e) => e.id === id);
        if (!ex) return;
        const isCustom = ex.isCustom;

        const prev = get().settings;
        const wasFeatured = (prev.featuredExercises ?? []).includes(id);
        // Custom exercises are deleted outright; built-ins are hidden per-user so
        // the deletion only affects this account, never the shared library.
        const hiddenExerciseIds = isCustom
          ? prev.hiddenExerciseIds ?? []
          : Array.from(new Set([...(prev.hiddenExerciseIds ?? []), id]));

        const nextSettings: Settings = {
          ...prev,
          featuredExercises: wasFeatured
            ? (prev.featuredExercises ?? []).filter((f) => f !== id)
            : prev.featuredExercises,
          hiddenExerciseIds,
        };
        const settingsChanged = wasFeatured || !isCustom;

        set((s) => ({
          exercises: s.exercises.filter((e) => e.id !== id),
          settings: settingsChanged ? nextSettings : s.settings,
        }));

        const userId = get().userId;
        if (userId) {
          if (isCustom) enqueue(userId, { kind: 'exerciseDelete', payload: { id } });
          if (settingsChanged) enqueue(userId, { kind: 'settings', payload: get().settings });
        }
      },

      logBodyWeight: (weight) => {
        if (!Number.isFinite(weight) || weight <= 0) return;
        const today = dayKey(Date.now());
        const existing = get().bodyWeights.find((e) => e.date === today);
        const entry: BodyWeightEntry = existing
          ? { ...existing, weight, loggedAt: Date.now() }
          : { id: uid('bw'), date: today, weight, loggedAt: Date.now() };

        set((s) => ({
          bodyWeights: existing
            ? s.bodyWeights.map((e) => (e.date === today ? entry : e))
            : [...s.bodyWeights, entry].sort((a, b) => a.date.localeCompare(b.date)),
        }));

        const userId = get().userId;
        if (userId) enqueue(userId, { kind: 'bodyWeight', payload: entry });
      },

      startWorkout: (name) => {
        if (get().activeWorkout) return; // already training — resume instead
        set({ activeWorkout: newSession(name ?? 'Workout') });
      },

      startWorkoutFrom: (sessionId) => {
        const source = get().workouts.find((w) => w.id === sessionId);
        if (!source) return false;
        const session = newSession(source.name);
        session.exercises = source.exercises.map((we) => ({
          id: uid('we'),
          exerciseId: we.exerciseId,
          name: we.name,
          muscleGroup: we.muscleGroup,
          notes: '',
          sets: we.sets.map<SetEntry>((s) => ({
            id: uid('set'),
            reps: s.reps,
            weight: s.weight,
            durationSec: s.durationSec !== undefined ? 0 : undefined,
            completed: false,
          })),
        }));
        set({ activeWorkout: session });
        return true;
      },

      startWorkoutFromTemplate: (templateId) => {
        if (get().activeWorkout) return false; // already training
        const tpl = get().templates.find((t) => t.id === templateId);
        if (!tpl) return false;
        const session = newSession(tpl.name); // autofill the workout name from the template
        session.exercises = tpl.exercises.map((te) => {
          const prev = lastPerformance(get().workouts, te.exerciseId);
          const sets: SetEntry[] =
            prev && prev.sets.length > 0
              ? prev.sets.map((s) => ({
                  id: uid('set'),
                  reps: s.reps,
                  weight: s.weight,
                  durationSec: s.durationSec !== undefined ? 0 : undefined,
                  completed: false,
                }))
              : [defaultSet(te.muscleGroup)];
          return {
            id: uid('we'),
            exerciseId: te.exerciseId,
            name: te.exerciseName,
            muscleGroup: te.muscleGroup,
            notes: te.notes ?? '',
            sets,
          };
        });
        session.templateId = templateId; // remember the source for template save/update
        set({ activeWorkout: session });
        return true;
      },

      repeatLastWorkout: () => {
        const last = lastWorkout(get().workouts);
        if (!last) return false;
        return get().startWorkoutFrom(last.id);
      },

      discardWorkout: () => set({ activeWorkout: null }),

      renameWorkout: (name) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({ activeWorkout: { ...active, name } });
      },

      replaceActiveWorkout: (session) => set({ activeWorkout: session }),

      finishWorkout: () => {
        const active = get().activeWorkout;
        if (!active) return null;
        const now = Date.now();

        // Keep only the sets the user actually completed.
        const exercises = active.exercises
          .map((we) => ({ ...we, sets: we.sets.filter((s) => s.completed) }))
          .filter((we) => we.sets.length > 0);

        const totalVolume = exercises.reduce(
          (sum, we) => sum + we.sets.reduce((v, s) => v + setVolume(s), 0),
          0,
        );
        const durationSec = Math.max(1, Math.round((now - active.startedAt) / 1000));

        const session: WorkoutSession = {
          ...active,
          exercises,
          totalVolume,
          endedAt: now,
          durationSec,
          completed: true,
        };

        // Detect new personal records vs all prior history.
        const prsBefore = computePRs(get().workouts);
        const newPRs: NewPR[] = [];
        for (const we of exercises) {
          const prevMax = prsBefore[we.exerciseId]?.maxWeight ?? 0;
          let best: SetEntry | null = null;
          for (const s of we.sets) {
            if (
              !best ||
              s.weight > best.weight ||
              (s.weight === best.weight && s.reps > best.reps)
            )
              best = s;
          }
          if (best && best.weight > prevMax && best.weight > 0) {
            newPRs.push({
              exerciseName: we.name,
              weight: best.weight,
              reps: best.reps,
              e1rm: epley1RM(best.weight, best.reps),
            });
          }
        }

        const prev = lastWorkout(get().workouts);
        const volumeChangePct =
          prev && prev.totalVolume > 0
            ? ((totalVolume - prev.totalVolume) / prev.totalVolume) * 100
            : null;

        set((s) => ({ workouts: [session, ...s.workouts], activeWorkout: null }));

        const userId = get().userId;
        if (userId) enqueue(userId, { kind: 'workout', payload: session });

        const muscleGroups = Array.from(
          new Set(exercises.map((e) => e.muscleGroup)),
        ) as MuscleGroup[];

        return {
          sessionId: session.id,
          name: session.name,
          durationSec,
          totalVolume,
          totalSets: exercises.reduce((n, we) => n + we.sets.length, 0),
          exerciseCount: exercises.length,
          muscleGroups,
          newPRs,
          volumeChangePct,
        };
      },

      addExerciseToWorkout: (exerciseId) => {
        const active = get().activeWorkout;
        const exercise = get().exercises.find((e) => e.id === exerciseId);
        if (!active || !exercise) return;

        const prev = lastPerformance(get().workouts, exerciseId);
        const sets: SetEntry[] =
          prev && prev.sets.length > 0
            ? prev.sets.map((s) => ({
                id: uid('set'),
                reps: s.reps,
                weight: s.weight,
                durationSec: s.durationSec !== undefined ? 0 : undefined,
                completed: false,
              }))
            : [defaultSet(exercise.muscleGroup)];

        const we: WorkoutExercise = {
          id: uid('we'),
          exerciseId,
          name: exercise.name,
          muscleGroup: exercise.muscleGroup,
          notes: '',
          sets,
        };
        set({ activeWorkout: { ...active, exercises: [...active.exercises, we] } });
      },

      removeWorkoutExercise: (workoutExerciseId) => {
        const active = get().activeWorkout;
        if (!active) return;
        const removed = active.exercises.find((we) => we.id === workoutExerciseId);
        let exercises = active.exercises.filter((we) => we.id !== workoutExerciseId);
        // A "superset" of one is meaningless — dissolve it if removal left a lone member.
        if (removed?.supersetId) {
          const remaining = exercises.filter((we) => we.supersetId === removed.supersetId);
          if (remaining.length === 1) {
            exercises = exercises.map((we) =>
              we.id === remaining[0].id ? { ...we, supersetId: undefined } : we,
            );
          }
        }
        set({ activeWorkout: { ...active, exercises } });
      },

      setExerciseNotes: (workoutExerciseId, notes) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapExercise(active, workoutExerciseId, (we) => ({
            ...we,
            notes,
          })),
        });
      },

      addSet: (workoutExerciseId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapExercise(active, workoutExerciseId, (we) => {
            const last = we.sets[we.sets.length - 1];
            const next: SetEntry =
              last && we.muscleGroup === 'Cardio'
                ? { id: uid('set'), reps: 0, weight: 0, durationSec: 0, completed: false }
                : last
                  ? { id: uid('set'), reps: last.reps, weight: last.weight, completed: false }
                  : defaultSet(we.muscleGroup);
            return { ...we, sets: [...we.sets, next] };
          }),
        });
      },

      updateSet: (workoutExerciseId, setId, patch) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapExercise(active, workoutExerciseId, (we) => ({
            ...we,
            sets: we.sets.map((s) =>
              s.id === setId
                ? {
                    ...s,
                    ...patch,
                    reps: patch.reps !== undefined ? Math.max(0, patch.reps) : s.reps,
                    weight:
                      patch.weight !== undefined ? Math.max(0, patch.weight) : s.weight,
                  }
                : s,
            ),
          })),
        });
      },

      updateSetDuration: (workoutExerciseId, setId, durationSec) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapSet(active, workoutExerciseId, setId, (s) => ({
            ...s,
            durationSec: Math.max(0, Math.round(durationSec)),
          })),
        });
      },

      toggleSetComplete: (workoutExerciseId, setId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapExercise(active, workoutExerciseId, (we) => ({
            ...we,
            sets: we.sets.map((s) =>
              s.id === setId ? { ...s, completed: !s.completed } : s,
            ),
          })),
        });
      },

      // Exercise-level completion (replaces per-set ticks in the UI). Marks every
      // set of the exercise complete, or reopens it for editing if already done.
      completeExercise: (workoutExerciseId) => {
        const active = get().activeWorkout;
        if (!active) return;
        const we = active.exercises.find((e) => e.id === workoutExerciseId);
        if (!we) return;
        const allDone = we.sets.length > 0 && we.sets.every((s) => s.completed);
        set({
          activeWorkout: mapExercise(active, workoutExerciseId, (x) => ({
            ...x,
            sets: x.sets.map((s) => ({ ...s, completed: !allDone })),
          })),
        });
      },

      removeSet: (workoutExerciseId, setId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapExercise(active, workoutExerciseId, (we) => ({
            ...we,
            sets: we.sets.filter((s) => s.id !== setId),
          })),
        });
      },

      toggleDropSet: (workoutExerciseId, setId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapSet(active, workoutExerciseId, setId, (s) =>
            s.drops
              ? { ...s, drops: undefined }
              : {
                  ...s,
                  drops: [{ id: uid('drop'), reps: s.reps, weight: nextDropWeight(s.weight) }],
                },
          ),
        });
      },

      addDropStage: (workoutExerciseId, setId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapSet(active, workoutExerciseId, setId, (s) => {
            const last = s.drops?.[s.drops.length - 1];
            const stage: DropStage = last
              ? { id: uid('drop'), reps: last.reps, weight: nextDropWeight(last.weight) }
              : { id: uid('drop'), reps: s.reps, weight: nextDropWeight(s.weight) };
            return { ...s, drops: [...(s.drops ?? []), stage] };
          }),
        });
      },

      updateDropStage: (workoutExerciseId, setId, dropId, patch) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapSet(active, workoutExerciseId, setId, (s) => ({
            ...s,
            drops: s.drops?.map((d) =>
              d.id === dropId
                ? {
                    ...d,
                    ...patch,
                    reps: patch.reps !== undefined ? Math.max(0, patch.reps) : d.reps,
                    weight: patch.weight !== undefined ? Math.max(0, patch.weight) : d.weight,
                  }
                : d,
            ),
          })),
        });
      },

      removeDropStage: (workoutExerciseId, setId, dropId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: mapSet(active, workoutExerciseId, setId, (s) => {
            const drops = s.drops?.filter((d) => d.id !== dropId);
            return { ...s, drops: drops?.length ? drops : undefined };
          }),
        });
      },

      linkSuperset: (workoutExerciseIds) => {
        const active = get().activeWorkout;
        if (!active || workoutExerciseIds.length < 2) return;
        const idSet = new Set(workoutExerciseIds);
        const supersetId = uid('ss');
        const firstIndex = active.exercises.findIndex((we) => idSet.has(we.id));
        if (firstIndex === -1) return;

        // Stamp the shared id, then pull members together (in selection order) at
        // the position of the first member, so they render as one contiguous
        // group while everyone else keeps their relative order.
        const members = workoutExerciseIds
          .map((id) => active.exercises.find((we) => we.id === id))
          .filter((we): we is WorkoutExercise => !!we)
          .map((we) => ({ ...we, supersetId }));
        const others = active.exercises.filter((we) => !idSet.has(we.id));
        const insertAt = active.exercises.slice(0, firstIndex).filter((we) => !idSet.has(we.id)).length;

        set({
          activeWorkout: {
            ...active,
            exercises: [...others.slice(0, insertAt), ...members, ...others.slice(insertAt)],
          },
        });
      },

      unlinkSuperset: (supersetId) => {
        const active = get().activeWorkout;
        if (!active) return;
        set({
          activeWorkout: {
            ...active,
            exercises: active.exercises.map((we) =>
              we.supersetId === supersetId ? { ...we, supersetId: undefined } : we,
            ),
          },
        });
      },
    }),
    {
      name: 'progressive-store-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        exercises: s.exercises,
        workouts: s.workouts,
        templates: s.templates,
        activeWorkout: s.activeWorkout,
        settings: s.settings,
        bodyWeights: s.bodyWeights,
        hasSeeded: s.hasSeeded,
      }),
      onRehydrateStorage: () => (state) => {
        state?.finishHydration();
      },
    },
  ),
);
