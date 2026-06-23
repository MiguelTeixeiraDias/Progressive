import React, { useMemo } from 'react';
import { SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, WorkoutSummaryCard } from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { WorkoutSession } from '../types';
import { colors, family, font, spacing } from '../theme';
import { dayKey, relativeDay } from '../utils/date';
import { formatVolume } from '../utils/format';
import { totalVolume, workoutsThisWeek } from '../utils/stats';

export default function HistoryScreen({ navigation }: TabScreenProps<'History'>) {
  const workouts = useStore((s) => s.workouts);
  const startWorkoutFrom = useStore((s) => s.startWorkoutFrom);

  const sections = useMemo(() => {
    const groups: Record<string, WorkoutSession[]> = {};
    const order: string[] = [];
    for (const w of workouts) {
      const k = dayKey(w.startedAt);
      if (!groups[k]) {
        groups[k] = [];
        order.push(k);
      }
      groups[k].push(w);
    }
    return order.map((k) => ({ title: relativeDay(groups[k][0].startedAt), data: groups[k] }));
  }, [workouts]);

  const repeat = (id: string) => {
    if (startWorkoutFrom(id)) navigation.navigate('Workout');
  };

  const headerStats = [
    { label: 'WORKOUTS', value: `${workouts.length}` },
    { label: 'THIS WEEK', value: `${workoutsThisWeek(workouts)}` },
    { label: 'VOLUME · KG', value: `${formatVolume(totalVolume(workouts))}` },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>HISTORY</Text>
        <Text style={styles.subtitle}>EVERY SESSION YOU'VE LOGGED</Text>
      </View>

      {workouts.length === 0 ? (
        <EmptyState
          icon="time-outline"
          title="No history yet"
          message="Your completed workouts appear here, grouped by day."
          actionLabel="Start a Workout"
          onAction={() => navigation.navigate('Workout')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          ListHeaderComponent={
            <View style={styles.statStrip}>
              {headerStats.map((s, i) => (
                <React.Fragment key={s.label}>
                  {i > 0 ? <View style={styles.statDivider} /> : null}
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{s.value}</Text>
                    <Text style={styles.statLabel}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          }
          renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title.toUpperCase()}</Text>}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <WorkoutSummaryCard
                session={item}
                onPress={() => navigation.navigate('WorkoutDetail', { sessionId: item.id })}
                onRepeat={() => repeat(item.id)}
              />
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.display, letterSpacing: 1, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, marginTop: 2 },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  statStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { color: colors.text, fontFamily: family.display, fontSize: 32, includeFontPadding: false },
  statLabel: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.border },
  sectionHeader: { color: colors.textDim, fontFamily: family.semibold, fontSize: font.label, letterSpacing: 1.4, marginBottom: spacing.md, marginTop: spacing.sm },
  cardWrap: { marginBottom: spacing.md },
});
