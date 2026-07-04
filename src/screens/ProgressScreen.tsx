import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ExerciseCard,
  KPICard,
  LineChart,
  MuscleFilter,
  MuscleFilterTabs,
  PageWidth,
  PersonalBestBadge,
  ProgressBar,
  SearchInput,
  SectionHeader,
} from '../components';
import { useResponsive } from '../hooks/useResponsive';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import { repGuidance } from '../utils/coaching';
import { formatWeight, signedPct } from '../utils/format';
import {
  computePRs,
  currentStreak,
  latestPersonalRecord,
  muscleFrequency,
  overloadInsights,
  overloadLabel,
  overloadScore,
  personalRecordList,
  rollingWeekConsistency,
  weeklyOverloadPace,
} from '../utils/stats';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MAX_KEY_LIFTS = 6;
const SIDE_COL_WIDTH = 380;

export default function ProgressScreen({ navigation }: TabScreenProps<'Progress'>) {
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const exercises = useStore((s) => s.exercises);
  const bodyWeights = useStore((s) => s.bodyWeights);
  const updateSettings = useStore((s) => s.updateSettings);
  const logBodyWeight = useStore((s) => s.logBodyWeight);

  const data = useMemo(() => {
    const score = overloadScore(workouts);
    return {
      score,
      scoreLabel: overloadLabel(score),
      pace: weeklyOverloadPace(workouts, 4),
      totalWorkouts: workouts.length,
      streak: currentStreak(workouts),
      latestPr: latestPersonalRecord(workouts),
      prs: personalRecordList(workouts),
      prMap: computePRs(workouts),
      muscleFreq: muscleFrequency(workouts, 4),
      insights: overloadInsights(workouts, settings.weeklyGoal),
      weeks: rollingWeekConsistency(workouts, settings.weeklyGoal, 4),
    };
  }, [workouts, settings.weeklyGoal]);

  const scoreColor = data.score >= 60 ? colors.primary : colors.text;
  const paceColor = data.pace === null ? colors.text : data.pace >= 0 ? colors.primary : colors.text;
  const maxFreq = Math.max(1, ...data.muscleFreq.map((m) => m.value));

  // Goal-tailored coaching line prepended to the overload insights.
  const focusGroup = settings.goals.focusMuscleGroup;
  const goalLine = (() => {
    const g = settings.goals.primaryFitnessGoal;
    if (!g) return null;
    const rg = repGuidance(g);
    return rg ? `Goal: ${g} — ${rg.note}` : `Goal: ${g}.`;
  })();
  const insights = goalLine ? [goalLine, ...data.insights] : data.insights;

  // Bodyweight trend (last 30 weigh-ins, oldest first).
  const unit = settings.unit.toUpperCase();
  const bwSeries = bodyWeights.slice(-30);
  const bwValues = bwSeries.map((e) => e.weight);
  const bwLabels = bwSeries.map((e) => shortDate(e.date));
  const bwCurrent = bodyWeights.length ? bodyWeights[bodyWeights.length - 1].weight : null;
  const bwStart = bodyWeights.length ? bodyWeights[0].weight : null;
  const bwDelta = bwCurrent !== null && bwStart !== null ? bwCurrent - bwStart : null;
  const targetWeight = settings.goals.targetBodyWeight;
  const [weightInput, setWeightInput] = useState('');
  const onLogWeight = () => {
    const n = parseFloat(weightInput.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    logBodyWeight(n);
    setWeightInput('');
  };

  // Key lifts (editable from the heading) — 3–6 chosen exercises.
  const featured = settings.featuredExercises.slice(0, MAX_KEY_LIFTS);
  const [editorOpen, setEditorOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('All');
  const { width, isDesktop } = useResponsive();
  const pageWidth = Math.min(width, layout.maxContentWidth) - spacing.lg * 2;
  const mainWidth = isDesktop ? pageWidth - SIDE_COL_WIDTH - spacing.xxxl : pageWidth;
  const keyLiftCols = isDesktop ? MAX_KEY_LIFTS : 3;
  const colW = (mainWidth - spacing.md * (keyLiftCols - 1)) / keyLiftCols;

  const pickList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...exercises]
      .filter((e) => (filter === 'All' ? true : e.muscleGroup === filter))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter]);

  const toggleFeatured = (ex: Exercise) => {
    const cur = settings.featuredExercises;
    if (cur.includes(ex.id)) {
      updateSettings({ featuredExercises: cur.filter((id) => id !== ex.id) });
    } else if (cur.length < MAX_KEY_LIFTS) {
      updateSettings({ featuredExercises: [...cur, ex.id] });
    }
  };
  const closeEditor = () => {
    setEditorOpen(false);
    setQuery('');
    setFilter('All');
  };

  if (workouts.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageWidth style={styles.page}>
          <View style={styles.emptyHead}>
            <Text style={styles.title}>PROGRESS</Text>
          </View>
          <EmptyState icon="stats-chart-outline" title="No progress yet" message="Log a few workouts and your analytics, records and trends show up here." />
        </PageWidth>
      </SafeAreaView>
    );
  }

  // Headline tiles
  const kpiPace = data.pace !== null
    ? <KPICard style={styles.tile} label="Current pace" value={data.pace} accent={paceColor} countUp format={signedPct} caption="PER WEEK · 4 WK" />
    : <KPICard style={styles.tile} label="Current pace" value="—" caption="NOT ENOUGH DATA" />;
  const kpiWorkouts = <KPICard style={styles.tile} label="Workouts" value={data.totalWorkouts} countUp />;
  const kpiStreak = <KPICard style={styles.tile} label="Current streak" value={data.streak} countUp caption="DAYS" />;
  const kpiPr = data.latestPr
    ? <KPICard style={styles.tile} label="Latest record" value={data.latestPr.maxWeight} unit="kg" accent={colors.primary} countUp format={formatWeight} caption={data.latestPr.exerciseName.toUpperCase()} />
    : <KPICard style={styles.tile} label="Latest record" value="—" caption="NO RECORDS YET" />;

  const tilesEl = isDesktop ? (
    <View style={styles.tiles}>{kpiPace}{kpiWorkouts}{kpiStreak}{kpiPr}</View>
  ) : (
    <>
      <View style={styles.tiles}>{kpiPace}{kpiWorkouts}</View>
      <View style={styles.tiles}>{kpiStreak}{kpiPr}</View>
    </>
  );

  // Key lifts — edit from the heading
  const keyLiftsEl = (
    <View style={styles.section}>
      <SectionHeader title="Key Lifts" subtitle="Personal records on your main lifts" actionLabel="Edit" onAction={() => setEditorOpen(true)} />
      {featured.length === 0 ? (
        <View style={styles.card}>
          <EmptyState icon="barbell-outline" title="No key lifts" message="Choose the lifts you want to track here." actionLabel="Choose Lifts" onAction={() => setEditorOpen(true)} />
        </View>
      ) : (
        <View style={styles.keyLifts}>
          {featured.map((exId) => {
            const ex = exercises.find((e) => e.id === exId);
            const recd = data.prMap[exId];
            const has = !!recd && recd.maxWeight > 0;
            return (
              <Pressable
                key={exId}
                onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: exId })}
                style={({ pressed }) => [styles.keyTile, { width: colW }, pressed && styles.keyTilePressed]}
              >
                <Text style={styles.keyName} numberOfLines={1}>
                  {(ex?.name ?? 'Unknown').toUpperCase()}
                </Text>
                <View style={styles.keyValueRow}>
                  <Text style={styles.keyValue}>{has ? formatWeight(recd.maxWeight) : '—'}</Text>
                  {has ? <Text style={styles.keyUnit}>kg</Text> : null}
                </View>
                <Text style={styles.keySub} numberOfLines={1}>
                  {has ? `${recd.repsAtMaxWeight} REPS` : 'NO PR YET'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );

  // Progressive overload
  const overloadEl = (
    <View style={styles.section}>
      <SectionHeader title="Progressive Overload" />
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
          {insights.map((line, i) => (
            <View key={i} style={styles.insightRow}>
              <View style={styles.insightTick} />
              <Text style={styles.insightText}>{line}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Weekly consistency — rolling 4 weeks
  const weeklyConsistencyEl = (
    <View style={styles.section}>
      <SectionHeader title="Weekly Consistency" subtitle="Last 4 weeks · unique workout days" />
      <View style={styles.weekStack}>
        {data.weeks.map((w) => (
          <View key={w.offset} style={[styles.weekCard, w.isCurrent && styles.weekCardCurrent]}>
            <View style={styles.weekTop}>
              <Text style={styles.weekLabel}>{w.label.toUpperCase()}</Text>
              <View style={styles.weekStatusRow}>
                <Text style={[styles.weekProgress, w.met && { color: colors.primary }]}>
                  {w.uniqueDays}/{w.goal}
                </Text>
                <Text style={[styles.weekStatus, w.met ? styles.weekStatusMet : styles.weekStatusShort]}>
                  {w.met ? 'GOAL MET' : `${Math.max(0, w.goal - w.uniqueDays)} SHORT`}
                </Text>
              </View>
            </View>
            <View style={styles.weekBlocks}>
              {DAY_LETTERS.map((d, i) => (
                <View key={i} style={styles.weekDayCol}>
                  <View style={[styles.weekBlock, w.days[i] ? styles.weekBlockOn : styles.weekBlockOff]} />
                  <Text style={styles.weekDayLetter}>{d}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // Muscle frequency
  const muscleFrequencyEl = (
    <View style={styles.section}>
      <SectionHeader title="Muscle Frequency" subtitle="Sessions per group · last 4 weeks" />
      <View style={styles.card}>
        {data.muscleFreq.map((row) => {
          const isTop = row.value === maxFreq && row.value > 0;
          const isFocus = row.group === focusGroup;
          return (
            <View key={row.group} style={[styles.muscleRow, isFocus && styles.muscleRowFocus]}>
              <Text style={[styles.muscleName, isFocus && styles.muscleNameFocus]} numberOfLines={1}>
                {row.group.toUpperCase()}
                {isFocus ? '  ★' : ''}
              </Text>
              <ProgressBar progress={row.value / maxFreq} color={isFocus || isTop ? colors.primary : withAlpha(colors.text, 0.5)} height={6} style={styles.muscleBar} />
              <Text style={[styles.muscleValue, isFocus && { color: colors.primary }]}>{row.value}×</Text>
            </View>
          );
        })}
      </View>
      {focusGroup ? <Text style={styles.muscleFocusNote}>★ Your focus muscle group.</Text> : null}
    </View>
  );

  // Inline weigh-in logger — shared by the empty state and the populated card.
  const weightLogger = (
    <View style={styles.bwLogRow}>
      <TextInput
        value={weightInput}
        onChangeText={setWeightInput}
        placeholder={bwCurrent !== null ? formatWeight(bwCurrent) : `Weight in ${unit.toLowerCase()}`}
        placeholderTextColor={colors.textFaint}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={onLogWeight}
        style={styles.bwInput}
      />
      <Pressable
        onPress={onLogWeight}
        disabled={!weightInput.trim()}
        style={({ pressed }) => [
          styles.bwLogBtn,
          !weightInput.trim() && styles.bwLogBtnDisabled,
          pressed && styles.bwLogBtnPressed,
        ]}
      >
        <Ionicons name="add" size={18} color={colors.bg} />
        <Text style={styles.bwLogBtnText}>LOG</Text>
      </Pressable>
    </View>
  );

  // Bodyweight trend
  const bodyweightEl = (
    <View style={styles.section}>
      <SectionHeader title="Bodyweight" subtitle="Log your weight and track the trend" />
      <View style={styles.card}>
        {bodyWeights.length === 0 ? (
          <>
            <EmptyState
              icon="body-outline"
              title="No weigh-ins yet"
              message="Log your current weight below and your trend line builds from here."
            />
            {weightLogger}
          </>
        ) : (
          <>
            <View style={styles.bwStatsRow}>
              <View>
                <Text style={styles.bwValue}>
                  {formatWeight(bwCurrent ?? 0)}<Text style={styles.bwUnit}> {unit}</Text>
                </Text>
                <Text style={styles.bwStatLabel}>CURRENT</Text>
              </View>
              {bwDelta !== null && Math.abs(bwDelta) >= 0.1 ? (
                <View>
                  <Text style={styles.bwValue}>
                    {bwDelta > 0 ? '+' : '−'}{formatWeight(Math.abs(bwDelta))}<Text style={styles.bwUnit}> {unit}</Text>
                  </Text>
                  <Text style={styles.bwStatLabel}>SINCE FIRST</Text>
                </View>
              ) : null}
              {targetWeight ? (
                <View>
                  <Text style={[styles.bwValue, { color: colors.primary }]}>{formatWeight(targetWeight)}<Text style={styles.bwUnit}> {unit}</Text></Text>
                  <Text style={styles.bwStatLabel}>TARGET</Text>
                </View>
              ) : null}
            </View>
            {bwSeries.length >= 2 ? (
              <LineChart
                values={bwValues}
                labels={bwLabels}
                height={150}
                formatValue={(v) => `${formatWeight(v)}`}
                style={styles.bwChartWrap}
              />
            ) : (
              <Text style={styles.muscleFocusNote}>Log again on another day to see your trend line.</Text>
            )}
            {weightLogger}
          </>
        )}
      </View>
    </View>
  );

  // Personal records — rendered inline so the whole page scrolls as one, rather
  // than a nested scroll view that only takes over once the page bottoms out.
  const personalRecordsEl = (
    <View style={styles.section}>
      <SectionHeader title="Personal Records" subtitle="Your heaviest lifts" />
      <View style={styles.prList}>
        {data.prs.map((rec) => (
          <Pressable key={rec.exerciseId} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: rec.exerciseId })}>
            <PersonalBestBadge
              title={rec.exerciseName}
              value={`${formatWeight(rec.maxWeight)} kg`}
              caption={`${rec.repsAtMaxWeight} reps · e1RM ${formatWeight(rec.estimatedOneRepMax)} kg`}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={[styles.head, isDesktop && styles.headDesktop]}>
        <Text style={styles.title}>PROGRESS</Text>
        <Text style={styles.subtitle}>THE PERFORMANCE REPORT</Text>
      </PageWidth>
      <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <PageWidth style={[styles.page, isDesktop && styles.pageDesktop]}>
          {tilesEl}
          {isDesktop ? (
            <View style={styles.desktopGrid}>
              <View style={styles.mainCol}>
                {keyLiftsEl}
                {overloadEl}
                {weeklyConsistencyEl}
              </View>
              <View style={styles.sideCol}>
                {muscleFrequencyEl}
                {bodyweightEl}
                {personalRecordsEl}
              </View>
            </View>
          ) : (
            <View style={styles.stack}>
              {keyLiftsEl}
              {overloadEl}
              {weeklyConsistencyEl}
              {muscleFrequencyEl}
              {bodyweightEl}
              {personalRecordsEl}
            </View>
          )}
        </PageWidth>
      </ScrollView>

      {/* Key Lifts editor — multi-select */}
      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={closeEditor}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>KEY LIFTS</Text>
                <Text style={styles.modalHint}>{featured.length}/{MAX_KEY_LIFTS} selected · choose up to {MAX_KEY_LIFTS}</Text>
              </View>
              <Pressable onPress={closeEditor} hitSlop={8} style={styles.modalClose}>
                <Ionicons name="checkmark" size={20} color={colors.bg} />
              </Pressable>
            </View>
            <SearchInput value={query} onChangeText={setQuery} style={styles.modalSearch} />
            <MuscleFilterTabs value={filter} onChange={setFilter} />
            <FlatList
              data={pickList}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalList}
              ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
              renderItem={({ item }) => {
                const sel = settings.featuredExercises.includes(item.id);
                return (
                  <ExerciseCard
                    exercise={item}
                    trailingIcon={sel ? 'checkmark-circle' : 'ellipse-outline'}
                    trailingAccent={sel ? colors.primary : colors.textFaint}
                    onPress={() => toggleFeatured(item)}
                  />
                );
              }}
            />
          </SafeAreaView>
        </View>
      </Modal>
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
  scrollContent: { width: '100%', alignItems: 'center', paddingBottom: spacing.xxl },
  page: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  pageDesktop: { paddingHorizontal: spacing.xxl },
  stack: { gap: spacing.lg },
  desktopGrid: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'flex-start' },
  mainCol: { flex: 1, gap: spacing.lg, minWidth: 0 },
  sideCol: { width: SIDE_COL_WIDTH, gap: spacing.lg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headDesktop: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg, paddingBottom: spacing.lg },
  emptyHead: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, marginTop: 2 },
  tiles: { flexDirection: 'row', gap: spacing.md },
  tile: { flex: 1 },
  section: {},
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg },

  // Key lifts
  keyLifts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  keyTile: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  keyTilePressed: { borderColor: colors.borderStrong, transform: [{ scale: 1.01 }] },
  keyName: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6 },
  keyValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  keyValue: { color: colors.text, fontFamily: family.display, fontSize: 32, lineHeight: 37, includeFontPadding: false },
  keyUnit: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, marginLeft: 3, marginBottom: 6 },
  keySub: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6 },

  // Progressive overload
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

  // Weekly consistency (rolling 4 weeks)
  weekStack: { gap: spacing.sm },
  weekCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  weekCardCurrent: { borderColor: colors.borderStrong },
  weekTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  weekLabel: { color: colors.text, fontFamily: family.semibold, fontSize: font.label, letterSpacing: 0.8 },
  weekStatusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weekProgress: { color: colors.text, fontFamily: family.display, fontSize: font.h3, lineHeight: Math.ceil(font.h3 * 1.15), includeFontPadding: false },
  weekStatus: { fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 0.8 },
  weekStatusMet: { color: colors.primary },
  weekStatusShort: { color: colors.textFaint },
  weekBlocks: { flexDirection: 'row', gap: 6 },
  weekDayCol: { flex: 1, alignItems: 'center', gap: 4 },
  weekBlock: { width: '100%', height: 22, borderRadius: radius.xs },
  weekBlockOn: { backgroundColor: colors.primary },
  weekBlockOff: { backgroundColor: withAlpha(colors.text, 0.07), borderWidth: 1, borderColor: colors.border },
  weekDayLetter: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny },

  // Muscle frequency
  muscleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  muscleRowFocus: { backgroundColor: colors.primaryDim, borderRadius: radius.sm, marginHorizontal: -spacing.sm, paddingHorizontal: spacing.sm },
  muscleName: { color: colors.text, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, width: 92 },
  muscleNameFocus: { color: colors.primary, fontFamily: family.semibold },
  muscleBar: { flex: 1, marginHorizontal: spacing.md },
  muscleValue: { color: colors.textDim, fontFamily: family.display, fontSize: font.lg, width: 36, textAlign: 'right', includeFontPadding: false },
  muscleFocusNote: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, marginTop: spacing.sm },

  // Bodyweight
  bwStatsRow: { flexDirection: 'row', gap: spacing.xl, marginBottom: spacing.lg },
  bwValue: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), includeFontPadding: false },
  bwUnit: { color: colors.textDim, fontFamily: family.medium, fontSize: font.label },
  bwStatLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, marginTop: 2 },
  bwChartWrap: { marginTop: spacing.xs },
  bwLogRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  bwInput: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 46,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.body,
  },
  bwLogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  bwLogBtnDisabled: { opacity: 0.4 },
  bwLogBtnPressed: { opacity: 0.85 },
  bwLogBtnText: { color: colors.bg, fontFamily: family.bold, fontSize: font.label, letterSpacing: 0.8 },

  // Personal records
  prList: { gap: spacing.sm },

  // Modals
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  modalSheet: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    height: '82%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  modalHandleWrap: { alignItems: 'center', paddingVertical: spacing.md },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  modalTitle: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 1, includeFontPadding: false },
  modalHint: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6, marginTop: 2 },
  modalClose: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  modalSearch: { marginHorizontal: spacing.lg },
  modalList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
});
