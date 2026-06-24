import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  EmptyState,
  ExerciseCard,
  KPICard,
  MuscleFilter,
  MuscleFilterTabs,
  PersonalBestBadge,
  ProgressBar,
  SearchInput,
  SectionHeader,
  StatChart,
} from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import { formatWeight, signedPct } from '../utils/format';
import {
  computePRs,
  currentStreak,
  latestPersonalRecord,
  monthlyConsistency,
  muscleFrequency,
  overloadInsights,
  overloadLabel,
  overloadScore,
  personalRecordList,
  weeklyOverloadPace,
} from '../utils/stats';

const MONTHS_BACK = [-5, -4, -3, -2, -1, 0];

export default function ProgressScreen({ navigation }: TabScreenProps<'Progress'>) {
  const workouts = useStore((s) => s.workouts);
  const settings = useStore((s) => s.settings);
  const exercises = useStore((s) => s.exercises);
  const updateSettings = useStore((s) => s.updateSettings);

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
    };
  }, [workouts, settings.weeklyGoal]);

  const scoreColor = data.score >= 60 ? colors.primary : colors.text;
  const paceColor = data.pace === null ? colors.text : data.pace >= 0 ? colors.primary : colors.text;
  const maxFreq = Math.max(1, ...data.muscleFreq.map((m) => m.value));

  // Editable "key lifts" PR tiles.
  const featured = settings.featuredExercises.slice(0, 3);
  const [editingSlot, setEditingSlot] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('All');

  const pickList = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...exercises]
      .filter((e) => (filter === 'All' ? true : e.muscleGroup === filter))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter]);

  const chooseExercise = (ex: Exercise) => {
    if (editingSlot === null) return;
    const next = [...settings.featuredExercises];
    next[editingSlot] = ex.id;
    updateSettings({ featuredExercises: next });
    setEditingSlot(null);
    setQuery('');
    setFilter('All');
  };

  // Month pager — auto-scroll to the current month (last page) on first layout.
  const pageWidth = Dimensions.get('window').width - spacing.lg * 2;
  const monthRef = useRef<ScrollView>(null);
  const didInit = useRef(false);

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

        {/* Headline tiles */}
        <View style={styles.tiles}>
          {data.pace !== null ? (
            <KPICard style={styles.tile} label="Current pace" value={data.pace} accent={paceColor} countUp format={signedPct} caption="PER WEEK · 4 WK" />
          ) : (
            <KPICard style={styles.tile} label="Current pace" value="—" caption="NOT ENOUGH DATA" />
          )}
          <KPICard style={styles.tile} label="Workouts" value={data.totalWorkouts} countUp />
        </View>
        <View style={styles.tiles}>
          <KPICard style={styles.tile} label="Current streak" value={data.streak} countUp caption="DAYS" />
          {data.latestPr ? (
            <KPICard
              style={styles.tile}
              label="Latest record"
              value={data.latestPr.maxWeight}
              unit="kg"
              accent={colors.primary}
              countUp
              format={formatWeight}
              caption={data.latestPr.exerciseName.toUpperCase()}
            />
          ) : (
            <KPICard style={styles.tile} label="Latest record" value="—" caption="NO RECORDS YET" />
          )}
        </View>

        {/* Key lifts — editable PR tiles */}
        <View style={styles.section}>
          <SectionHeader title="Key Lifts" subtitle="Tap a lift to swap · personal records" />
          <View style={styles.keyLifts}>
            {featured.map((exId, i) => {
              const ex = exercises.find((e) => e.id === exId);
              const pr = data.prMap[exId];
              const has = !!pr && pr.maxWeight > 0;
              return (
                <Pressable
                  key={`${exId}-${i}`}
                  onPress={() => setEditingSlot(i)}
                  style={({ pressed }) => [styles.keyTile, pressed && styles.keyTilePressed]}
                >
                  <View style={styles.keyTop}>
                    <Text style={styles.keyName} numberOfLines={1}>
                      {(ex?.name ?? 'Pick lift').toUpperCase()}
                    </Text>
                    <Ionicons name="pencil" size={11} color={colors.textFaint} />
                  </View>
                  <View style={styles.keyValueRow}>
                    <Text style={styles.keyValue}>{has ? formatWeight(pr.maxWeight) : '—'}</Text>
                    {has ? <Text style={styles.keyUnit}>kg</Text> : null}
                  </View>
                  <Text style={styles.keySub} numberOfLines={1}>
                    {has ? `${pr.repsAtMaxWeight} REPS` : 'NO PR YET'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Progressive overload */}
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
              {data.insights.map((line, i) => (
                <View key={i} style={styles.insightRow}>
                  <View style={styles.insightTick} />
                  <Text style={styles.insightText}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Weekly consistency — one month per page, swipe to snap between months */}
        <View style={styles.section}>
          <SectionHeader title="Weekly Consistency" subtitle="Workouts per week · swipe months" />
          <ScrollView
            ref={monthRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onContentSizeChange={() => {
              if (!didInit.current) {
                didInit.current = true;
                monthRef.current?.scrollToEnd({ animated: false });
              }
            }}
          >
            {MONTHS_BACK.map((off) => {
              const mc = monthlyConsistency(workouts, off);
              return (
                <View key={off} style={{ width: pageWidth }}>
                  <View style={styles.card}>
                    <Text style={styles.monthLabel}>{mc.label.toUpperCase()}</Text>
                    {mc.weeks.length > 0 ? (
                      <StatChart data={mc.weeks} color={colors.primary} height={120} showValues />
                    ) : (
                      <Text style={styles.muted}>No weeks recorded.</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
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

        {/* Personal records — scroll within the card (≈6 visible) */}
        <View style={styles.section}>
          <SectionHeader title="Personal Records" subtitle="Your heaviest lifts" />
          <ScrollView
            style={styles.prScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator
            contentContainerStyle={styles.prScrollContent}
          >
            {data.prs.map((pr) => (
              <Pressable key={pr.exerciseId} onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: pr.exerciseId })}>
                <PersonalBestBadge
                  title={pr.exerciseName}
                  value={`${formatWeight(pr.maxWeight)} kg`}
                  caption={`${pr.repsAtMaxWeight} reps · e1RM ${formatWeight(pr.estimatedOneRepMax)} kg`}
                />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      {/* Edit modal for the key-lift PR tiles */}
      <Modal visible={editingSlot !== null} animationType="slide" transparent onRequestClose={() => setEditingSlot(null)}>
        <View style={styles.modalBackdrop}>
          <SafeAreaView style={styles.modalSheet} edges={['bottom']}>
            <View style={styles.modalHandleWrap}>
              <View style={styles.modalHandle} />
            </View>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CHOOSE LIFT</Text>
              <Pressable onPress={() => setEditingSlot(null)} hitSlop={8} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.textDim} />
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
                const sel = editingSlot !== null && settings.featuredExercises[editingSlot] === item.id;
                return (
                  <ExerciseCard
                    exercise={item}
                    trailingIcon={sel ? 'checkmark-circle' : 'add-circle-outline'}
                    trailingAccent={sel ? colors.primary : colors.textFaint}
                    onPress={() => chooseExercise(item)}
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

  // Key lifts
  keyLifts: { flexDirection: 'row', gap: spacing.md },
  keyTile: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  keyTilePressed: { borderColor: colors.borderStrong, transform: [{ scale: 1.01 }] },
  keyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  keyName: { flex: 1, color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6 },
  keyValueRow: { flexDirection: 'row', alignItems: 'flex-end' },
  keyValue: { color: colors.text, fontFamily: family.display, fontSize: 34, lineHeight: 39, includeFontPadding: false },
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

  // Month pager
  monthLabel: { color: colors.text, fontFamily: family.semibold, fontSize: font.label, letterSpacing: 1.4, marginBottom: spacing.md },
  muted: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, textAlign: 'center', paddingVertical: spacing.lg },

  // Muscle frequency
  muscleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  muscleName: { color: colors.text, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, width: 80 },
  muscleBar: { flex: 1, marginHorizontal: spacing.md },
  muscleValue: { color: colors.textDim, fontFamily: family.display, fontSize: font.lg, width: 36, textAlign: 'right', includeFontPadding: false },

  // Personal records
  prScroll: { maxHeight: 392 },
  prScrollContent: { gap: spacing.sm, paddingBottom: 2 },

  // Edit modal
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  modalSheet: {
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
  modalClose: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },
  modalSearch: { marginHorizontal: spacing.lg },
  modalList: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
});
