import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { DropStage, SetEntry, WorkoutExercise } from '../types';
import { useStore } from '../store/useStore';
import { colors, family, font, radius, spacing } from '../theme';
import { formatClock, formatWeight } from '../utils/format';
import Card from './Card';
import MuscleGroupBadge from './MuscleGroupBadge';
import PrimaryButton from './PrimaryButton';
import SetRow from './SetRow';

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  previousSets?: { reps: number; weight: number; durationSec?: number }[] | null;
  /** Label shown when this card is part of a linked superset, e.g. "A1". */
  supersetLabel?: string;
  onAddSet: () => void;
  onRemove: () => void;
  onComplete: () => void;
  onNotesChange: (notes: string) => void;
  onUpdateSet: (setId: string, patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => void;
  onUpdateDuration: (setId: string, durationSec: number) => void;
  onRemoveSet: (setId: string) => void;
  onToggleDropSet: (setId: string) => void;
  onAddDropStage: (setId: string) => void;
  onUpdateDropStage: (setId: string, dropId: string, patch: Partial<Pick<DropStage, 'reps' | 'weight'>>) => void;
  onRemoveDropStage: (setId: string, dropId: string) => void;
}

export default function WorkoutExerciseCard({
  exercise,
  previousSets,
  supersetLabel,
  onAddSet,
  onRemove,
  onComplete,
  onNotesChange,
  onUpdateSet,
  onUpdateDuration,
  onRemoveSet,
  onToggleDropSet,
  onAddDropStage,
  onUpdateDropStage,
  onRemoveDropStage,
}: WorkoutExerciseCardProps) {
  const unit = useStore((s) => s.settings.unit);
  const cardio = exercise.muscleGroup === 'Cardio';
  const completedCount = exercise.sets.filter((s) => s.completed).length;
  const isComplete = exercise.sets.length > 0 && completedCount === exercise.sets.length;

  const hintFor = (i: number) => {
    const prev = previousSets && previousSets[i];
    if (!prev) return null;
    return cardio
      ? formatClock(prev.durationSec ?? 0)
      : `${formatWeight(prev.weight, unit)}${unit} × ${prev.reps}`;
  };

  return (
    <Card style={[styles.card, isComplete && styles.cardComplete]}>
      {isComplete ? <View style={styles.completeBar} /> : null}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.nameRow}>
            {supersetLabel ? (
              <View style={styles.supersetTag}>
                <Text style={styles.supersetTagText}>{supersetLabel}</Text>
              </View>
            ) : null}
            <Text style={styles.name}>{exercise.name}</Text>
          </View>
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
            cardio={cardio}
            previousHint={hintFor(i)}
            onChange={(patch) => onUpdateSet(set.id, patch)}
            onChangeDuration={(durationSec) => onUpdateDuration(set.id, durationSec)}
            onRemove={exercise.sets.length > 1 ? () => onRemoveSet(set.id) : undefined}
            onToggleDropSet={() => onToggleDropSet(set.id)}
            onAddDropStage={() => onAddDropStage(set.id)}
            onUpdateDropStage={(dropId, patch) => onUpdateDropStage(set.id, dropId, patch)}
            onRemoveDropStage={(dropId) => onRemoveDropStage(set.id, dropId)}
          />
        ))}
      </View>

      <PrimaryButton title="Add Set" icon="add" variant="ghost" size="md" fullWidth onPress={onAddSet} />

      {/* Outlined so it reads as a per-exercise toggle, distinct from the single
          filled "Finish Workout" CTA at the bottom of the screen. */}
      <PrimaryButton
        title={isComplete ? 'Completed — Tap to Reopen' : 'Complete Exercise'}
        icon={isComplete ? 'checkmark-circle' : 'checkmark'}
        variant={isComplete ? 'ghost' : 'secondary'}
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
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { color: colors.text, fontFamily: family.semibold, fontSize: font.h3 },
  supersetTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: colors.primaryDim,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  supersetTagText: { color: colors.primary, fontFamily: family.bold, fontSize: font.tiny, letterSpacing: 0.5 },
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
