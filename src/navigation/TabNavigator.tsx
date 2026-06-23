import { Ionicons } from '@expo/vector-icons';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ExercisesScreen from '../screens/ExercisesScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';
import ProgressScreen from '../screens/ProgressScreen';
import WorkoutScreen from '../screens/WorkoutScreen';
import { colors, family, font } from '../theme';
import { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const ICONS: Record<keyof TabParamList, { on: IconName; off: IconName }> = {
  Home: { on: 'home', off: 'home-outline' },
  Workout: { on: 'barbell', off: 'barbell-outline' },
  Exercises: { on: 'list', off: 'list-outline' },
  Progress: { on: 'stats-chart', off: 'stats-chart-outline' },
  History: { on: 'time', off: 'time-outline' },
};

export default function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.card2,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingTop: 8,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
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
      <Tab.Screen name="History" component={HistoryScreen} />
    </Tab.Navigator>
  );
}
