import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { MuscleGroup } from '../types';
import { colors, family, font, radius } from '../theme';

interface MuscleGroupBadgeProps {
  group: MuscleGroup;
  size?: 'sm' | 'md';
  active?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Minimal, text-first, border-based chip. Active state uses the acid-lime accent. */
export default function MuscleGroupBadge({
  group,
  size = 'md',
  active = false,
  style,
}: MuscleGroupBadgeProps) {
  const small = size === 'sm';
  return (
    <View
      style={[
        styles.badge,
        {
          borderColor: active ? colors.primary : colors.border,
          backgroundColor: active ? colors.primaryDim : 'transparent',
          paddingVertical: small ? 3 : 5,
          paddingHorizontal: small ? 8 : 11,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: active ? colors.primary : colors.textDim, fontSize: small ? font.tiny : font.small },
        ]}
      >
        {group.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  label: {
    fontFamily: family.medium,
    letterSpacing: 1,
  },
});
