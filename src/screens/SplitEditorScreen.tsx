import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageWidth, PrimaryButton } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { CustomSplit, MUSCLE_GROUPS, MuscleGroup, SplitDayDef } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { uid } from '../utils/id';

export default function SplitEditorScreen({ route, navigation }: RootStackScreenProps<'SplitEditor'>) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const editingId = route.params?.splitId;
  const editing = editingId ? settings.customSplits.find((s) => s.id === editingId) : undefined;

  const [name, setName] = useState(editing?.name ?? '');
  const [days, setDays] = useState<SplitDayDef[]>(
    editing?.days ?? [{ name: 'Day 1', muscleGroups: [] }],
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setDay = (i: number, patch: Partial<SplitDayDef>) =>
    setDays((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));
  const toggleGroup = (i: number, g: MuscleGroup) =>
    setDay(i, {
      muscleGroups: days[i].muscleGroups.includes(g)
        ? days[i].muscleGroups.filter((x) => x !== g)
        : [...days[i].muscleGroups, g],
    });
  const addDay = () => setDays((prev) => [...prev, { name: `Day ${prev.length + 1}`, muscleGroups: [] }]);
  const removeDay = (i: number) => setDays((prev) => prev.filter((_, idx) => idx !== i));

  const canSave =
    name.trim().length > 0 && days.length > 0 && days.every((d) => d.muscleGroups.length > 0);

  const onSave = () => {
    if (!canSave) return;
    const cleanDays = days.map((d, i) => ({
      name: d.name.trim() || `Day ${i + 1}`,
      muscleGroups: d.muscleGroups,
    }));
    const splits = settings.customSplits;
    let next: CustomSplit[];
    let savedId: string;
    if (editing) {
      savedId = editing.id;
      next = splits.map((s) => (s.id === editing.id ? { ...s, name: name.trim(), days: cleanDays } : s));
    } else {
      savedId = uid('split');
      next = [...splits, { id: savedId, name: name.trim(), days: cleanDays }];
    }
    updateSettings({
      customSplits: next,
      // Make the first split (or a freshly created one with none active) the active one.
      activeSplitId: settings.activeSplitId ?? savedId,
    });
    navigation.goBack();
  };

  const onConfirmDelete = () => {
    if (!editing) return;
    setConfirmDelete(false);
    updateSettings({
      customSplits: settings.customSplits.filter((s) => s.id !== editing.id),
      activeSplitId: settings.activeSplitId === editing.id ? undefined : settings.activeSplitId,
    });
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{editing ? 'EDIT SPLIT' : 'NEW SPLIT'}</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>SPLIT NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. My PPL, Arnold Split"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={28}
        />

        {days.map((day, i) => (
          <View key={i} style={styles.dayCard}>
            <View style={styles.dayHead}>
              <Text style={styles.dayIndex}>DAY {i + 1}</Text>
              {days.length > 1 ? (
                <Pressable onPress={() => removeDay(i)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                </Pressable>
              ) : null}
            </View>
            <TextInput
              value={day.name}
              onChangeText={(v) => setDay(i, { name: v })}
              placeholder="Day name — Push, Legs…"
              placeholderTextColor={colors.textFaint}
              style={styles.dayNameInput}
              maxLength={20}
            />
            <View style={styles.chips}>
              {MUSCLE_GROUPS.map((g) => {
                const sel = day.muscleGroups.includes(g);
                return (
                  <Pressable
                    key={g}
                    onPress={() => toggleGroup(i, g)}
                    style={[styles.chip, { backgroundColor: sel ? colors.primaryDim : colors.card2, borderColor: sel ? colors.primary : colors.border }]}
                  >
                    <Text style={[styles.chipText, { color: sel ? colors.primary : colors.textDim }]}>{g}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <PrimaryButton title="Add Day" icon="add" variant="secondary" size="md" fullWidth onPress={addDay} style={{ marginTop: spacing.md }} />
      </ScrollView>

      <View style={styles.footer}>
        {editing ? (
          <PrimaryButton title="Delete" icon="trash-outline" variant="danger" size="lg" onPress={() => setConfirmDelete(true)} />
        ) : null}
        <PrimaryButton title={editing ? 'Save Changes' : 'Save Split'} icon="checkmark" onPress={onSave} disabled={!canSave} style={styles.saveBtn} />
      </View>

      <Modal visible={confirmDelete} transparent animationType="fade" onRequestClose={() => setConfirmDelete(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDelete(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>DELETE SPLIT</Text>
            <Text style={styles.confirmName}>{(editing?.name ?? '').toUpperCase()}</Text>
            <Text style={styles.confirmCopy}>This custom split will be removed.</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headerTitle: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 1, includeFontPadding: false },
  closeBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  label: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4 },
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
  dayCard: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md, marginTop: spacing.sm },
  dayHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dayIndex: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4 },
  dayNameInput: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 44,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.body,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1 },
  chipText: { fontFamily: family.semibold, fontSize: font.label, letterSpacing: 0.4 },
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
  confirmBackdrop: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  confirmDialog: { width: '100%', maxWidth: layout.formMaxWidth, backgroundColor: colors.bgElevated, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.xl },
  confirmKicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2 },
  confirmName: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, includeFontPadding: false, marginTop: 4 },
  confirmCopy: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, lineHeight: 21, marginTop: spacing.lg },
  confirmActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },
});
