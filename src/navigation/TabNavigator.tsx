import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExercisesScreen from '../screens/ExercisesScreen';
// History screen is intentionally preserved but currently unlinked from
// navigation. The file (HistoryScreen.tsx) remains in the project and may be
// restored in a future version; it has been replaced by Settings in the tabs.
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import { colors, family, font, spacing } from '../theme';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<keyof TabParamList, { on: IconName; off: IconName }> = {
  Home: { on: 'home', off: 'home-outline' },
  Workout: { on: 'barbell', off: 'barbell-outline' },
  Exercises: { on: 'list', off: 'list-outline' },
  Progress: { on: 'stats-chart', off: 'stats-chart-outline' },
  Settings: { on: 'settings', off: 'settings-outline' },
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.card2,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          // Inset the row so the tabs pack a little closer together and leave
          // breathing room at the far left/right edges.
          paddingHorizontal: spacing.xl,
        },
        tabBarLabelStyle: {
          fontSize: font.tiny,
          fontFamily: family.medium,
          letterSpacing: 1,
          textTransform: 'uppercase',
        },
        tabBarIcon: ({ focused, color, size }) => (
          <Ionicons
            name={focused ? ICONS[route.name].on : ICONS[route.name].off}
            size={size ?? 22}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Workout" component={WorkoutScreen} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      {/* History tab removed (see import note); Settings takes its place. */}
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
