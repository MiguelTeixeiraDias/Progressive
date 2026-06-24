import { Ionicons } from '@expo/vector-icons';
import React from 'react';

import { MuscleGroup } from '../types';
import { colors } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/**
 * Minimal, single-accent line icons standing in for each muscle group — used
 * instead of text initials on exercise rows. One acid-lime colour for all; only
 * the glyph changes per group, keeping the set editorial rather than playful.
 */
export const MUSCLE_ICONS: Record<MuscleGroup, IconName> = {
  Chest: 'shield-outline',
  Back: 'swap-vertical-outline',
  Shoulders: 'triangle-outline',
  Legs: 'footsteps-outline',
  Arms: 'fitness-outline',
  Core: 'ellipse-outline',
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
  return <Ionicons name={MUSCLE_ICONS[group]} size={size} color={color} />;
}
