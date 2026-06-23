import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import { colors, family, font, radius, spacing } from '../theme';

type Variant = 'primary' | 'secondary' | 'warning' | 'ghost' | 'danger';
type Size = 'lg' | 'md' | 'sm';
type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  iconRight?: IconName;
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

const SIZES: Record<Size, { height: number; font: number; px: number; gap: number; icon: number }> = {
  lg: { height: 54, font: font.body, px: spacing.xl, gap: 10, icon: 18 },
  md: { height: 46, font: font.label, px: spacing.lg, gap: 8, icon: 16 },
  sm: { height: 38, font: font.small, px: spacing.md, gap: 6, icon: 14 },
};

/** Filled lime primary; outlined secondary/ghost. Sharp 4px corners, tactile press. */
export default function PrimaryButton({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  fullWidth = false,
  disabled = false,
  loading = false,
  style,
}: PrimaryButtonProps) {
  const s = SIZES[size];
  const filled = variant === 'primary';
  const textColor = filled ? colors.bg : variant === 'danger' ? colors.danger : colors.text;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        { height: s.height, paddingHorizontal: s.px, gap: s.gap },
        fullWidth && styles.fullWidth,
        filled ? styles.filled : variant === 'danger' ? styles.danger : styles.outlined,
        variant === 'ghost' && styles.ghost,
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon ? <Ionicons name={icon} size={s.icon} color={textColor} /> : null}
          <Text style={[styles.label, { color: textColor, fontSize: s.font }]} numberOfLines={1}>
            {title.toUpperCase()}
          </Text>
          {iconRight ? <Ionicons name={iconRight} size={s.icon} color={textColor} /> : null}
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  fullWidth: { width: '100%' },
  filled: { backgroundColor: colors.primary },
  outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  label: {
    fontFamily: family.bold,
    letterSpacing: 1.2,
  },
  // Tactile downward press.
  pressed: { transform: [{ translateY: 1.5 }], opacity: 0.92 },
  disabled: { opacity: 0.4 },
});
