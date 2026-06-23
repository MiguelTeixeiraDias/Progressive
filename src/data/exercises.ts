import { Exercise } from '../types';

/**
 * Default exercise library shipped with the app. Stable ids let us match
 * historical workouts and previous-performance lookups across sessions.
 */
export const DEFAULT_EXERCISES: Exercise[] = [
  // Chest
  { id: 'ex_bench_press', name: 'Bench Press', muscleGroup: 'Chest', isCustom: false },
  { id: 'ex_incline_bench_press', name: 'Incline Bench Press', muscleGroup: 'Chest', isCustom: false },
  { id: 'ex_dumbbell_fly', name: 'Dumbbell Fly', muscleGroup: 'Chest', isCustom: false },
  // Back
  { id: 'ex_deadlift', name: 'Deadlift', muscleGroup: 'Back', isCustom: false },
  { id: 'ex_lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', isCustom: false },
  { id: 'ex_barbell_row', name: 'Barbell Row', muscleGroup: 'Back', isCustom: false },
  { id: 'ex_pull_ups', name: 'Pull Ups', muscleGroup: 'Back', isCustom: false },
  { id: 'ex_seated_cable_row', name: 'Seated Cable Row', muscleGroup: 'Back', isCustom: false },
  // Shoulders
  { id: 'ex_shoulder_press', name: 'Shoulder Press', muscleGroup: 'Shoulders', isCustom: false },
  { id: 'ex_lateral_raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', isCustom: false },
  { id: 'ex_face_pull', name: 'Face Pull', muscleGroup: 'Shoulders', isCustom: false },
  // Legs
  { id: 'ex_squat', name: 'Squat', muscleGroup: 'Legs', isCustom: false },
  { id: 'ex_leg_press', name: 'Leg Press', muscleGroup: 'Legs', isCustom: false },
  { id: 'ex_romanian_deadlift', name: 'Romanian Deadlift', muscleGroup: 'Legs', isCustom: false },
  { id: 'ex_leg_extension', name: 'Leg Extension', muscleGroup: 'Legs', isCustom: false },
  { id: 'ex_calf_raise', name: 'Calf Raise', muscleGroup: 'Legs', isCustom: false },
  // Arms
  { id: 'ex_bicep_curl', name: 'Bicep Curl', muscleGroup: 'Arms', isCustom: false },
  { id: 'ex_hammer_curl', name: 'Hammer Curl', muscleGroup: 'Arms', isCustom: false },
  { id: 'ex_tricep_pushdown', name: 'Tricep Pushdown', muscleGroup: 'Arms', isCustom: false },
  // Core
  { id: 'ex_plank', name: 'Plank', muscleGroup: 'Core', isCustom: false },
  { id: 'ex_hanging_leg_raise', name: 'Hanging Leg Raise', muscleGroup: 'Core', isCustom: false },
];
