import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCard, MuscleFilter, MuscleFilterTabs, PageWidth, PrimaryButton, SearchInput } from '../components';
import { useResponsive } from '../hooks/useResponsive';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { relativeDay } from '../utils/date';
import { formatClock } from '../utils/format';
import { lastPerformance } from '../utils/stats';

export default function ExercisesScreen({ navigation }: TabScreenProps<'Exercises'>) {
  const exercises = useStore((s) => s.exercises);
  const workouts = useStore((s) => s.workouts);
  const activeWorkout = useStore((s) => s.activeWorkout);
  const startWorkout = useStore((s) => s.startWorkout);
  const addExerciseToWorkout = useStore((s) => s.addExerciseToWorkout);
  const deleteExercise = useStore((s) => s.deleteExercise);

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('All');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  const isSelected = (id: string) => selected.includes(id);
  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const allSelected = data.length > 0 && selected.length === data.length;
  const toggleSelectAll = () => setSelected(allSelected ? [] : data.map((e) => e.id));

  const enterSelect = (id?: string) => {
    setSelectMode(true);
    if (id) setSelected([id]);
  };
  const exitSelect = () => {
    setSelectMode(false);
    setSelected([]);
  };

  const onCardPress = (ex: Exercise) => {
    if (selectMode) toggle(ex.id);
    else navigation.navigate('ExerciseDetail', { exerciseId: ex.id });
  };

  const createWorkoutFromSelected = () => {
    if (selected.length === 0) return;
    if (!activeWorkout) startWorkout('');
    selected.forEach((id) => addExerciseToWorkout(id));
    exitSelect();
    navigation.navigate('Workout');
  };

  const deleteSelected = () => {
    selected.forEach((id) => deleteExercise(id));
    setConfirmDelete(false);
    exitSelect();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={styles.page}>
        <View style={styles.head}>
          <View style={styles.headRow}>
            <Text style={styles.title}>EXERCISES</Text>
            <View style={styles.headBtns}>
              {selectMode ? (
                <Pressable onPress={toggleSelectAll} hitSlop={8} style={styles.headBtn}>
                  <Text style={styles.headBtnText}>{allSelected ? 'CLEAR' : 'SELECT ALL'}</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={selectMode ? exitSelect : () => enterSelect()} hitSlop={8} style={styles.headBtn}>
                <Text style={styles.headBtnText}>{selectMode ? 'CANCEL' : 'SELECT'}</Text>
              </Pressable>
            </View>
          </View>
          <Text style={styles.subtitle}>
            {selectMode ? `${selected.length} SELECTED` : 'TAP TO VIEW PROGRESS · LONG-PRESS TO SELECT'}
          </Text>
        </View>

        <SearchInput value={query} onChangeText={setQuery} style={styles.search} />

        <MuscleFilterTabs value={filter} onChange={setFilter} />

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
              subtitle={selectMode ? null : subtitleFor(item)}
              onPress={() => onCardPress(item)}
              onLongPress={() => (selectMode ? toggle(item.id) : enterSelect(item.id))}
              trailingIcon={selectMode ? (isSelected(item.id) ? 'checkmark-circle' : 'ellipse-outline') : 'chevron-forward'}
              trailingAccent={selectMode && isSelected(item.id) ? colors.primary : colors.textFaint}
              style={numColumns > 1 ? styles.gridCard : undefined}
            />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No exercises match “{query}”.</Text>}
        />

        {selectMode ? (
          <View style={styles.actionBar}>
            <PrimaryButton
              title={`Create Workout${selected.length ? ` (${selected.length})` : ''}`}
              icon="barbell"
              size="md"
              onPress={createWorkoutFromSelected}
              disabled={selected.length === 0}
              style={styles.flex}
            />
            <PrimaryButton
              title={`Delete${selected.length ? ` (${selected.length})` : ''}`}
              icon="trash-outline"
              variant="danger"
              size="md"
              onPress={() => setConfirmDelete(true)}
              disabled={selected.length === 0}
              style={styles.flex}
            />
          </View>
        ) : (
          <Pressable
            onPress={() => navigation.navigate('AddExercise')}
            style={({ pressed }) => [styles.fab, pressed && { transform: [{ translateY: 1.5 }], opacity: 0.92 }]}
          >
            <Ionicons name="add" size={26} color={colors.bg} />
          </Pressable>
        )}
      </PageWidth>

      {/* Confirm bulk delete — custom modal, since RN's Alert is a no-op on web. */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>DELETE EXERCISES</Text>
            <Text style={styles.confirmName}>{selected.length} SELECTED</Text>
            <Text style={styles.confirmCopy}>
              Removes them from your library. Past workouts that used them are kept.
            </Text>
            <View style={styles.confirmActions}>
              <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={() => setConfirmDelete(false)} style={styles.flex} />
              <PrimaryButton title="Delete" variant="danger" size="md" onPress={deleteSelected} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.maxContentWidth },
  flex: { flex: 1 },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headBtns: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false },
  headBtn: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  headBtnText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1.2 },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, marginTop: 2 },
  search: { marginHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100 },
  columnWrapper: { gap: spacing.sm },
  gridCard: { flex: 1 },
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
  actionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  confirmBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  confirmDialog: { width: '100%', maxWidth: layout.formMaxWidth, backgroundColor: colors.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  confirmKicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2 },
  confirmName: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, includeFontPadding: false, marginTop: 4 },
  confirmCopy: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, lineHeight: 21, marginTop: spacing.lg },
  confirmActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
