import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, family, font, radius, spacing } from '../theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface PersonalBestBadgeProps {
  title: string;
  value: string;
  caption?: string;
  icon?: IconName;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}

/** Record row — restrained, with the value emphasized in acid-lime. */
export default function PersonalBestBadge({
  title,
  value,
  caption,
  icon = 'trophy-outline',
  accent = colors.primary,
  style,
}: PersonalBestBadgeProps) {
  return (
    <View style={[styles.wrap, style]}>
      <View style={styles.tag}>
        <Ionicons name={icon} size={15} color={accent} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {caption ? (
          <Text style={styles.caption} numberOfLines={1}>
            {caption}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.value, { color: accent }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  tag: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  title: { color: colors.text, fontFamily: family.semibold, fontSize: font.body },
  caption: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: 2 },
  value: { fontFamily: family.display, fontSize: font.h2, letterSpacing: 0.5, includeFontPadding: false },
});
