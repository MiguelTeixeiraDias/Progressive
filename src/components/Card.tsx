import React from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius, spacing } from '../theme';

interface CardProps {
  children?: React.ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  variant?: 'card' | 'card2';
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
}

/** Bordered surface modelled on a section of a printed training log. */
export default function Card({
  children,
  onPress,
  onLongPress,
  variant = 'card',
  style,
  noPadding = false,
}: CardProps) {
  const base: StyleProp<ViewStyle> = [
    styles.card,
    {
      backgroundColor: variant === 'card' ? colors.card : colors.card2,
      padding: noPadding ? 0 : spacing.lg,
    },
    style,
  ];

  if (onPress || onLongPress) {
    return (
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={base}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  // Slow, elegant lift on press (spec: scale(1.015)).
  pressed: {
    transform: [{ scale: 1.012 }],
    borderColor: colors.borderStrong,
  },
});
