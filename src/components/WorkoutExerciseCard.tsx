import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { SetEntry, WorkoutExercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import Card from './Card';
import MuscleGroupBadge from './MuscleGroupBadge';
import PrimaryButton from './PrimaryButton';
import SetRow from './SetRow';

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  previousSets?: { reps: number; weight: number }[] | null;
  onAddSet: () => void;
  onRemove: () => void;
  onComplete: () => void;
  onNotesChange: (notes: string) => void;
  onUpdateSet: (setId: string, patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => void;
  onRemoveSet: (setId: string) => void;
}

export default function WorkoutExerciseCard({
  exercise,
  previousSets,
  onAddSet,
  onRemove,
  onComplete,
  onNotesChange,
  onUpdateSet,
  onRemoveSet,
}: WorkoutExerciseCardProps) {
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const isComplete = exercise.sets.length > 0 && completedCount === exercise.sets.length;

  return (
    <Card style={[styles.card, isComplete && styles.cardComplete]}>
      {isComplete ? <View style={styles.completeBar} /> : null}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name}>{exercise.name}</Text>
          <View style={styles.metaRow}>
            <MuscleGroupBadge group={exercise.muscleGroup} size="sm" />
            <Text style={styles.meta}>{completedCount}/{exercise.sets.length} SETS</Text>
            {isComplete ? <Text style={styles.completedTag}>· COMPLETED</Text> : null}
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
            onRemove={exercise.sets.length > 1 ? () => onRemoveSet(set.id) : undefined}
          />
        ))}
      </View>

      <PrimaryButton title="Add Set" icon="add" variant="ghost" size="md" fullWidth onPress={onAddSet} />

      <PrimaryButton
        title={isComplete ? 'Completed — Tap to Reopen' : 'Complete Exercise'}
        icon={isComplete ? 'checkmark-done' : 'checkmark'}
        variant={isComplete ? 'secondary' : 'primary'}
        size="md"
        fullWidth
        onPress={onComplete}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md, overflow: 'hidden' },
  cardComplete: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  completeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, backgroundColor: colors.primary },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  headerText: { flex: 1 },
  name: { color: colors.text, fontFamily: family.semibold, fontSize: font.h3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 6 },
  meta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6 },
  completedTag: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 0.8 },
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
