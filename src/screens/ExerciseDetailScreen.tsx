import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, KPICard, MuscleGroupBadge, PrimaryButton } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, family, font, radius, spacing } from '../theme';
import { formatWeight, signedPct } from '../utils/format';
import {
  actualOneRepMax,
  computePRs,
  dailyTopSets,
  exerciseMonthlyIncrease,
  workoutsForExercise,
} from '../utils/stats';

export default function ExerciseDetailScreen({ route, navigation }: RootStackScreenProps<'ExerciseDetail'>) {
  const { exerciseId } = route.params;
  const exercises = useStore((s) => s.exercises);
  const workouts = useStore((s) => s.workouts);
  const activeWorkout = useStore((s) => s.activeWorkout);
  const addExerciseToWorkout = useStore((s) => s.addExerciseToWorkout);
  const deleteExercise = useStore((s) => s.deleteExercise);

  const [confirmDelete, setConfirmDelete] = useState(false);

  const exercise = exercises.find((e) => e.id === exerciseId);

  const m = useMemo(
    () => ({
      pr: computePRs(workouts)[exerciseId],
      sessions: workoutsForExercise(workouts, exerciseId),
      actual1RM: actualOneRepMax(workouts, exerciseId),
      monthly: exerciseMonthlyIncrease(workouts, exerciseId),
      tops: dailyTopSets(workouts, exerciseId),
    }),
    [workouts, exerciseId],
  );

  if (!exercise) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textDim} />
          </Pressable>
        </View>
        <EmptyState icon="alert-circle-outline" title="Exercise not found" />
      </SafeAreaView>
    );
  }

  const hasData = m.sessions.length > 0 && !!m.pr;
  const monthlyColor = m.monthly === null ? colors.text : m.monthly >= 0 ? colors.primary : colors.text;

  const addToWorkout = () => {
    addExerciseToWorkout(exercise.id);
    navigation.navigate('Tabs', { screen: 'Workout' });
  };

  const onConfirmDelete = () => {
    setConfirmDelete(false);
    deleteExercise(exercise.id);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{exercise.name.toUpperCase()}</Text>
          <View style={{ marginTop: 8, flexDirection: 'row' }}>
            <MuscleGroupBadge group={exercise.muscleGroup} />
          </View>
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!hasData ? (
          <EmptyState
            icon="stats-chart-outline"
            title="No data yet"
            message={`Add ${exercise.name} to a workout and your records and progress will appear here.`}
            actionLabel={activeWorkout ? 'Add to Current Workout' : undefined}
            onAction={activeWorkout ? addToWorkout : undefined}
          />
        ) : (
          <>
            <View style={styles.tiles}>
              <KPICard
                style={styles.tile}
                label="Best weight"
                value={m.pr.maxWeight}
                unit="kg"
                accent={colors.primary}
                countUp
                format={formatWeight}
                caption={`${m.pr.repsAtMaxWeight} REPS`}
              />
              {m.actual1RM !== null ? (
                <KPICard style={styles.tile} label="Actual 1RM" value={m.actual1RM} unit="kg" countUp format={formatWeight} caption="1 REP" />
              ) : (
                <KPICard style={styles.tile} label="Actual 1RM" value="—" caption="NO 1RM RECORDED" />
              )}
            </View>
            <View style={styles.tiles}>
              {m.monthly !== null ? (
                <KPICard
                  style={styles.tile}
                  label="Last 30 days"
                  value={m.monthly}
                  accent={monthlyColor}
                  countUp
                  format={signedPct}
                  caption="MONTHLY INCREASE"
                />
              ) : (
                <KPICard style={styles.tile} label="Last 30 days" value="—" caption="NO COMPARISON YET" />
              )}
              <KPICard style={styles.tile} label="Times trained" value={m.sessions.length} countUp caption="SESSIONS" />
            </View>

            {/* Top set weight — full recorded history, scroll horizontally (newest right) */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>TOP SET HISTORY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.timeline}
              >
                {m.tops.map((t, i) => {
                  const newest = i === m.tops.length - 1;
                  return (
                    <View key={t.time} style={[styles.tlItem, newest && styles.tlItemActive]}>
                      <Text style={styles.tlDate}>{t.label.toUpperCase()}</Text>
                      <Text style={[styles.tlWeight, newest && { color: colors.primary }]}>
                        {formatWeight(t.topWeight)}
                      </Text>
                      <Text style={styles.tlReps}>kg × {t.reps}</Text>
                    </View>
                  );
                })}
              </ScrollView>
            </View>
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {activeWorkout && hasData ? (
          <PrimaryButton title="Add to Current Workout" icon="add" onPress={addToWorkout} fullWidth />
        ) : null}
        <PrimaryButton
          title="Delete Exercise"
          icon="trash-outline"
          variant="danger"
          onPress={() => setConfirmDelete(true)}
          fullWidth
        />
      </View>

      {/* Confirm before deleting — a custom modal, since RN's Alert is a no-op on web. */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>DELETE EXERCISE</Text>
            <Text style={styles.confirmName}>{exercise.name.toUpperCase()}</Text>
            <Text style={styles.confirmCopy}>
              This removes it from your exercise library. Past workouts that used it are kept.
            </Text>
            <View style={styles.confirmActions}>
              <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={() => setConfirmDelete(false)} style={styles.flex} />
              <PrimaryButton title="Delete" variant="danger" size="md" onPress={onConfirmDelete} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, includeFontPadding: false },
  closeBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, marginTop: spacing.xs },
  cardTitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4, marginBottom: spacing.md },
  timeline: { gap: spacing.sm, paddingRight: spacing.xs },
  tlItem: {
    width: 92,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 2,
  },
  tlItemActive: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  tlDate: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8 },
  tlWeight: { color: colors.text, fontFamily: family.display, fontSize: 30, lineHeight: 35, includeFontPadding: false, marginTop: 2 },
  tlReps: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, gap: spacing.md },
  flex: { flex: 1 },

  // Confirm-delete dialog
  confirmBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  confirmDialog: {
    width: '100%',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  confirmKicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2 },
  confirmName: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, includeFontPadding: false, marginTop: 4 },
  confirmCopy: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, lineHeight: 21, marginTop: spacing.lg },
  confirmActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
