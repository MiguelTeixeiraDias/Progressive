import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, family, font, spacing } from '../theme';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Editorial section header: lime tick + condensed title + optional action. */
export default function SectionHeader({ title, subtitle, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.titleWrap}>
        <View style={styles.titleLine}>
          <View style={styles.tick} />
          <Text style={styles.title}>{title.toUpperCase()}</Text>
          <View style={styles.rule} />
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} hitSlop={8} style={({ pressed }) => [styles.action, pressed && { opacity: 0.6 }]}>
          <Text style={styles.actionLabel}>{actionLabel.toUpperCase()}</Text>
          <Ionicons name="arrow-forward" size={13} color={colors.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  titleWrap: { flex: 1 },
  titleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  tick: { width: 3, height: 18, backgroundColor: colors.primary },
  rule: { flex: 1, height: 1, backgroundColor: colors.border, marginLeft: spacing.sm },
  title: {
    color: colors.text,
    fontFamily: family.display,
    fontSize: font.h2,
    lineHeight: Math.ceil(font.h2 * 1.15),
    letterSpacing: 1,
    includeFontPadding: false,
  },
  subtitle: {
    color: colors.textDim,
    fontFamily: family.body,
    fontSize: font.small,
    marginTop: 4,
    marginLeft: 11,
  },
  action: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: spacing.md, paddingTop: 2 },
  actionLabel: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
});
