import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Card,
  EmptyState,
  LineChart,
  PageWidth,
  PercentChart,
  PrimaryButton,
  SectionHeader,
  StreakCalendarModal,
  WeightLogger,
  WorkoutSummaryCard,
} from '../components';
import { useResponsive } from '../hooks/useResponsive';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, displayText, family, font, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import {
  activeSplitRotation,
  bmi,
  bmiLabel,
  focusStatus,
  nextSplitSession,
  repGuidance,
  suggestedIncrement,
  weightToTarget,
} from '../utils/coaching';
import { dayKey, fullDate, timeOfDay } from '../utils/date';
import { formatWeight, signedPct } from '../utils/format';
import {
  currentStreak,
  currentWeekProgress,
  dailyPctIncreaseThisWeek,
  dayAvgPctIncrease,
  dayExerciseIncreases,
  hasComparisonData,
  lastWorkout,
  mostImproved,
  muscleGridThisWeek,
  nextTarget,
  weekAvgPctIncrease,
  workoutDaysThisWeek,
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
  const bodyWeights = useStore((s) => s.bodyWeights);
  const repeatLastWorkout = useStore((s) => s.repeatLastWorkout);
  const startWorkoutFrom = useStore((s) => s.startWorkoutFrom);
  const logBodyWeight = useStore((s) => s.logBodyWeight);
  const updateSettings = useStore((s) => s.updateSettings);

  const [streakOpen, setStreakOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Per-day exercise breakdown for the "Increase This Week" card.
  const weekDays = useMemo(() => workoutDaysThisWeek(workouts), [workouts]);
  const activeDay = selectedDay && weekDays.includes(selectedDay) ? selectedDay : weekDays[0] ?? null;
  const dayExercises = useMemo(
    () => (activeDay ? dayExerciseIncreases(workouts, activeDay) : []),
    [workouts, activeDay],
  );
  const dayLabel = (key: string) => {
    if (key === dayKey(Date.now())) return 'TODAY';
    const [y, mo, d] = key.split('-').map(Number);
    return new Date(y, mo - 1, d).toLocaleDateString(undefined, { weekday: 'short' }).toUpperCase();
  };
  const { isDesktop } = useResponsive();

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

  // Coaching cues derived from the profile/goal data in Settings.
  const unit = settings.unit.toUpperCase();
  const wUnit = settings.unit; // raw unit for lifting-weight conversion (kg canonical)
  // Prefer the latest logged weigh-in; fall back to the Settings body stat.
  const loggedCurrent = bodyWeights.length ? bodyWeights[bodyWeights.length - 1].weight : null;
  const bodyWeight = loggedCurrent ?? settings.bodyStats.currentWeight ?? null;
  // BMI is kg-based; body weight is stored in the user's unit, so normalise.
  const bodyWeightKg =
    bodyWeight != null ? (settings.unit === 'lb' ? bodyWeight * 0.453592 : bodyWeight) : undefined;
  const bmiValue = useMemo(
    () => bmi(bodyWeightKg, settings.bodyStats.height),
    [bodyWeightKg, settings.bodyStats.height],
  );
  const target = weightToTarget(bodyWeight ?? undefined, settings.goals.targetBodyWeight);

  // Bodyweight trend for the Home BODY card (last 30 weigh-ins, oldest first).
  const bwSeries = bodyWeights.slice(-30);
  const bwValues = bwSeries.map((e) => e.weight);
  const bwLabels = bwSeries.map((e) => shortDate(e.date));
  const bwStart = bodyWeights.length ? bodyWeights[0].weight : null;
  const bwDelta = loggedCurrent !== null && bwStart !== null ? loggedCurrent - bwStart : null;

  const onLogWeight = (n: number) => {
    logBodyWeight(n);
    // Keep the Settings body stat in sync so BMI and target coaching stay fresh.
    updateSettings({ bodyStats: { ...settings.bodyStats, currentWeight: n } });
  };
  const trainNext = useMemo(() => {
    const rot = activeSplitRotation(settings);
    if (!rot) return null;
    const day = nextSplitSession(rot.days, workouts);
    return day ? { label: rot.label, day } : null;
  }, [settings, workouts]);
  const focus = useMemo(
    () => focusStatus(settings.goals.focusMuscleGroup, workouts),
    [settings.goals.focusMuscleGroup, workouts],
  );
  const reps = repGuidance(settings.goals.primaryFitnessGoal);
  const targetIncrement = m.target
    ? suggestedIncrement(settings.profile.experienceLevel, m.target.topWeight)
    : 0;

  const week = currentWeekProgress(workouts, settings.weeklyGoal);
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

  // Masthead
  const mastheadEl = (
    <View style={styles.masthead}>
      <View style={styles.mastheadRow}>
        <Text style={styles.eyebrow}>{fullDate(Date.now()).toUpperCase()}</Text>
        <Pressable
          onPress={() => setStreakOpen(true)}
          hitSlop={8}
          style={({ pressed }) => [styles.streakChip, pressed && styles.streakChipPressed]}
        >
          <Ionicons name="flame" size={13} color={colors.primary} />
          <Text style={styles.streakTag}>{m.streak}</Text>
          <View style={styles.streakDivider} />
          <Text style={styles.streakWeek}>{week.done}/{week.goal} WK</Text>
        </Pressable>
      </View>
      <Text style={styles.greeting}>
        {GREETING[timeOfDay()].toUpperCase()},{'\n'}
        {settings.userName.toUpperCase()}
      </Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );

  // CTAs
  const ctasEl = isDesktop ? (
    <View style={styles.ctasRow}>
      <PrimaryButton
        title={activeWorkout ? 'Resume Workout' : 'Start Workout'}
        icon={activeWorkout ? 'play' : 'add'}
        onPress={goToWorkout}
        style={styles.ctaBtn}
      />
      {m.last ? (
        <PrimaryButton title="Repeat Last Session" icon="refresh" variant="secondary" size="md" onPress={onRepeat} style={styles.ctaBtn} />
      ) : null}
    </View>
  ) : (
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
  );

  // Train next — suggested session from the user's preferred split
  const trainNextEl = trainNext ? (
    <Pressable onPress={goToWorkout} style={({ pressed }) => [styles.trainNext, pressed && styles.trainNextPressed]}>
      <View style={styles.trainNextIcon}>
        <Ionicons name="barbell" size={18} color={colors.bg} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.trainNextLabel}>TRAIN NEXT · {trainNext.label.toUpperCase()}</Text>
        <Text style={styles.trainNextName}>{trainNext.day.name.toUpperCase()}</Text>
        <Text style={styles.trainNextGroups} numberOfLines={1}>
          {trainNext.day.groups.join(' · ').toUpperCase()}
        </Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={colors.primary} />
    </Pressable>
  ) : null;

  // Feature: progressive-overload increase this week
  const featureEl = (
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

          {weekDays.length > 0 ? (
            <View style={styles.dayBreak}>
              <View style={styles.dayChips}>
                {weekDays.map((d) => {
                  const sel = d === activeDay;
                  return (
                    <Pressable key={d} onPress={() => setSelectedDay(d)} style={[styles.dayChip, sel && styles.dayChipOn]}>
                      <Text style={[styles.dayChipText, sel && styles.dayChipTextOn]}>{dayLabel(d)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {dayExercises.length > 0 ? (
                dayExercises.map((e) => (
                  <View key={e.exerciseId} style={styles.dayExRow}>
                    <Text style={styles.dayExName} numberOfLines={1}>{e.name}</Text>
                    <Text
                      style={[
                        styles.dayExPct,
                        { color: e.pct === null ? colors.textFaint : e.pct >= 0 ? colors.primary : colors.text },
                      ]}
                    >
                      {e.pct === null ? 'NEW' : signedPct(e.pct)}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={styles.featureCaption}>No comparable lifts that day.</Text>
              )}
            </View>
          ) : null}
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
  );

  // Inline weigh-in logger — shared by the empty and populated states.
  const weightLogger = (
    <WeightLogger
      current={loggedCurrent}
      unit={unit}
      actionLabel={loggedCurrent !== null ? 'UPDATE' : 'LOG'}
      onLog={onLogWeight}
    />
  );

  // Body — last recorded weight, BMI, a progress trend line and an update button
  const bodyEl = (
    <Card>
      <Text style={styles.cardLabel}>BODY</Text>
      {bodyWeight === null ? (
        <>
          <Text style={styles.bodyTarget}>Log your current weight to start tracking your trend here.</Text>
          {weightLogger}
        </>
      ) : (
        <>
          <View style={styles.bodyRow}>
            <View style={styles.bodyStat}>
              <Text style={styles.bodyValue}>{formatWeight(bodyWeight)}<Text style={styles.bodyUnit}> {unit}</Text></Text>
              <Text style={styles.bodyStatLabel}>LAST RECORDED</Text>
            </View>
            {bwDelta !== null && Math.abs(bwDelta) >= 0.1 ? (
              <View style={styles.bodyStat}>
                <Text style={[styles.bodyValue, { color: bwDelta > 0 ? colors.text : colors.primary }]}>
                  {bwDelta > 0 ? '+' : '−'}{formatWeight(Math.abs(bwDelta))}<Text style={styles.bodyUnit}> {unit}</Text>
                </Text>
                <Text style={styles.bodyStatLabel}>SINCE FIRST</Text>
              </View>
            ) : bmiValue !== null ? (
              <View style={styles.bodyStat}>
                <Text style={styles.bodyValue}>{bmiValue.toFixed(1)}</Text>
                <Text style={styles.bodyStatLabel}>BMI · {bmiLabel(bmiValue).toUpperCase()}</Text>
              </View>
            ) : null}
          </View>
          {bwSeries.length >= 2 ? (
            <LineChart
              values={bwValues}
              labels={bwLabels}
              height={130}
              formatValue={(v) => `${formatWeight(v)}`}
              style={styles.bodyChart}
            />
          ) : (
            <Text style={styles.bodyTarget}>Log again on another day to see your trend line.</Text>
          )}
          {target ? (
            <Text style={styles.bodyTarget}>
              {target.direction === 'reached'
                ? '🎯 You’re at your target weight.'
                : `${formatWeight(target.delta)} ${unit} to ${target.direction} to reach your target.`}
            </Text>
          ) : null}
          {weightLogger}
        </>
      )}
    </Card>
  );

  // Most improved — wide editorial card
  const mostImprovedEl = (
    <Card>
      <Text style={styles.cardLabel}>MOST IMPROVED LIFT</Text>
      {m.improved ? (
        <>
          <View style={styles.improvedRow}>
            <Text style={styles.improvedName}>{m.improved.name.toUpperCase()}</Text>
            <Text style={styles.improvedDelta}>+{formatWeight(m.improved.deltaWeight, wUnit)} {unit}</Text>
          </View>
          <Text style={styles.improvedLine}>
            Up {Math.round(m.improved.deltaPct)}% on your top set since you started tracking it.
          </Text>
        </>
      ) : (
        <Text style={styles.improvedLine}>Log a lift twice and your biggest gain shows up here.</Text>
      )}
    </Card>
  );

  // Muscle focus — 6x7 weekly block grid
  const muscleFocusEl = (
    <View style={styles.section}>
      <SectionHeader title="Muscle Focus" subtitle="Groups trained by day · this week" />
      {focus ? (
        <View style={[styles.focusNudge, focus.trainedThisWeek ? styles.focusNudgeOk : styles.focusNudgeWarn]}>
          <Ionicons
            name={focus.trainedThisWeek ? 'checkmark-circle' : 'alert-circle'}
            size={15}
            color={focus.trainedThisWeek ? colors.primary : colors.text}
          />
          <Text style={styles.focusNudgeText}>
            {focus.trainedThisWeek
              ? `Focus on track — ${focus.group} trained this week.`
              : `Your focus is ${focus.group} — not trained yet this week.`}
          </Text>
        </View>
      ) : null}
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
                      style={[
                        styles.block,
                        on ? { backgroundColor: colors.primary } : styles.blockOff,
                      ]}
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
  );

  // Next target — progression coaching insight
  const nextTargetEl = (
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
                Try +{formatWeight(targetIncrement, wUnit)}{wUnit} next time
              </Text>
            </View>
            <Text style={styles.targetMeta}>
              Last top set · {formatWeight(m.target.topWeight, wUnit)}{wUnit} × {m.target.reps} reps
            </Text>
            {reps ? (
              <Text style={styles.targetGuidance}>{reps.note}</Text>
            ) : null}
          </>
        ) : (
          <Text style={styles.improvedLine}>
            Log a lift twice without dropping volume and your next target appears here.
          </Text>
        )}
      </Card>
    </View>
  );

  // Last session — History is intentionally unlinked from navigation for now.
  const lastSessionEl = (
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
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scrollFull} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PageWidth style={[styles.page, isDesktop && styles.pageDesktop]}>
          {isDesktop ? (
            <View style={styles.desktopRoot}>
              {mastheadEl}
              {ctasEl}
              <View style={styles.desktopGrid}>
                <View style={styles.mainCol}>
                  {trainNextEl}
                  {featureEl}
                  {muscleFocusEl}
                </View>
                <View style={styles.sideCol}>
                  {bodyEl}
                  {nextTargetEl}
                  {mostImprovedEl}
                  {lastSessionEl}
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {mastheadEl}
              {ctasEl}
              {trainNextEl}
              {featureEl}
              {bodyEl}
              {mostImprovedEl}
              {muscleFocusEl}
              {nextTargetEl}
              {lastSessionEl}
            </View>
          )}
        </PageWidth>
      </ScrollView>

      <StreakCalendarModal visible={streakOpen} onClose={() => setStreakOpen(false)} sessions={workouts} weeklyGoal={settings.weeklyGoal} />
    </SafeAreaView>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
/** 'yyyy-mm-dd' → 'D Mon' for chart axis labels. */
function shortDate(iso: string): string {
  const [, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!m || !d) return '';
  return `${d} ${MONTHS[m - 1]}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  scrollFull: { width: '100%' },
  scrollContent: { width: '100%', alignItems: 'center', paddingBottom: spacing.xxl },
  page: { paddingHorizontal: spacing.lg },
  pageDesktop: { paddingHorizontal: spacing.xxl },
  stack: { gap: spacing.xl },
  desktopRoot: { gap: spacing.xxl },
  desktopGrid: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'flex-start' },
  mainCol: { flex: 1, gap: spacing.xxl, minWidth: 0 },
  sideCol: { width: 380, gap: spacing.xl },

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
  streakDivider: { width: 1, height: 10, backgroundColor: withAlpha(colors.primary, 0.4) },
  streakWeek: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
  greeting: {
    ...displayText(46, 0.5),
    color: colors.text,
    marginTop: spacing.md,
  },
  subtitle: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, marginTop: spacing.md, lineHeight: 21 },

  ctas: { gap: spacing.sm },
  ctasRow: { flexDirection: 'row', gap: spacing.sm, maxWidth: 560 },
  ctaBtn: { flex: 1 },
  flex: { flex: 1 },

  cardLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6 },

  // Train next
  trainNext: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  trainNextPressed: { backgroundColor: colors.card2 },
  trainNextIcon: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  trainNextLabel: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2 },
  trainNextName: { ...displayText(font.h3, 0.5), color: colors.text, marginTop: 1 },
  trainNextGroups: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, marginTop: 2 },

  // Body card
  bodyRow: { flexDirection: 'row', gap: spacing.xl, marginTop: spacing.sm },
  bodyStat: {},
  bodyValue: { ...displayText(font.h1), color: colors.text },
  bodyUnit: { fontFamily: family.medium, fontSize: font.label, color: colors.textDim },
  bodyStatLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, marginTop: 2 },
  bodyTarget: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: spacing.md, lineHeight: 19 },
  bodyChart: { marginTop: spacing.lg },

  // Focus nudge
  focusNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.sm,
  },
  focusNudgeOk: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  focusNudgeWarn: { borderColor: colors.border, backgroundColor: colors.card },
  focusNudgeText: { flex: 1, color: colors.text, fontFamily: family.medium, fontSize: font.small },

  // Feature card
  feature: { minHeight: 150 },
  featureValueRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing.sm },
  featureValue: { ...displayText(60) },
  featureUnit: { color: colors.textDim, fontFamily: family.medium, fontSize: font.label, marginLeft: 8, marginBottom: 9 },
  featureCaption: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm },
  featureChart: { marginTop: spacing.lg },
  // Per-day exercise breakdown
  dayBreak: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md, gap: spacing.sm },
  dayChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.xs },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.borderStrong },
  dayChipOn: { borderColor: colors.primary, backgroundColor: colors.primaryDim },
  dayChipText: { color: colors.textDim, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 0.8 },
  dayChipTextOn: { color: colors.primary },
  dayExRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md, paddingVertical: 5 },
  dayExName: { flex: 1, color: colors.text, fontFamily: family.medium, fontSize: font.small },
  dayExPct: { fontFamily: family.semibold, fontSize: font.small, letterSpacing: 0.4 },
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
  blockOff: { backgroundColor: withAlpha(colors.text, 0.07), borderWidth: 1, borderColor: colors.border },

  // Next target
  targetName: { ...displayText(font.h1, 0.5), color: colors.text, marginTop: spacing.sm },
  targetCueRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  targetCue: { color: colors.primary, fontFamily: family.semibold, fontSize: font.body, letterSpacing: 0.3 },
  targetMeta: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm },
  targetGuidance: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, marginTop: spacing.xs, lineHeight: 18 },
});
