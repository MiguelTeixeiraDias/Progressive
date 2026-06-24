import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Exercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import Card from './Card';
import MuscleGroupBadge from './MuscleGroupBadge';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface ExerciseCardProps {
  exercise: Exercise;
  subtitle?: string | null;
  onPress?: () => void;
  trailingIcon?: IconName;
  trailingAccent?: string;
}

/** Library row: editorial monogram, name, muscle chip + last-performed stat. */
export default function ExerciseCard({
  exercise,
  subtitle,
  onPress,
  trailingIcon = 'chevron-forward',
  trailingAccent = colors.textFaint,
}: ExerciseCardProps) {
  const monogram = exercise.muscleGroup.slice(0, 2).toUpperCase();
  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.monogram}>
          <Text style={styles.monogramText}>{monogram}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.name} numberOfLines={1}>
            {exercise.name}
          </Text>
          <View style={styles.metaRow}>
            <MuscleGroupBadge group={exercise.muscleGroup} size="sm" />
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
            {exercise.isCustom ? <Text style={styles.custom}>CUSTOM</Text> : null}
          </View>
        </View>

        <Ionicons name={trailingIcon} size={20} color={trailingAccent} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { paddingVertical: spacing.md, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  monogram: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogramText: {
    color: colors.text,
    fontFamily: family.display,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: 1,
    includeFontPadding: false,
  },
  body: { flex: 1 },
  name: { color: colors.text, fontFamily: family.semibold, fontSize: font.lg },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  subtitle: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, flexShrink: 1 },
  custom: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8 },
});
