import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  EmptyState,
  PercentChart,
  PrimaryButton,
  SectionHeader,
  StreakCalendarModal,
  WorkoutSummaryCard,
} from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, displayText, family, font, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import { dayKey, fullDate, timeOfDay } from '../utils/date';
import { formatWeight, signedPct } from '../utils/format';
import {
  currentStreak,
  dailyPctIncreaseThisWeek,
  dayAvgPctIncrease,
  hasComparisonData,
  lastWorkout,
  mostImproved,
  muscleGridThisWeek,
  nextTarget,
  weekAvgPctIncrease,
} from '../utils/stats';

const GREETING: Record<ReturnType<typeof timeOfDay>, string> = {
  morning: 'Good morning',
  afternoon: 'Good afternoon',
  evening: 'Good evening',
};

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HomeScreen({ navigation }: TabScreenProps<'Home'>) {
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const activeWorkout = useStore((s) => s.activeWorkout);
  const repeatLastWorkout = useStore((s) => s.repeatLastWorkout);
  const startWorkoutFrom = useStore((s) => s.startWorkoutFrom);

  const [streakOpen, setStreakOpen] = useState(false);

  const m = useMemo(() => {
    const last = lastWorkout(workouts);
    return {
      streak: currentStreak(workouts),
      improved: mostImproved(workouts),
      muscleGrid: muscleGridThisWeek(workouts),
      weekPct: weekAvgPctIncrease(workouts),
      daily: dailyPctIncreaseThisWeek(workouts),
      hasComparison: hasComparisonData(workouts),
      target: nextTarget(workouts),
      last,
      lastPct: last ? dayAvgPctIncrease(workouts, dayKey(last.startedAt)) : null,
    };
  }, [workouts]);

  const todayCol = (new Date().getDay() + 6) % 7;
  const trainedThisWeek = m.muscleGrid.some((row) => row.days.some(Boolean));
  const weekPctColor =
    m.weekPct === null ? colors.text : m.weekPct >= 0 ? colors.primary : colors.text;

  const subtitle =
    m.streak >= 2
      ? `${m.streak}-day streak. Keep the line unbroken.`
      : m.last
        ? 'Momentum is building. Stack another clean session.'
        : "A blank page. Log today's first set.";

  // Route to the Workout tab; the pre-start screen offers blank / repeat /
  // template, and resumes automatically if a session is already active.
  const goToWorkout = () => navigation.navigate('Workout');
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
            <Pressable
              onPress={() => setStreakOpen(true)}
              hitSlop={8}
              style={({ pressed }) => [styles.streakChip, pressed && styles.streakChipPressed]}
            >
              <Ionicons name="flame" size={13} color={colors.primary} />
              <Text style={styles.streakTag}>STREAK · {m.streak}</Text>
            </Pressable>
          </View>
          <Text style={styles.greeting}>
            {GREETING[timeOfDay()].toUpperCase()},{'\n'}
            {settings.userName.toUpperCase()}
          </Text>
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

        {/* Feature: progressive-overload increase this week */}
        <Card style={styles.feature}>
          <Text style={styles.cardLabel}>INCREASE THIS WEEK</Text>
          {m.hasComparison ? (
            <>
              <View style={styles.featureValueRow}>
                <Text style={[styles.featureValue, { color: weekPctColor }]}>
                  {m.weekPct === null ? '—' : signedPct(m.weekPct)}
                </Text>
                {m.weekPct !== null ? <Text style={styles.featureUnit}>avg overload</Text> : null}
              </View>
              <Text style={styles.featureCaption}>
                {m.weekPct === null
                  ? 'No comparable lifts logged yet this week.'
                  : 'Average per-exercise gain vs your previous sessions.'}
              </Text>
              <PercentChart data={m.daily} height={104} style={styles.featureChart} />
            </>
          ) : (
            <View style={styles.featureEmpty}>
              <Ionicons name="trending-up" size={22} color={colors.primary} />
              <Text style={styles.featureEmptyText}>
                First logged session — comparison starts next time you train these lifts.
              </Text>
            </View>
          )}
        </Card>

        {/* Most improved — wide editorial card */}
        <Card>
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

        {/* Muscle focus — 6x7 weekly block grid */}
        <View style={styles.section}>
          <SectionHeader title="Muscle Focus" subtitle="Groups trained by day · this week" />
          <Card>
            {trainedThisWeek ? (
              <>
                <View style={styles.gridHeader}>
                  <View style={styles.gridNameSpacer} />
                  <View style={styles.gridBlocks}>
                    {DAY_LETTERS.map((d, i) => (
                      <Text
                        key={i}
                        style={[styles.gridDayLetter, i === todayCol && styles.gridDayLetterToday]}
                      >
                        {d}
                      </Text>
                    ))}
                  </View>
                </View>
                {m.muscleGrid.map((row) => (
                  <View key={row.group} style={styles.gridRow}>
                    <Text style={styles.gridName}>{row.group.toUpperCase()}</Text>
                    <View style={styles.gridBlocks}>
                      {row.days.map((on, i) => (
                        <View
                          key={i}
                          style={[styles.block, on ? styles.blockOn : styles.blockOff]}
                        />
                      ))}
                    </View>
                  </View>
                ))}
              </>
            ) : (
              <EmptyState icon="grid-outline" title="No sessions this week" message="Train a group and its week lights up here." />
            )}
          </Card>
        </View>

        {/* Next target — progression coaching insight */}
        <View style={styles.section}>
          <SectionHeader title="Next Target" subtitle="The lift most ready to progress" />
          <Card>
            <Text style={styles.cardLabel}>READY TO PROGRESS</Text>
            {m.target ? (
              <>
                <Text style={styles.targetName}>{m.target.name.toUpperCase()}</Text>
                <View style={styles.targetCueRow}>
                  <Ionicons name="arrow-up-circle" size={16} color={colors.primary} />
                  <Text style={styles.targetCue}>
                    Try +{formatWeight(m.target.increment)}kg next time
                  </Text>
                </View>
                <Text style={styles.targetMeta}>
                  Last top set · {formatWeight(m.target.topWeight)}kg × {m.target.reps} reps
                </Text>
              </>
            ) : (
              <Text style={styles.improvedLine}>
                Log a lift twice without dropping volume and your next target appears here.
              </Text>
            )}
          </Card>
        </View>

        {/* Last session — History is intentionally unlinked from navigation for now. */}
        <View style={styles.section}>
          <SectionHeader title="Last Session" />
          {m.last ? (
            <WorkoutSummaryCard
              session={m.last}
              pctIncrease={m.lastPct}
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

      <StreakCalendarModal visible={streakOpen} onClose={() => setStreakOpen(false)} sessions={workouts} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },

  masthead: { marginTop: spacing.sm },
  mastheadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  eyebrow: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.5 },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  streakChipPressed: { backgroundColor: colors.primarySoft },
  streakTag: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1.5 },
  greeting: {
    ...displayText(46, 0.5),
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, marginTop: spacing.md, lineHeight: 21 },

  ctas: { gap: spacing.sm },

  cardLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6 },

  // Feature card
  feature: { minHeight: 150 },
  featureValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm },
  featureValue: { ...displayText(60) },
  featureUnit: { color: colors.textDim, fontFamily: family.medium, fontSize: font.label, marginLeft: 8, marginBottom: 9 },
  featureCaption: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm },
  featureChart: { marginTop: spacing.lg },
  featureEmpty: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md },
  featureEmptyText: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, lineHeight: 19, flex: 1 },

  // Most improved
  improvedRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.sm },
  improvedName: { ...displayText(font.h1, 0.5), color: colors.text, flex: 1 },
  improvedDelta: { ...displayText(font.h1), color: colors.primary, marginLeft: spacing.md },
  improvedLine: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm, lineHeight: 19 },

  section: {},

  // Muscle grid
  gridHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  gridNameSpacer: { width: 72 },
  gridRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  gridName: { color: colors.text, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, width: 72 },
  gridBlocks: { flex: 1, flexDirection: 'row', gap: 6 },
  gridDayLetter: { flex: 1, textAlign: 'center', color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny },
  gridDayLetterToday: { color: colors.text },
  block: { flex: 1, height: 18, borderRadius: radius.xs },
  blockOn: { backgroundColor: colors.primary },
  blockOff: { backgroundColor: withAlpha(colors.text, 0.07), borderWidth: 1, borderColor: colors.border },

  // Next target
  targetName: { ...displayText(font.h1, 0.5), color: colors.text, marginTop: spacing.sm },
  targetCueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  targetCue: { color: colors.primary, fontFamily: family.semibold, fontSize: font.body, letterSpacing: 0.3 },
  targetMeta: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm },
});
