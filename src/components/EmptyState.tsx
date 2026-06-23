import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, family, font, radius, spacing } from '../theme';
import PrimaryButton from './PrimaryButton';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  accent?: string;
}

/** Calm, editorial empty state — thin bordered glyph, condensed title, terse copy. */
export default function EmptyState({
  icon = 'ellipse-outline',
  title,
  message,
  actionLabel,
  onAction,
  accent = colors.primary,
}: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <Ionicons name={icon} size={26} color={accent} />
      </View>
      <Text style={styles.title}>{title.toUpperCase()}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <PrimaryButton title={actionLabel} onPress={onAction} size="md" style={styles.button} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: family.display,
    fontSize: font.h2,
    letterSpacing: 1,
    textAlign: 'center',
    includeFontPadding: false,
  },
  message: {
    color: colors.textDim,
    fontFamily: family.body,
    fontSize: font.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 21,
    maxWidth: 300,
  },
  button: { marginTop: spacing.xl },
});
