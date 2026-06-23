import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  EmptyState,
  KPICard,
  MuscleGroupBadge,
  PrimaryButton,
  ProgressBar,
  SectionHeader,
  StatChart,
  WorkoutSummaryCard,
} from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { MUSCLE_GROUPS } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import { DAY_MS, fullDate, startOfDay, timeOfDay } from '../utils/date';
import { formatVolume, formatWeight } from '../utils/format';
import {
  currentStreak,
  dailyVolumeThisWeek,
  lastWorkout,
  longestStreak,
  mostImproved,
  muscleGroupsThisWeek,
  muscleVolumeThisWeek,
  overloadLabel,
  overloadScore,
  volumeLastWeek,
  volumeThisWeek,
  workoutsThisWeek,
} from '../utils/stats';

const GREETING: Record<ReturnType<typeof timeOfDay>, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

function recoveryFor(daysSince: number | null) {
  if (daysSince === null) return { word: 'NEW', line: 'Log your first session to begin tracking.', pct: 0, ready: false };
  if (daysSince <= 0) return { word: 'PRIMED', line: 'Logged today — recovery starts now.', pct: 0.25, ready: false };
  if (daysSince === 1) return { word: 'BUILDING', line: 'One day of recovery in the bank.', pct: 0.55, ready: false };
  if (daysSince === 2) return { word: 'READY', line: 'Recovered and ready to progress.', pct: 0.85, ready: true };
  return { word: 'FRESH', line: `${daysSince} days of rest — time to train.`, pct: 1, ready: true };
}

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const activeWorkout = useStore((s) => s.activeWorkout);
  const startWorkout = useStore((s) => s.startWorkout);
  const repeatLastWorkout = useStore((s) => s.repeatLastWorkout);
  const startWorkoutFrom = useStore((s) => s.startWorkoutFrom);

  const m = useMemo(() => {
    const volTW = volumeThisWeek(workouts);
    const volLW = volumeLastWeek(workouts);
    const score = overloadScore(workouts);
    const last = lastWorkout(workouts);
    const daysSince = last
      ? Math.round((startOfDay(Date.now()).getTime() - startOfDay(last.startedAt).getTime()) / DAY_MS)
      : null;
    return {
      volTW,
      volTrend: volLW > 0 ? ((volTW - volLW) / volLW) * 100 : null,
      wTW: workoutsThisWeek(workouts),
      streak: currentStreak(workouts),
      longest: longestStreak(workouts),
      score,
      scoreLabel: overloadLabel(score),
      improved: mostImproved(workouts),
      muscles: muscleGroupsThisWeek(workouts),
      last,
      daily: dailyVolumeThisWeek(workouts),
      muscleVol: muscleVolumeThisWeek(workouts),
      recovery: recoveryFor(daysSince),
    };
  }, [workouts]);

  const goal = settings.weeklyGoal;
  const maxMuscle = Math.max(1, ...m.muscleVol.map((x) => x.value));
  const topMuscleValue = maxMuscle;

  const subtitle =
    m.streak >= 2
      ? `${m.streak}-day streak. Keep the line unbroken.`
      : m.wTW > 0
        ? 'Momentum is building. Stack another clean session.'
        : "A blank page. Log today's first set.";

  const goToWorkout = () => {
    if (!activeWorkout) startWorkout();
    navigation.navigate('Workout');
  };
  const onRepeat = () => {
    if (repeatLastWorkout()) navigation.navigate('Workout');
  };
  const repeatSession = (id: string) => {
    if (startWorkoutFrom(id)) navigation.navigate('Workout');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Masthead */}
        <View style={styles.masthead}>
          <View style={styles.mastheadRow}>
            <Text style={styles.eyebrow}>{fullDate(Date.now()).toUpperCase()}</Text>
            {m.streak > 0 ? (
              <Text style={styles.streakTag}>STREAK · {m.streak}</Text>
            ) : null}
          </View>
          <Text style={styles.greeting}>{GREETING[timeOfDay()].toUpperCase()},{'\n'}{settings.userName.toUpperCase()}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>

        {/* CTAs */}
        <View style={styles.ctas}>
          <PrimaryButton
            title={activeWorkout ? 'Resume Workout' : 'Start Workout'}
            icon={activeWorkout ? 'play' : 'add'}
            onPress={goToWorkout}
            fullWidth
          />
          {m.last ? (
            <PrimaryButton title="Repeat Last Session" icon="refresh" variant="secondary" size="md" onPress={onRepeat} fullWidth />
          ) : null}
        </View>

        {/* Feature KPI: weekly volume */}
        <KPICard
          label="Total volume this week"
          value={m.volTW}
          unit="kg"
          accent={colors.primary}
          feature
          countUp
          format={formatVolume}
          trend={m.volTrend}
        >
          <StatChart data={m.daily} color={colors.primary} height={92} />
        </KPICard>

        {/* Compact KPI trio */}
        <View style={styles.trio}>
          <KPICard style={styles.trioItem} label="Workouts" value={m.wTW} countUp caption={`GOAL ${goal}`} />
          <KPICard style={styles.trioItem} label="Streak" value={m.streak} countUp caption={`BEST ${m.longest}`} />
          <KPICard style={styles.trioItem} label="Overload" value={m.score} countUp caption={m.scoreLabel.toUpperCase()} />
        </View>

        {/* Most improved — wide editorial card */}
        <Card style={styles.improved}>
          <Text style={styles.cardLabel}>MOST IMPROVED LIFT</Text>
          {m.improved ? (
            <>
              <View style={styles.improvedRow}>
                <Text style={styles.improvedName}>{m.improved.name.toUpperCase()}</Text>
                <Text style={styles.improvedDelta}>+{formatWeight(m.improved.deltaWeight)} KG</Text>
              </View>
              <Text style={styles.improvedLine}>
                Up {Math.round(m.improved.deltaPct)}% on your top set since you started tracking it.
              </Text>
            </>
          ) : (
            <Text style={styles.improvedLine}>Log a lift twice and your biggest gain shows up here.</Text>
          )}
        </Card>

        {/* Recovery */}
        <Card style={styles.recovery}>
          <View style={styles.recoveryHead}>
            <Text style={styles.cardLabel}>RECOVERY STATUS</Text>
            <Text style={[styles.recoveryWord, { color: m.recovery.ready ? colors.primary : colors.text }]}>
              {m.recovery.word}
            </Text>
          </View>
          <ProgressBar progress={m.recovery.pct} height={6} style={{ marginTop: spacing.md }} />
          <Text style={styles.recoveryLine}>{m.recovery.line}</Text>
        </Card>

        {/* Muscle focus */}
        <View style={styles.section}>
          <SectionHeader title="Muscle Focus" subtitle="Training volume by group · this week" />
          <Card>
            {topMuscleValue <= 1 ? (
              <EmptyState icon="pulse-outline" title="No muscle data" message="Finish a session this week to see your split." />
            ) : (
              m.muscleVol.map((row) => {
                const isTop = row.value === topMuscleValue && row.value > 0;
                return (
                  <View key={row.group} style={styles.muscleRow}>
                    <Text style={styles.muscleName}>{row.group.toUpperCase()}</Text>
                    <ProgressBar
                      progress={row.value / maxMuscle}
                      color={isTop ? colors.primary : withAlpha(colors.text, 0.5)}
                      height={6}
                      style={styles.muscleBar}
                    />
                    <Text style={styles.muscleValue}>{formatVolume(row.value)}</Text>
                  </View>
                );
              })
            )}
          </Card>
          {m.muscles.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
              {MUSCLE_GROUPS.map((g) => (
                <MuscleGroupBadge key={g} group={g} active={m.muscles.includes(g)} />
              ))}
            </ScrollView>
          ) : null}
        </View>

        {/* Last session */}
        <View style={styles.section}>
          <SectionHeader title="Last Session" actionLabel="History" onAction={() => navigation.navigate('History')} />
          {m.last ? (
            <WorkoutSummaryCard
              session={m.last}
              onPress={() => navigation.navigate('WorkoutDetail', { sessionId: m.last!.id })}
              onRepeat={() => repeatSession(m.last!.id)}
            />
          ) : (
            <EmptyState
              icon="barbell-outline"
              title="No workouts yet"
              message="Start your first session and it lands here."
              actionLabel="Start Workout"
              onAction={goToWorkout}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },

  masthead: { marginTop: spacing.sm },
  mastheadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.5 },
  streakTag: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1.5 },
  greeting: {
    color: colors.text,
    fontFamily: family.display,
    fontSize: 46,
    lineHeight: 44,
    letterSpacing: 0.5,
    marginTop: spacing.md,
    includeFontPadding: false,
  },
  subtitle: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, marginTop: spacing.md, lineHeight: 21 },

  ctas: { gap: spacing.sm },

  trio: { flexDirection: 'row', gap: spacing.md },
  trioItem: { flex: 1 },

  improved: {},
  cardLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6 },
  improvedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm },
  improvedName: { color: colors.text, fontFamily: family.display, fontSize: font.h1, letterSpacing: 0.5, flex: 1, includeFontPadding: false },
  improvedDelta: { color: colors.primary, fontFamily: family.display, fontSize: font.h1, includeFontPadding: false, marginLeft: spacing.md },
  improvedLine: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm, lineHeight: 19 },

  recovery: {},
  recoveryHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  recoveryWord: { fontFamily: family.display, fontSize: font.h1, letterSpacing: 1, includeFontPadding: false },
  recoveryLine: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: spacing.md },

  section: {},
  muscleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  muscleName: { color: colors.text, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, width: 80 },
  muscleBar: { flex: 1, marginHorizontal: spacing.md },
  muscleValue: { color: colors.textDim, fontFamily: family.display, fontSize: font.lg, width: 52, textAlign: 'right', includeFontPadding: false },
  chips: { gap: spacing.sm, paddingTop: spacing.md },
});
