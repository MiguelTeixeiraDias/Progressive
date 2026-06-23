import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import AddExerciseScreen from '../screens/AddExerciseScreen';
import ExerciseDetailScreen from '../screens/ExerciseDetailScreen';
import ExercisePickerScreen from '../screens/ExercisePickerScreen';
import WorkoutCompleteScreen from '../screens/WorkoutCompleteScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import { colors } from '../theme';
import { RootStackParamList } from './types';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen name="Tabs" component={TabNavigator} />

      <Stack.Group screenOptions={{ presentation: 'modal' }}>
        <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
        <Stack.Screen name="AddExercise" component={AddExerciseScreen} />
        <Stack.Screen name="ExerciseDetail" component={ExerciseDetailScreen} />
        <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      </Stack.Group>

      <Stack.Screen
        name="WorkoutComplete"
        component={WorkoutCompleteScreen}
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </Stack.Navigator>
  );
}
