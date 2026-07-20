import { Ionicons } from '@expo/vector-icons';
import { BottomTabBar, createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useResponsive } from '../hooks/useResponsive';
import { useStore } from '../store/useStore';
import ExercisesScreen from '../screens/ExercisesScreen';
// History screen is intentionally preserved but currently unlinked from
// navigation. The file (HistoryScreen.tsx) remains in the project and may be
// restored in a future version; it has been replaced by Settings in the tabs.
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import SettingsScreen from '../screens/SettingsScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import { colors, family } from '../theme';
import SidebarNav from './SidebarNav';
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
  const { isDesktop } = useResponsive();
  // Captured once on mount: if a session was restored from storage (e.g. the PWA
  // was closed mid-workout), open straight to the Workout tab so it resumes where
  // the user left off. Reading getState() rather than a live selector keeps this a
  // one-time boot decision — starting or finishing a workout later won't re-route.
  const [resumeWorkout] = useState(() => useStore.getState().activeWorkout !== null);

  return (
    <Tab.Navigator
      initialRouteName={resumeWorkout ? 'Workout' : 'Home'}
      tabBar={(props) => (isDesktop ? <SidebarNav {...props} /> : <BottomTabBar {...props} />)}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarPosition: isDesktop ? 'left' : 'bottom',
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarShowLabel: true,
        tabBarStyle: {
          backgroundColor: colors.card2,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 90 + insets.bottom,
          paddingTop: 12,
          // Extra bottom padding lifts the icons/labels clear of the device's
          // rounded corners / home indicator (the safe-area inset is 0 in the
          // PWA, so we keep a solid fallback).
          paddingBottom: insets.bottom > 0 ? insets.bottom + 6 : 22,
        },
        // Keep the label small with no extra letter-spacing so the longest names
        // ("EXERCISES", "SETTINGS") fit their slot without being clipped. We let
        // React Navigation place the label (forcing below-icon constrained the
        // label width to the icon on web and cut off the longer names).
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: family.medium,
          letterSpacing: 0,
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
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Home' }} />
      <Tab.Screen name="Workout" component={WorkoutScreen} options={{ tabBarLabel: 'Workout' }} />
      <Tab.Screen name="Exercises" component={ExercisesScreen} options={{ tabBarLabel: 'Exercises' }} />
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ tabBarLabel: 'Progress' }} />
      {/* History tab removed (see import note); Settings takes its place. */}
      <Tab.Screen name="Settings" component={SettingsScreen} options={{ tabBarLabel: 'Settings' }} />
    </Tab.Navigator>
  );
}
