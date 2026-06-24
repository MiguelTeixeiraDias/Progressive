import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCard, MuscleFilter, MuscleFilterTabs, PrimaryButton, SearchInput } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { relativeDay } from '../utils/date';
import { lastPerformance } from '../utils/stats';

export default function ExercisePickerScreen({ navigation }: RootStackScreenProps<'ExercisePicker'>) {
  const exercises = useStore((s) => s.exercises);
  const workouts = useStore((s) => s.workouts);
  const addExerciseToWorkout = useStore((s) => s.addExerciseToWorkout);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('All');

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
    const top = prev.sets.reduce((a, b) => (b.weight > a.weight ? b : a));
    return `${top.weight}kg × ${top.reps} · ${relativeDay(prev.date)}`;
  };

  const onPick = (ex: Exercise) => {
    addExerciseToWorkout(ex.id);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>ADD EXERCISE</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      <SearchInput value={query} onChangeText={setQuery} style={styles.search} />

      <MuscleFilterTabs value={filter} onChange={setFilter} />

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
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
          />
        )}
        ListFooterComponent={
          <PrimaryButton
            title="Create Custom Exercise"
            icon="add"
            variant="ghost"
            size="md"
            fullWidth
            onPress={() => navigation.navigate('AddExercise')}
            style={{ marginTop: spacing.lg }}
          />
        }
        ListEmptyComponent={<Text style={styles.empty}>No exercises match “{query}”.</Text>}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontFamily: family.body, fontSize: font.body },
});
