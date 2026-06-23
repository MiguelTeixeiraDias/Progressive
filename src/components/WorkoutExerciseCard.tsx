import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SetEntry, WorkoutExercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { formatVolume } from '../utils/format';
import { exerciseVolume } from '../utils/stats';
import Card from './Card';
import MuscleGroupBadge from './MuscleGroupBadge';
import PrimaryButton from './PrimaryButton';
import SetRow from './SetRow';

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  previousSets?: { reps: number; weight: number }[] | null;
  onAddSet: () => void;
  onRemove: () => void;
  onNotesChange: (notes: string) => void;
  onUpdateSet: (setId: string, patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => void;
  onToggleSet: (setId: string) => void;
  onRemoveSet: (setId: string) => void;
}

export default function WorkoutExerciseCard({
  exercise,
  previousSets,
  onAddSet,
  onRemove,
  onNotesChange,
  onUpdateSet,
  onToggleSet,
  onRemoveSet,
}: WorkoutExerciseCardProps) {
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const volume = exerciseVolume(exercise, true);

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{exercise.name}</Text>
          <View style={styles.metaRow}>
            <MuscleGroupBadge group={exercise.muscleGroup} size="sm" />
            <Text style={styles.meta}>
              {completedCount}/{exercise.sets.length} SETS · {formatVolume(volume)} KG
            </Text>
          </View>
        </View>
        <Pressable onPress={onRemove} hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="close" size={18} color={colors.textDim} />
        </Pressable>
      </View>

      <View style={styles.notesRow}>
        <Ionicons name="create-outline" size={15} color={colors.textFaint} />
        <TextInput
          value={exercise.notes}
          onChangeText={onNotesChange}
          placeholder="Add a note — felt strong, drop set…"
          placeholderTextColor={colors.textFaint}
          style={styles.notes}
          multiline
        />
      </View>

      <View style={styles.sets}>
        {exercise.sets.map((set, i) => (
          <SetRow
            key={set.id}
            index={i + 1}
            set={set}
            previousHint={previousSets && previousSets[i] ? `${previousSets[i].weight}kg × ${previousSets[i].reps}` : null}
            onChange={(patch) => onUpdateSet(set.id, patch)}
            onToggleComplete={() => onToggleSet(set.id)}
            onRemove={exercise.sets.length > 1 ? () => onRemoveSet(set.id) : undefined}
          />
        ))}
      </View>

      <PrimaryButton title="Add Set" icon="add" variant="ghost" size="md" fullWidth onPress={onAddSet} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  name: { color: colors.text, fontFamily: family.semibold, fontSize: font.h3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  meta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6 },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.card3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  notes: { flex: 1, color: colors.text, fontFamily: family.body, fontSize: font.body, padding: 0, minHeight: 22 },
  sets: { gap: spacing.sm },
});
