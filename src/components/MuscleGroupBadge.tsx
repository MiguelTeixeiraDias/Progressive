import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { MuscleGroup } from '../types';
import { useStore } from '../store/useStore';
import { colors, family, font, radius } from '../theme';
import { muscleColor, withAlpha } from '../utils/color';

interface MuscleGroupBadgeProps {
  group: MuscleGroup;
  size?: 'sm' | 'md';
  active?: boolean;
  /** Pre-resolved accent. Pass this on badge-heavy lists so the badge doesn't
   *  each subscribe to the store; falls back to the store when omitted. */
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/** Minimal, text-first chip carrying the muscle group's accent color (a small
 *  dot when idle, a full tint when active). Colors are user-configurable in
 *  Settings and default to the app's acid-lime. The group name is always shown
 *  as text, so the color is a reinforcement — never the only signal. */
export default function MuscleGroupBadge({
  group,
  size = 'md',
  active = false,
  color,
  style,
}: MuscleGroupBadgeProps) {
  const small = size === 'sm';
  // A constant `color` selector never changes, so no per-badge re-render; when
  // omitted we resolve the group's color from Settings.
  const accent = useStore((s) => color ?? muscleColor(group, s.settings.muscleColors));
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${group} muscle group`}
      style={[
        styles.badge,
        {
          borderColor: active ? accent : colors.border,
          backgroundColor: active ? withAlpha(accent, 0.12) : 'transparent',
          paddingVertical: small ? 3 : 5,
          paddingHorizontal: small ? 8 : 11,
        },
        style,
      ]}
    >
      <View
        importantForAccessibility="no"
        style={[styles.dot, { backgroundColor: accent, width: small ? 6 : 7, height: small ? 6 : 7 }]}
      />
      <Text
        style={[
          styles.label,
          { color: active ? accent : colors.textDim, fontSize: small ? font.tiny : font.small },
        ]}
      >
        {group.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  dot: {
    borderRadius: radius.pill,
  },
  label: {
    fontFamily: family.medium,
    letterSpacing: 1,
  },
});
