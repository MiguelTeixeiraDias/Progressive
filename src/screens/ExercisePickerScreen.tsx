import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCard, MuscleFilter, MuscleFilterTabs, PageWidth, PrimaryButton, SearchInput } from '../components';
import { useResponsive } from '../hooks/useResponsive';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { relativeDay } from '../utils/date';
import { formatClock } from '../utils/format';
import { lastPerformance } from '../utils/stats';

export default function ExercisePickerScreen({ navigation }: RootStackScreenProps<'ExercisePicker'>) {
  const exercises = useStore((s) => s.exercises);
  const workouts = useStore((s) => s.workouts);
  const addExerciseToWorkout = useStore((s) => s.addExerciseToWorkout);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('All');
  const { isTablet, isDesktop } = useResponsive();
  const numColumns = isDesktop ? 3 : isTablet ? 2 : 1;

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...exercises]
      .filter((e) => (filter === 'All' ? true : e.muscleGroup === filter))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter]);

  const subtitleFor = (ex: Exercise) => {
    const prev = lastPerformance(workouts, ex.id);
    if (!prev || prev.sets.length === 0) return null;
    if (ex.muscleGroup === 'Cardio') {
      const top = prev.sets.reduce((a, b) => ((b.durationSec ?? 0) > (a.durationSec ?? 0) ? b : a));
      return `${formatClock(top.durationSec ?? 0)} · ${relativeDay(prev.date)}`;
    }
    const top = prev.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
    return `${top.weight}kg × ${top.reps} · ${relativeDay(prev.date)}`;
  };

  const onPick = (ex: Exercise) => {
    addExerciseToWorkout(ex.id);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={[styles.page, isDesktop && styles.pageDesktop]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>ADD EXERCISE</Text>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textDim} />
          </Pressable>
        </View>

        <SearchInput value={query} onChangeText={setQuery} style={styles.search} />

        <MuscleFilterTabs value={filter} onChange={setFilter} />

        <Pressable
          onPress={() => navigation.navigate('AddExercise')}
          style={({ pressed }) => [styles.createRow, pressed && styles.createRowPressed]}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.createRowText}>Create Custom Exercise</Text>
        </Pressable>

        <FlatList
          key={numColumns}
          data={data}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          renderItem={({ item }) => (
            <ExerciseCard
              exercise={item}
              subtitle={subtitleFor(item)}
              trailingIcon="add"
              trailingAccent={colors.primary}
              onPress={() => onPick(item)}
              style={numColumns > 1 ? styles.gridCard : undefined}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No exercises match “{query}”.</Text>}
        />
      </PageWidth>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth },
  pageDesktop: { maxWidth: layout.maxContentWidth },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  headerTitle: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 1, includeFontPadding: false },
  closeBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },
  search: { marginHorizontal: spacing.lg },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
  },
  createRowPressed: { opacity: 0.7 },
  createRowText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.label, letterSpacing: 0.4 },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.xxl },
  columnWrapper: { gap: spacing.sm },
  gridCard: { flex: 1 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontFamily: family.body, fontSize: font.body },
});
