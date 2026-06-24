import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, KPICard, MuscleGroupBadge, PrimaryButton, StatChart } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, family, font, radius, spacing } from '../theme';
import { shortDate } from '../utils/date';
import { formatVolume, formatWeight } from '../utils/format';
import { computePRs, exerciseProgress } from '../utils/stats';

export default function ExerciseDetailScreen({ route, navigation }: RootStackScreenProps<'ExerciseDetail'>) {
  const { exerciseId } = route.params;
  const exercises = useStore((s) => s.exercises);
  const workouts = useStore((s) => s.workouts);
  const activeWorkout = useStore((s) => s.activeWorkout);
  const addExerciseToWorkout = useStore((s) => s.addExerciseToWorkout);

  const exercise = exercises.find((e) => e.id === exerciseId);
  const pr = useMemo(() => computePRs(workouts)[exerciseId], [workouts, exerciseId]);
  const progress = useMemo(() => exerciseProgress(workouts, exerciseId), [workouts, exerciseId]);

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

  const chartData = progress.map((p, i) => ({ label: p.label, value: p.topWeight, highlight: i === progress.length - 1 }));

  const addToWorkout = () => {
    addExerciseToWorkout(exercise.id);
    navigation.navigate('Tabs', { screen: 'Workout' });
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
        {progress.length === 0 || !pr ? (
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
              <KPICard style={styles.tile} label="Best weight" value={pr.maxWeight} unit="kg" accent={colors.primary} countUp format={formatWeight} caption={`${pr.repsAtMaxWeight} REPS`} />
              <KPICard style={styles.tile} label="Est. 1RM" value={pr.estimatedOneRepMax} unit="kg" countUp format={formatWeight} />
            </View>
            <View style={styles.tiles}>
              <KPICard style={styles.tile} label="Best volume" value={pr.bestVolume} unit="kg" countUp format={formatVolume} />
              <KPICard style={styles.tile} label="Times trained" value={progress.length} countUp />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>TOP SET WEIGHT · KG</Text>
              <StatChart data={chartData} color={colors.primary} height={150} showValues formatValue={formatWeight} />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>SESSION HISTORY</Text>
              <View style={{ gap: spacing.sm }}>
                {[...progress].reverse().map((p) => (
                  <View key={p.date} style={styles.histRow}>
                    <Text style={styles.histDate}>{shortDate(p.date).toUpperCase()}</Text>
                    <Text style={styles.histMain}>{formatWeight(p.topWeight)}kg top set</Text>
                    <Text style={styles.histVol}>{formatVolume(p.volume)} kg</Text>
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {activeWorkout && progress.length > 0 ? (
        <View style={styles.footer}>
          <PrimaryButton title="Add to Current Workout" icon="add" onPress={addToWorkout} fullWidth />
        </View>
      ) : null}
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
  histRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  histDate: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, width: 70 },
  histMain: { color: colors.text, fontFamily: family.medium, fontSize: font.body, flex: 1 },
  histVol: { color: colors.textDim, fontFamily: family.body, fontSize: font.small },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
