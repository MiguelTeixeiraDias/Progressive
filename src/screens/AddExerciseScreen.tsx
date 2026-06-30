import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PageWidth, PrimaryButton } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { MUSCLE_GROUPS, MuscleGroup } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';

export default function AddExerciseScreen({ navigation }: RootStackScreenProps<'AddExercise'>) {
  const addExercise = useStore((s) => s.addExercise);
  const [name, setName] = useState('');
  const [group, setGroup] = useState<MuscleGroup>('Chest');

  const canSave = name.trim().length > 0;

  const onSave = () => {
    if (!canSave) return;
    addExercise(name, group);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>NEW EXERCISE</Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>EXERCISE NAME</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="e.g. Incline Dumbbell Press"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={onSave}
        />

        <Text style={[styles.label, { marginTop: spacing.xl }]}>MUSCLE GROUP</Text>
        <View style={styles.groups}>
          {MUSCLE_GROUPS.map((g) => {
            const selected = group === g;
            return (
              <Pressable
                key={g}
                onPress={() => setGroup(g)}
                style={[
                  styles.group,
                  {
                    backgroundColor: selected ? colors.primaryDim : colors.card,
                    borderColor: selected ? colors.primary : colors.border,
                  },
                ]}
              >
                <Text style={[styles.groupText, { color: selected ? colors.primary : colors.textDim }]}>
                  {g.toUpperCase()}
                </Text>
                {selected ? <Ionicons name="checkmark" size={15} color={colors.primary} /> : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Save Exercise" icon="checkmark" onPress={onSave} fullWidth disabled={!canSave} />
      </View>
      </PageWidth>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth },
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
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
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
  groups: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
  },
  groupText: { fontFamily: family.semibold, fontSize: font.label, letterSpacing: 0.8 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
