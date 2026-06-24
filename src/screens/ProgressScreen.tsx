import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, KPICard, PersonalBestBadge, ProgressBar, SectionHeader, StatChart } from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, family, font, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import { formatVolume, formatWeight } from '../utils/format';
import {
  currentStreak,
  exerciseProgress,
  exercisesByFrequency,
  muscleFrequency,
  overloadInsights,
  overloadLabel,
  overloadScore,
  personalRecordList,
  totalVolume,
  weeklyVolumeSeries,
  weeklyWorkoutSeries,
} from '../utils/stats';

export default function ProgressScreen({ navigation }: TabScreenProps<'Progress'>) {
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);

  const data = useMemo(() => {
    const score = overloadScore(workouts);
    const freq = exercisesByFrequency(workouts);
    return {
      score,
      scoreLabel: overloadLabel(score),
      totalVol: totalVolume(workouts),
      totalWorkouts: workouts.length,
      streak: currentStreak(workouts),
      prs: personalRecordList(workouts),
      weeklyVol: weeklyVolumeSeries(workouts, 8),
      weeklyCount: weeklyWorkoutSeries(workouts, 8),
      muscleFreq: muscleFrequency(workouts, 4),
      insights: overloadInsights(workouts, settings.weeklyGoal),
      topExercises: freq.slice(0, 6),
    };
  }, [workouts, settings.weeklyGoal]);

  const [selectedExId, setSelectedExId] = useState<string | undefined>(undefined);
  const selectedId = selectedExId ?? data.topExercises[0]?.exerciseId;
  const exProgress = useMemo(() => (selectedId ? exerciseProgress(workouts, selectedId) : []), [workouts, selectedId]);
  const exChart = exProgress.map((p, i) => ({ label: p.label, value: p.topWeight, highlight: i === exProgress.length - 1 }));
  const est1RM = exProgress.length ? Math.max(...exProgress.map((p) => p.e1rm)) : 0;

  const scoreColor = data.score >= 60 ? colors.primary : colors.text;
  const maxFreq = Math.max(1, ...data.muscleFreq.map((m) => m.value));

  if (workouts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.head}>
          <Text style={styles.title}>PROGRESS</Text>
        </View>
        <EmptyState icon="stats-chart-outline" title="No progress yet" message="Log a few workouts and your analytics, records and trends show up here." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.head}>
          <Text style={styles.title}>PROGRESS</Text>
          <Text style={styles.subtitle}>THE PERFORMANCE REPORT</Text>
        </View>

        <View style={styles.tiles}>
          <KPICard style={styles.tile} label="Total volume" value={data.totalVol} unit="kg" accent={colors.primary} countUp format={formatVolume} />
          <KPICard style={styles.tile} label="Workouts" value={data.totalWorkouts} countUp />
        </View>
        <View style={styles.tiles}>
          <KPICard style={styles.tile} label="Current streak" value={data.streak} countUp caption="DAYS" />
          <KPICard style={styles.tile} label="Records" value={data.prs.length} countUp />
        </View>

        {/* Progressive overload */}
        <View style={styles.section}>
          <SectionHeader title="Progressive Overload" subtitle="Are you adding work over time?" />
          <View style={styles.card}>
            <View style={styles.scoreRow}>
              <View style={styles.scoreLeft}>
                <Text style={[styles.scoreValue, { color: scoreColor }]}>{data.score}</Text>
                <Text style={styles.scoreOutOf}>/ 100</Text>
              </View>
              <View style={styles.scoreBadge}>
                <Text style={styles.scoreBadgeText}>{data.scoreLabel.toUpperCase()}</Text>
              </View>
            </View>
            <ProgressBar progress={data.score / 100} color={scoreColor} height={10} />
            <View style={styles.insights}>
              {data.insights.map((line, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={styles.insightTick} />
                  <Text style={styles.insightText}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Volume over time */}
        <View style={styles.section}>
          <SectionHeader title="Volume Over Time" subtitle="Total kg per week · last 8 weeks" />
          <View style={styles.card}>
            <StatChart data={data.weeklyVol} color={colors.primary} height={150} showValues formatValue={formatVolume} />
          </View>
        </View>

        {/* Weekly consistency */}
        <View style={styles.section}>
          <SectionHeader title="Weekly Consistency" subtitle={`Workouts per week · goal ${settings.weeklyGoal}`} />
          <View style={styles.card}>
            <StatChart data={data.weeklyCount} color={colors.primary} height={120} showValues />
          </View>
        </View>

        {/* Exercise progress */}
        <View style={styles.section}>
          <SectionHeader title="Exercise Progress" subtitle="Top set weight per session" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.exChips}>
            {data.topExercises.map((ex) => {
              const sel = ex.exerciseId === selectedId;
              return (
                <Pressable
                  key={ex.exerciseId}
                  onPress={() => setSelectedExId(ex.exerciseId)}
                  style={[styles.exChip, { backgroundColor: sel ? colors.primaryDim : 'transparent', borderColor: sel ? colors.primary : colors.borderStrong }]}
                >
                  <Text style={[styles.exChipText, { color: sel ? colors.primary : colors.textDim }]}>{ex.name.toUpperCase()}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.card}>
            {exChart.length > 0 ? (
              <>
                <View style={styles.estRow}>
                  <Text style={styles.cardLabel}>ESTIMATED 1RM</Text>
                  <Text style={styles.estValue}>{formatWeight(est1RM)} KG</Text>
                </View>
                <StatChart data={exChart} color={colors.primary} height={150} showValues formatValue={formatWeight} />
              </>
            ) : (
              <Text style={styles.muted}>No sessions logged for this exercise yet.</Text>
            )}
          </View>
        </View>

        {/* Personal records */}
        <View style={styles.section}>
          <SectionHeader title="Personal Records" subtitle="Your heaviest lifts" />
          <View style={{ gap: spacing.sm }}>
            {data.prs.slice(0, 8).map((pr) => (
              <Pressable key={pr.exerciseId} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: pr.exerciseId })}>
                <PersonalBestBadge
                  title={pr.exerciseName}
                  value={`${formatWeight(pr.maxWeight)} kg`}
                  caption={`${pr.repsAtMaxWeight} reps · e1RM ${formatWeight(pr.estimatedOneRepMax)} kg`}
                />
              </Pressable>
            ))}
          </View>
        </View>

        {/* Muscle frequency */}
        <View style={styles.section}>
          <SectionHeader title="Muscle Frequency" subtitle="Sessions per group · last 4 weeks" />
          <View style={styles.card}>
            {data.muscleFreq.map((row) => {
              const isTop = row.value === maxFreq && row.value > 0;
              return (
                <View key={row.group} style={styles.muscleRow}>
                  <Text style={styles.muscleName}>{row.group.toUpperCase()}</Text>
                  <ProgressBar progress={row.value / maxFreq} color={isTop ? colors.primary : withAlpha(colors.text, 0.5)} height={6} style={styles.muscleBar} />
                  <Text style={styles.muscleValue}>{row.value}×</Text>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  head: { paddingTop: spacing.sm },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  section: {},
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },
  cardLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  scoreLeft: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  scoreValue: { fontFamily: family.display, fontSize: 56, lineHeight: 64, letterSpacing: 0.5, includeFontPadding: false },
  scoreOutOf: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.label },
  scoreBadge: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong },
  scoreBadgeText: { color: colors.text, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
  insights: { marginTop: spacing.lg, gap: spacing.md },
  insightRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  insightTick: { width: 3, height: 16, backgroundColor: colors.primary, marginTop: 2 },
  insightText: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, flex: 1, lineHeight: 21 },
  exChips: { gap: spacing.sm, paddingBottom: spacing.md },
  exChip: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.sm, borderWidth: 1 },
  exChipText: { fontFamily: family.medium, fontSize: font.small, letterSpacing: 0.6 },
  estRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
  estValue: { color: colors.primary, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 0.5, includeFontPadding: false },
  muted: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, textAlign: 'center', paddingVertical: spacing.lg },
  muscleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  muscleName: { color: colors.text, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, width: 80 },
  muscleBar: { flex: 1, marginHorizontal: spacing.md },
  muscleValue: { color: colors.textDim, fontFamily: family.display, fontSize: font.lg, width: 36, textAlign: 'right', includeFontPadding: false },
});
