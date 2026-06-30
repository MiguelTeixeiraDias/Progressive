import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseCard, MuscleFilter, MuscleFilterTabs, PageWidth, PrimaryButton, SearchInput } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { Exercise, TemplateExercise } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';

export default function TemplateEditorScreen({ route, navigation }: RootStackScreenProps<'TemplateEditor'>) {
  const exercises = useStore((s) => s.exercises);
  const templates = useStore((s) => s.templates);
  const addTemplate = useStore((s) => s.addTemplate);
  const updateTemplate = useStore((s) => s.updateTemplate);
  const deleteTemplate = useStore((s) => s.deleteTemplate);

  const editingId = route.params?.templateId;
  const editing = editingId ? templates.find((t) => t.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [selected, setSelected] = useState<TemplateExercise[]>(editing?.exercises ?? []);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<MuscleFilter>('All');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isSelected = (id: string) => selected.some((p) => p.exerciseId === id);

  const toggle = (ex: Exercise) => {
    setSelected((prev) =>
      prev.some((p) => p.exerciseId === ex.id)
        ? prev.filter((p) => p.exerciseId !== ex.id)
        : [
            ...prev,
            { exerciseId: ex.id, exerciseName: ex.name, muscleGroup: ex.muscleGroup },
          ],
    );
  };

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...exercises]
      .filter((e) => (filter === 'All' ? true : e.muscleGroup === filter))
      .filter((e) => (q ? e.name.toLowerCase().includes(q) : true))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [exercises, query, filter]);

  const canSave = name.trim().length > 0 && selected.length > 0;

  const onSave = () => {
    if (!canSave) return;
    if (editing) updateTemplate(editing.id, { name, exercises: selected });
    else addTemplate(name, selected);
    navigation.goBack();
  };

  const onConfirmDelete = () => {
    if (!editing) return;
    setConfirmDelete(false);
    deleteTemplate(editing.id);
    navigation.goBack();
  };

  const header = (
    <View>
      <Text style={styles.label}>TEMPLATE NAME</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Push Day, Arms 1, Full Body"
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        maxLength={28}
        returnKeyType="done"
      />

      <View style={styles.selectedHead}>
        <Text style={styles.label}>IN THIS TEMPLATE</Text>
        <Text style={styles.count}>{selected.length} EXERCISES</Text>
      </View>
      {selected.length === 0 ? (
        <Text style={styles.selectedEmpty}>Tap exercises below to build your plan.</Text>
      ) : (
        <View style={styles.selectedList}>
          {selected.map((te, i) => (
            <View key={te.exerciseId} style={styles.selectedRow}>
              <Text style={styles.selectedIndex}>{i + 1}</Text>
              <Text style={styles.selectedName} numberOfLines={1}>
                {te.exerciseName}
              </Text>
              <Text style={styles.selectedGroup}>{te.muscleGroup.toUpperCase()}</Text>
              <Pressable
                onPress={() => setSelected((p) => p.filter((x) => x.exerciseId !== te.exerciseId))}
                hitSlop={8}
                style={styles.selectedRemove}
              >
                <Ionicons name="close" size={16} color={colors.textDim} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.label, { marginTop: spacing.xl }]}>EXERCISE LIBRARY</Text>
      <SearchInput value={query} onChangeText={setQuery} />
      <MuscleFilterTabs value={filter} onChange={setFilter} style={styles.tabs} />
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{editing ? 'EDIT TEMPLATE' : 'NEW TEMPLATE'}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={header}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => {
          const sel = isSelected(item.id);
          return (
            <ExerciseCard
              exercise={item}
              trailingIcon={sel ? 'checkmark-circle' : 'add-circle-outline'}
              trailingAccent={sel ? colors.primary : colors.textFaint}
              onPress={() => toggle(item)}
            />
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No exercises match “{query}”.</Text>}
      />

      <View style={styles.footer}>
        {editing ? (
          <PrimaryButton title="Delete" icon="trash-outline" variant="danger" size="lg" onPress={() => setConfirmDelete(true)} />
        ) : null}
        <PrimaryButton
          title={editing ? 'Save Changes' : 'Save Template'}
          icon="checkmark"
          onPress={onSave}
          disabled={!canSave}
          style={styles.saveBtn}
        />
      </View>

      {/* Confirm before deleting — a custom modal, since RN's Alert is a no-op on web. */}
      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>DELETE TEMPLATE</Text>
            <Text style={styles.confirmName}>{(editing?.name ?? '').toUpperCase()}</Text>
            <Text style={styles.confirmCopy}>This template will be removed. This can't be undone.</Text>
            <View style={styles.confirmActions}>
              <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={() => setConfirmDelete(false)} style={styles.flex} />
              <PrimaryButton title="Delete" variant="danger" size="md" onPress={onConfirmDelete} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </PageWidth>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth },
  flex: { flex: 1 },
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
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  label: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 52,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.lg,
  },
  selectedHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.xl },
  count: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
  selectedEmpty: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, marginBottom: spacing.sm },
  selectedList: { gap: spacing.sm },
  selectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  selectedIndex: { color: colors.primary, fontFamily: family.display, fontSize: font.lg, width: 18, includeFontPadding: false },
  selectedName: { flex: 1, color: colors.text, fontFamily: family.semibold, fontSize: font.body },
  selectedGroup: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8 },
  selectedRemove: { padding: 2 },
  // Bleed the tabs out to the screen edges so they align with the other screens
  // (the FlatList already applies horizontal padding to the header).
  tabs: { marginHorizontal: -spacing.lg },
  empty: { color: colors.textDim, textAlign: 'center', marginTop: spacing.xl, fontFamily: family.body, fontSize: font.body },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  saveBtn: { flex: 1 },

  // Confirm-delete dialog
  confirmBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  confirmDialog: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
  },
  confirmKicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2 },
  confirmName: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, includeFontPadding: false, marginTop: 4 },
  confirmCopy: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, lineHeight: 21, marginTop: spacing.lg },
  confirmActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
