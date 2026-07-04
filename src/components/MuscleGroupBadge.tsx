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
  style?: StyleProp<ViewStyle>;
}

/** Minimal, text-first chip carrying the muscle group's accent color (a small
 *  dot when idle, a full tint when active). Colors are user-configurable in
 *  Settings and default to the app's acid-lime. */
export default function MuscleGroupBadge({
  group,
  size = 'md',
  active = false,
  style,
}: MuscleGroupBadgeProps) {
  const small = size === 'sm';
  const accent = useStore((s) => muscleColor(group, s.settings.muscleColors));
  return (
    <View
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
      <View style={[styles.dot, { backgroundColor: accent, width: small ? 6 : 7, height: small ? 6 : 7 }]} />
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
