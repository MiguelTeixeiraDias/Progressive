import { NavigatorScreenParams, CompositeScreenProps } from '@react-navigation/native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { WorkoutSummary } from '../types';

export type TabParamList = {
  Home: undefined;
  Workout: undefined;
  Exercises: undefined;
  Progress: undefined;
  // History intentionally preserved but unlinked — replaced by Settings in tabs.
  Settings: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  ExercisePicker: undefined;
  AddExercise: undefined;
  ExerciseDetail: { exerciseId: string };
  WorkoutDetail: { sessionId: string };
  WorkoutComplete: { summary: WorkoutSummary };
  /** Create (no id) or edit (with id) a reusable workout template. */
  TemplateEditor: { templateId?: string } | undefined;
};

/** Props for a tab screen that can also reach the root stack (modals). */
export type TabScreenProps<T extends keyof TabParamList> = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;
