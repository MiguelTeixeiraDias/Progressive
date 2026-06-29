import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';

import { MuscleGroup } from '../types';
import { colors } from '../theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/**
 * Single-accent line icons standing in for each muscle group on exercise rows.
 * One acid-lime colour for all; only the glyph changes. Each glyph maps to the
 * muscle either anatomically (flexed bicep, abs) or by its signature movement
 * (a row for back, an overhead press for shoulders, a sprint for legs).
 */
export const MUSCLE_ICONS: Record<MuscleGroup, IconName> = {
  Chest: 'boxing-glove', // pressing / pushing power
  Back: 'rowing', // the row — the canonical back pull
  Shoulders: 'weight-lifter', // overhead press
  Legs: 'run', // legs driving
  Arms: 'arm-flex', // flexed bicep
  Core: 'stomach', // abs / midsection
};

interface MuscleGroupIconProps {
  group: MuscleGroup;
  size?: number;
  color?: string;
}

export default function MuscleGroupIcon({
  group,
  size = 22,
  color = colors.primary,
}: MuscleGroupIconProps) {
  return <MaterialCommunityIcons name={MUSCLE_ICONS[group]} size={size} color={color} />;
}
