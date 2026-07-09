import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

import { MuscleGroup } from '../types';
import { useStore } from '../store/useStore';
import { muscleColor } from '../utils/color';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Line icons standing in for each muscle group on exercise rows. Each glyph
 * maps to the muscle either anatomically (flexed bicep, abs) or by its
 * signature movement (a row for back, an overhead press for shoulders, a
 * sprint for legs); color comes from the per-category accent palette so
 * categories are distinguishable at a glance.
 */
export const MUSCLE_ICONS: Record<MuscleGroup, IconName> = {
  Chest: 'boxing-glove', // pressing / pushing power
  Back: 'rowing', // the row — the canonical back pull
  Shoulders: 'weight-lifter', // overhead press
  Legs: 'run', // legs driving
  Arms: 'arm-flex', // flexed bicep
  Core: 'stomach', // abs / midsection
  Cardio: 'heart-pulse', // sustained effort
};

interface MuscleGroupIconProps {
  group: MuscleGroup;
  size?: number;
  color?: string;
}

export default function MuscleGroupIcon({ group, size = 22, color }: MuscleGroupIconProps) {
  // Resolve the group's user-configured colour (falls back to the acid-lime
  // accent) so the icon matches the badge dot; an explicit `color` prop wins.
  const accent = useStore((s) => color ?? muscleColor(group, s.settings.muscleColors));
  return <MaterialCommunityIcons name={MUSCLE_ICONS[group]} size={size} color={accent} />;
}
