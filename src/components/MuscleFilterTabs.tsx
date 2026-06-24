import React from 'react';
import { Pressable, ScrollView, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { MUSCLE_GROUPS, MuscleGroup } from '../types';
import { colors, family, font, radius, spacing } from '../theme';

export type MuscleFilter = 'All' | MuscleGroup;

export const MUSCLE_FILTERS: MuscleFilter[] = ['All', ...MUSCLE_GROUPS];

interface MuscleFilterTabsProps {
  value: MuscleFilter;
  onChange: (filter: MuscleFilter) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Horizontally scrollable muscle-group filter. Chips keep an identical box in
 * both states — same height, padding and border width — so selecting one only
 * swaps colours and never shifts the layout. Shared by the Exercises page, the
 * in-workout Add Exercise modal and the Template editor.
 */
export default function MuscleFilterTabs({ value, onChange, style }: MuscleFilterTabsProps) {
  return (
    <View style={style}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.row}
      >
        {MUSCLE_FILTERS.map((f) => {
          const selected = value === f;
          return (
            <Pressable
              key={f}
              onPress={() => onChange(f)}
              style={[
                styles.chip,
                {
                  backgroundColor: selected ? colors.primaryDim : 'transparent',
                  borderColor: selected ? colors.primary : colors.borderStrong,
                },
              ]}
            >
              <Text
                style={[styles.chipText, { color: selected ? colors.primary : colors.textDim }]}
                numberOfLines={1}
              >
                {f.toUpperCase()}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  chip: {
    height: 36,
    minWidth: 56,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: family.semibold,
    fontSize: font.label,
    lineHeight: font.label + 4,
    letterSpacing: 0.8,
    includeFontPadding: false,
  },
});
