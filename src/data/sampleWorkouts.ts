import { MuscleGroup, SetEntry, WorkoutExercise, WorkoutSession } from '../types';
import { addDays, startOfDay } from '../utils/date';
import { uid } from '../utils/id';

interface SeedSet {
  reps: number;
  weight: number;
}
interface SeedExercise {
  exerciseId: string;
  name: string;
  muscleGroup: MuscleGroup;
  notes?: string;
  sets: SeedSet[];
}
interface SeedWorkout {
  daysAgo: number;
  name: string;
  hour: number;
  durationMin: number;
  exercises: SeedExercise[];
}

/**
 * A realistic ~2 week Push/Pull/Legs block. Defined relative to "now" so the
 * dashboard, streak and charts always look alive on first launch. Includes a
 * deliberate progressive-overload trend on the big lifts (bench, squat, deadlift)
 * and three consecutive recent days to demonstrate the streak feature.
 */
const SEEDS: SeedWorkout[] = [
  {
    daysAgo: 12,
    name: 'Push Day',
    hour: 18,
    durationMin: 58,
    exercises: [
      { exerciseId: 'ex_bench_press', name: 'Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 60 }, { reps: 8, weight: 60 }, { reps: 6, weight: 62.5 }] },
      { exerciseId: 'ex_incline_bench_press', name: 'Incline Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 45 }, { reps: 8, weight: 45 }, { reps: 7, weight: 45 }] },
      { exerciseId: 'ex_shoulder_press', name: 'Shoulder Press', muscleGroup: 'Shoulders', sets: [{ reps: 10, weight: 35 }, { reps: 9, weight: 35 }] },
      { exerciseId: 'ex_lateral_raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: [{ reps: 15, weight: 10 }, { reps: 14, weight: 10 }, { reps: 12, weight: 10 }] },
      { exerciseId: 'ex_tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: [{ reps: 12, weight: 25 }, { reps: 12, weight: 25 }, { reps: 10, weight: 30 }] },
    ],
  },
  {
    daysAgo: 9,
    name: 'Leg Day',
    hour: 18,
    durationMin: 62,
    exercises: [
      { exerciseId: 'ex_squat', name: 'Squat', muscleGroup: 'Legs', notes: 'Felt strong, depth on point.', sets: [{ reps: 8, weight: 100 }, { reps: 8, weight: 100 }, { reps: 6, weight: 100 }] },
      { exerciseId: 'ex_leg_press', name: 'Leg Press', muscleGroup: 'Legs', sets: [{ reps: 10, weight: 180 }, { reps: 10, weight: 180 }, { reps: 8, weight: 200 }] },
      { exerciseId: 'ex_romanian_deadlift', name: 'Romanian Deadlift', muscleGroup: 'Legs', sets: [{ reps: 10, weight: 80 }, { reps: 10, weight: 80 }] },
      { exerciseId: 'ex_leg_extension', name: 'Leg Extension', muscleGroup: 'Legs', sets: [{ reps: 12, weight: 50 }, { reps: 12, weight: 50 }, { reps: 10, weight: 55 }] },
      { exerciseId: 'ex_calf_raise', name: 'Calf Raise', muscleGroup: 'Legs', sets: [{ reps: 15, weight: 60 }, { reps: 15, weight: 60 }, { reps: 15, weight: 60 }] },
    ],
  },
  {
    daysAgo: 7,
    name: 'Pull Day',
    hour: 19,
    durationMin: 55,
    exercises: [
      { exerciseId: 'ex_deadlift', name: 'Deadlift', muscleGroup: 'Back', sets: [{ reps: 5, weight: 120 }, { reps: 5, weight: 120 }, { reps: 3, weight: 130 }] },
      { exerciseId: 'ex_lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ reps: 10, weight: 55 }, { reps: 10, weight: 55 }, { reps: 8, weight: 60 }] },
      { exerciseId: 'ex_seated_cable_row', name: 'Seated Cable Row', muscleGroup: 'Back', sets: [{ reps: 10, weight: 50 }, { reps: 10, weight: 50 }] },
      { exerciseId: 'ex_bicep_curl', name: 'Bicep Curl', muscleGroup: 'Arms', sets: [{ reps: 12, weight: 15 }, { reps: 10, weight: 15 }, { reps: 10, weight: 15 }] },
    ],
  },
  {
    daysAgo: 5,
    name: 'Push Day',
    hour: 18,
    durationMin: 60,
    exercises: [
      { exerciseId: 'ex_bench_press', name: 'Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 62.5 }, { reps: 7, weight: 62.5 }, { reps: 6, weight: 62.5 }] },
      { exerciseId: 'ex_incline_bench_press', name: 'Incline Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 47.5 }, { reps: 7, weight: 47.5 }] },
      { exerciseId: 'ex_shoulder_press', name: 'Shoulder Press', muscleGroup: 'Shoulders', sets: [{ reps: 9, weight: 37.5 }, { reps: 8, weight: 37.5 }] },
      { exerciseId: 'ex_lateral_raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: [{ reps: 15, weight: 10 }, { reps: 12, weight: 12 }, { reps: 11, weight: 12 }] },
      { exerciseId: 'ex_tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: [{ reps: 12, weight: 30 }, { reps: 11, weight: 30 }, { reps: 10, weight: 30 }] },
    ],
  },
  {
    daysAgo: 3,
    name: 'Leg Day',
    hour: 18,
    durationMin: 64,
    exercises: [
      { exerciseId: 'ex_squat', name: 'Squat', muscleGroup: 'Legs', sets: [{ reps: 8, weight: 105 }, { reps: 7, weight: 105 }, { reps: 6, weight: 105 }] },
      { exerciseId: 'ex_leg_press', name: 'Leg Press', muscleGroup: 'Legs', sets: [{ reps: 10, weight: 200 }, { reps: 9, weight: 200 }, { reps: 8, weight: 210 }] },
      { exerciseId: 'ex_romanian_deadlift', name: 'Romanian Deadlift', muscleGroup: 'Legs', sets: [{ reps: 10, weight: 85 }, { reps: 9, weight: 85 }] },
      { exerciseId: 'ex_leg_extension', name: 'Leg Extension', muscleGroup: 'Legs', sets: [{ reps: 12, weight: 55 }, { reps: 11, weight: 55 }] },
      { exerciseId: 'ex_calf_raise', name: 'Calf Raise', muscleGroup: 'Legs', sets: [{ reps: 15, weight: 65 }, { reps: 14, weight: 65 }, { reps: 13, weight: 65 }] },
    ],
  },
  {
    daysAgo: 2,
    name: 'Push Day',
    hour: 19,
    durationMin: 57,
    exercises: [
      { exerciseId: 'ex_bench_press', name: 'Bench Press', muscleGroup: 'Chest', notes: 'New top set — felt smooth!', sets: [{ reps: 8, weight: 65 }, { reps: 7, weight: 65 }, { reps: 5, weight: 65 }] },
      { exerciseId: 'ex_incline_bench_press', name: 'Incline Bench Press', muscleGroup: 'Chest', sets: [{ reps: 8, weight: 47.5 }, { reps: 8, weight: 47.5 }, { reps: 6, weight: 50 }] },
      { exerciseId: 'ex_shoulder_press', name: 'Shoulder Press', muscleGroup: 'Shoulders', sets: [{ reps: 9, weight: 37.5 }, { reps: 7, weight: 40 }] },
      { exerciseId: 'ex_lateral_raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', sets: [{ reps: 15, weight: 12 }, { reps: 13, weight: 12 }] },
      { exerciseId: 'ex_tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', sets: [{ reps: 10, weight: 32.5 }, { reps: 10, weight: 32.5 }] },
    ],
  },
  {
    daysAgo: 1,
    name: 'Pull Day',
    hour: 18,
    durationMin: 56,
    exercises: [
      { exerciseId: 'ex_deadlift', name: 'Deadlift', muscleGroup: 'Back', sets: [{ reps: 5, weight: 130 }, { reps: 4, weight: 130 }] },
      { exerciseId: 'ex_lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', sets: [{ reps: 10, weight: 60 }, { reps: 9, weight: 60 }, { reps: 7, weight: 65 }] },
      { exerciseId: 'ex_barbell_row', name: 'Barbell Row', muscleGroup: 'Back', sets: [{ reps: 8, weight: 65 }, { reps: 8, weight: 65 }] },
      { exerciseId: 'ex_bicep_curl', name: 'Bicep Curl', muscleGroup: 'Arms', sets: [{ reps: 12, weight: 15 }, { reps: 9, weight: 17.5 }, { reps: 8, weight: 17.5 }] },
    ],
  },
];

function buildSession(seed: SeedWorkout): WorkoutSession {
  const start = startOfDay(addDays(Date.now(), -seed.daysAgo));
  start.setHours(seed.hour, 0, 0, 0);
  const startedAt = start.getTime();
  const durationSec = seed.durationMin * 60;
  const endedAt = startedAt + durationSec * 1000;

  const exercises: WorkoutExercise[] = seed.exercises.map((ex) => ({
    id: uid('we'),
    exerciseId: ex.exerciseId,
    name: ex.name,
    muscleGroup: ex.muscleGroup,
    notes: ex.notes ?? '',
    sets: ex.sets.map<SetEntry>((s) => ({
      id: uid('set'),
      reps: s.reps,
      weight: s.weight,
      completed: true,
    })),
  }));

  const totalVolume = exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((v, s) => v + s.reps * s.weight, 0),
    0,
  );

  return {
    id: uid('w'),
    name: seed.name,
    date: new Date(startedAt).toISOString(),
    startedAt,
    endedAt,
    durationSec,
    exercises,
    totalVolume,
    completed: true,
  };
}

/** Build the seed history, most recent first. */
export function generateSampleWorkouts(): WorkoutSession[] {
  return SEEDS.map(buildSession).sort((a, b) => b.startedAt - a.startedAt);
}
