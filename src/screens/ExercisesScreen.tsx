import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCard, MuscleFilter, MuscleFilterTabs, SearchInput } from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { relativeDay } from '../utils/date';
import { lastPerformance } from '../utils/stats';

export default function ExercisesScreen({ navigation }: TabScreenProps<'Exercises'>) {
  const exercises = useStore((s) => s.exercises);
  const workouts = useStore((s) => s.workouts);

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

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.head}>
        <Text style={styles.title}>EXERCISES</Text>
        <Text style={styles.subtitle}>TAP TO VIEW PROGRESS</Text>
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
            onPress={() => navigation.navigate('ExerciseDetail', { exerciseId: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No exercises match “{query}”.</Text>}
      />

      <Pressable
        onPress={() => navigation.navigate('AddExercise')}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ translateY: 1.5 }], opacity: 0.92 }]}
      >
        <Ionicons name="add" size={26} color={colors.bg} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, marginTop: 2 },
  search: { marginHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontFamily: family.body, fontSize: font.body },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
