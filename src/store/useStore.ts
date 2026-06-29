import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_EXERCISES } from '../data/exercises';
import {
  deleteCustomExercise as deleteCustomExerciseRemote,
  deleteTemplate as deleteTemplateRemote,
  fireAndForget,
  loadUserData,
  saveBodyWeight,
  saveCustomExercise,
  saveSettings,
  saveTemplate,
  saveWorkout,
} from '../lib/sync';
import {
  BodyWeightEntry,
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
import { computePRs, epley1RM, lastPerformance, lastWorkout } from '../utils/stats';

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
  toggleSetComplete: (workoutExerciseId: string, setId: string) => void;
  completeExercise: (workoutExerciseId: string) => void;
  removeSet: (workoutExerciseId: string, setId: string) => void;
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
          },
          hydrated: true,
        });
      },

      loadFromServer: async (userId) => {
        const data = await loadUserData(userId);
        const settings = data.settings ?? DEFAULT_SETTINGS;
        set({
          userId,
          // Custom (server) exercises first, then the default library minus any
          // built-ins this user has hidden.
          exercises: [...data.customExercises, ...visibleDefaults(settings.hiddenExerciseIds)],
          workouts: data.workouts,
          templates: data.templates,
          settings,
          bodyWeights: data.bodyWeights,
          activeWorkout: get().userId === userId ? get().activeWorkout : null,
        });
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
        if (userId) fireAndForget('saveTemplate', saveTemplate(userId, template));
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
        if (userId && updated) fireAndForget('saveTemplate', saveTemplate(userId, updated));
      },

      deleteTemplate: (id) => {
        set((s) => ({ templates: s.templates.filter((t) => t.id !== id) }));
        if (get().userId) fireAndForget('deleteTemplate', deleteTemplateRemote(id));
      },

      updateSettings: (patch) => {
        set((s) => ({ settings: { ...s.settings, ...patch } }));
        const userId = get().userId;
        if (userId) fireAndForget('saveSettings', saveSettings(userId, get().settings));
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
        if (userId) fireAndForget('saveCustomExercise', saveCustomExercise(userId, exercise));
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
          if (isCustom) fireAndForget('deleteCustomExercise', deleteCustomExerciseRemote(id));
          if (settingsChanged) fireAndForget('saveSettings', saveSettings(userId, get().settings));
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
        if (userId) fireAndForget('saveBodyWeight', saveBodyWeight(userId, entry));
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
                  completed: false,
                }))
              : [{ id: uid('set'), reps: 10, weight: 20, completed: false }];
          return {
            id: uid('we'),
            exerciseId: te.exerciseId,
            name: te.exerciseName,
            muscleGroup: te.muscleGroup,
            notes: te.notes ?? '',
            sets,
          };
        });
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

      finishWorkout: () => {
        const active = get().activeWorkout;
        if (!active) return null;
        const now = Date.now();

        // Keep only the sets the user actually completed.
        const exercises = active.exercises
          .map((we) => ({ ...we, sets: we.sets.filter((s) => s.completed) }))
          .filter((we) => we.sets.length > 0);

        const totalVolume = exercises.reduce(
          (sum, we) => sum + we.sets.reduce((v, s) => v + s.reps * s.weight, 0),
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
        if (userId) fireAndForget('saveWorkout', saveWorkout(userId, session));

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
                completed: false,
              }))
            : [{ id: uid('set'), reps: 10, weight: 20, completed: false }];

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
        set({
          activeWorkout: {
            ...active,
            exercises: active.exercises.filter((we) => we.id !== workoutExerciseId),
          },
        });
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
            const next: SetEntry = last
              ? { id: uid('set'), reps: last.reps, weight: last.weight, completed: false }
              : { id: uid('set'), reps: 10, weight: 20, completed: false };
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
