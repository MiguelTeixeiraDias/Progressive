import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SectionHeader } from '../components';
import PrimaryButton from '../components/PrimaryButton';
import { useAuth } from '../auth/AuthContext';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import {
  ExperienceLevel,
  FitnessGoal,
  MUSCLE_GROUPS,
  MuscleGroup,
  Settings,
  TrainingSplit,
  UnitPreference,
} from '../types';
import { colors, family, font, radius, spacing } from '../theme';

const UNITS: UnitPreference[] = ['kg', 'lb'];
const EXPERIENCE: ExperienceLevel[] = ['Beginner', 'Intermediate', 'Advanced'];
const SPLITS: TrainingSplit[] = ['Push/Pull/Legs', 'Upper/Lower', 'Full Body', 'Bro Split', 'Custom'];
const GOALS: FitnessGoal[] = ['Build muscle', 'Get stronger', 'Lose fat', 'Improve fitness', 'General health'];

/** Compact bordered choice chips — single-select, acid-lime when active. */
function Choice<T extends string>({
  value,
  options,
  onSelect,
}: {
  value?: T;
  options: readonly T[];
  onSelect: (v: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((o) => {
        const sel = value === o;
        return (
          <Pressable
            key={o}
            onPress={() => onSelect(o)}
            style={[
              styles.choice,
              { backgroundColor: sel ? colors.primaryDim : colors.card, borderColor: sel ? colors.primary : colors.border },
            ]}
          >
            <Text style={[styles.choiceText, { color: sel ? colors.primary : colors.textDim }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Single-select dropdown: a compact row showing the current value that opens a
 * bottom sheet listing the options. Far tidier than a wall of chips for the
 * longer option sets (split, goal, muscle group). `clearable` adds a "None" row
 * for optional fields.
 */
function SelectField<T extends string>({
  value,
  options,
  onSelect,
  title,
  placeholder = 'Select',
  clearable = false,
}: {
  value?: T;
  options: readonly T[];
  onSelect: (v?: T) => void;
  title: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const choose = (v?: T) => {
    onSelect(v);
    setOpen(false);
  };
  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={styles.select}>
        <Text style={[styles.selectValue, !value && styles.selectPlaceholder]} numberOfLines={1}>
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.textDim} />
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <Text style={styles.sheetTitle}>{title}</Text>
            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {clearable ? (
                <OptionRow label="None" selected={!value} onPress={() => choose(undefined)} />
              ) : null}
              {options.map((o) => (
                <OptionRow key={o} label={o} selected={value === o} onPress={() => choose(o)} />
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

function OptionRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.optionRow}>
      <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      {selected ? <Ionicons name="checkmark" size={20} color={colors.primary} /> : null}
    </Pressable>
  );
}

/**
 * Flat, editable mirror of the settings this screen exposes. Numeric inputs are
 * held as raw strings so the text fields behave naturally while typing; they're
 * parsed back to numbers only on save.
 */
interface Draft {
  name: string;
  email: string;
  experienceLevel?: ExperienceLevel;
  preferredSplit?: TrainingSplit;
  unit: UnitPreference;
  bodyWeight: string;
  height: string;
  weeklyGoal: number;
  primaryFitnessGoal?: FitnessGoal;
  targetBodyWeight: string;
  focusMuscleGroup?: MuscleGroup;
}

function toDraft(s: Settings): Draft {
  return {
    name: s.profile.name ?? s.userName ?? '',
    email: s.profile.email ?? '',
    experienceLevel: s.profile.experienceLevel,
    preferredSplit: s.profile.preferredSplit,
    unit: s.unit,
    bodyWeight: numStr(s.bodyStats.currentWeight),
    height: numStr(s.bodyStats.height),
    weeklyGoal: s.weeklyGoal,
    primaryFitnessGoal: s.goals.primaryFitnessGoal,
    targetBodyWeight: numStr(s.goals.targetBodyWeight),
    focusMuscleGroup: s.goals.focusMuscleGroup,
  };
}

export default function SettingsScreen(_: TabScreenProps<'Settings'>) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const { user, signOut } = useAuth();

  // Edits live in a local draft and only commit to the store on Save. Resync the
  // draft whenever the persisted settings change (e.g. a cloud load after sign-in
  // or right after we save); while editing, settings never change underneath us.
  const [draft, setDraft] = useState<Draft>(() => toDraft(settings));
  useEffect(() => {
    setDraft(toDraft(settings));
  }, [settings]);

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(settings));

  const onSave = () => {
    const trimmedName = draft.name.trim();
    updateSettings({
      userName: trimmedName || 'Athlete',
      unit: draft.unit,
      weeklyGoal: draft.weeklyGoal,
      profile: {
        ...settings.profile,
        name: trimmedName || undefined,
        email: draft.email.trim() || undefined,
        experienceLevel: draft.experienceLevel,
        preferredSplit: draft.preferredSplit,
      },
      bodyStats: {
        ...settings.bodyStats,
        currentWeight: parseNum(draft.bodyWeight),
        height: parseNum(draft.height),
      },
      goals: {
        ...settings.goals,
        primaryFitnessGoal: draft.primaryFitnessGoal,
        targetBodyWeight: parseNum(draft.targetBodyWeight),
        focusMuscleGroup: draft.focusMuscleGroup,
      },
    });
  };

  const onDiscard = () => setDraft(toDraft(settings));

  const unitLabel = draft.unit;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.head}>
          <Text style={styles.title}>SETTINGS</Text>
          <Text style={styles.subtitle}>TRAINING PROFILE · APP PREFERENCES</Text>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Profile — local only for now; ready to connect to real user accounts later. */}
          <View style={styles.section}>
            <SectionHeader title="Profile" subtitle="Local profile · no account needed yet" />
            <View style={styles.card}>
              <Field label="NAME">
                <TextInput
                  value={draft.name}
                  onChangeText={(v) => patch({ name: v })}
                  placeholder="Your name"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                />
              </Field>
              <Field label="EMAIL">
                <TextInput
                  value={draft.email}
                  onChangeText={(v) => patch({ email: v })}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </Field>
              <Field label="EXPERIENCE LEVEL">
                <SelectField
                  title="Experience level"
                  value={draft.experienceLevel}
                  options={EXPERIENCE}
                  onSelect={(v) => patch({ experienceLevel: v })}
                />
              </Field>
              <Field label="PREFERRED SPLIT">
                <SelectField
                  title="Preferred split"
                  value={draft.preferredSplit}
                  options={SPLITS}
                  onSelect={(v) => patch({ preferredSplit: v })}
                />
              </Field>
            </View>
          </View>

          {/* App preferences */}
          <View style={styles.section}>
            <SectionHeader title="App Preferences" subtitle="Units used across the workout flow" />
            <View style={styles.card}>
              <Field label="WEIGHT UNIT">
                <Choice value={draft.unit} options={UNITS} onSelect={(v) => patch({ unit: v })} />
              </Field>
            </View>
          </View>

          {/* Body stats — future calculations / AI integration */}
          <View style={styles.section}>
            <SectionHeader title="Body Stats" subtitle="Profile data for future insights" />
            <View style={styles.card}>
              <Field label={`CURRENT WEIGHT · ${unitLabel.toUpperCase()}`}>
                <TextInput
                  value={draft.bodyWeight}
                  onChangeText={(v) => patch({ bodyWeight: v })}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="HEIGHT · CM">
                <TextInput
                  value={draft.height}
                  onChangeText={(v) => patch({ height: v })}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
            </View>
          </View>

          {/* Goals */}
          <View style={styles.section}>
            <SectionHeader title="Goals" subtitle="Targets to drive future coaching" />
            <View style={styles.card}>
              <Field label="WEEKLY WORKOUT TARGET">
                <View style={styles.counter}>
                  <Pressable
                    onPress={() => patch({ weeklyGoal: Math.max(1, draft.weeklyGoal - 1) })}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterSign}>–</Text>
                  </Pressable>
                  <Text style={styles.counterValue}>{draft.weeklyGoal}</Text>
                  <Pressable
                    onPress={() => patch({ weeklyGoal: Math.min(14, draft.weeklyGoal + 1) })}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterSign}>+</Text>
                  </Pressable>
                  <Text style={styles.counterUnit}>workouts / week</Text>
                </View>
              </Field>
              <Field label="PRIMARY FITNESS GOAL">
                <SelectField
                  title="Primary fitness goal"
                  value={draft.primaryFitnessGoal}
                  options={GOALS}
                  onSelect={(v) => patch({ primaryFitnessGoal: v })}
                />
              </Field>
              <Field label={`TARGET BODY WEIGHT · ${unitLabel.toUpperCase()} (OPTIONAL)`}>
                <TextInput
                  value={draft.targetBodyWeight}
                  onChangeText={(v) => patch({ targetBodyWeight: v })}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="FOCUS MUSCLE GROUP (OPTIONAL)">
                <SelectField
                  title="Focus muscle group"
                  value={draft.focusMuscleGroup}
                  options={MUSCLE_GROUPS}
                  onSelect={(v) => patch({ focusMuscleGroup: v as MuscleGroup | undefined })}
                  placeholder="None"
                  clearable
                />
              </Field>
            </View>
          </View>

          {/* Account — Supabase auth */}
          <View style={styles.section}>
            <SectionHeader title="Account" subtitle="Synced to your Progressive account" />
            <View style={styles.card}>
              {user?.email ? (
                <Field label="SIGNED IN AS">
                  <Text style={styles.accountEmail}>{user.email}</Text>
                </Field>
              ) : null}
              <PrimaryButton title="Sign out" variant="danger" icon="log-out-outline" fullWidth onPress={signOut} />
            </View>
          </View>

          <Text style={styles.footnote}>
            Your workouts, templates and profile sync to the cloud and load on any device you sign in to.
          </Text>
        </ScrollView>

        {/* Sticky save bar — only shown while there are unsaved edits; it
            disappears again once you Save or Discard. */}
        {dirty ? (
          <View style={styles.footer}>
            <Text style={styles.footerHint}>You have unsaved changes</Text>
            <View style={styles.footerRow}>
              <PrimaryButton title="Discard" variant="ghost" onPress={onDiscard} style={styles.footerBtn} />
              <PrimaryButton title="Save" icon="checkmark" onPress={onSave} style={styles.footerBtn} />
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

function numStr(n?: number): string {
  return n === undefined || n === null || Number.isNaN(n) ? '' : `${n}`;
}
function parseNum(s: string): number | undefined {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, marginTop: 2 },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl },
  section: {},
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  fieldLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4 },
  input: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 48,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.body,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.sm, borderWidth: 1 },
  choiceText: { fontFamily: family.semibold, fontSize: font.label, letterSpacing: 0.4 },
  // Dropdown field + bottom-sheet picker
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 48,
  },
  selectValue: { flex: 1, marginRight: spacing.md, color: colors.text, fontFamily: family.medium, fontSize: font.body },
  selectPlaceholder: { color: colors.textFaint },
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '70%',
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.xl,
  },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: spacing.md },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  sheetTitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4, textTransform: 'uppercase', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  sheetList: { paddingHorizontal: spacing.lg },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  optionLabel: { color: colors.text, fontFamily: family.medium, fontSize: font.body },
  optionLabelSelected: { color: colors.primary, fontFamily: family.semibold },
  counter: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  counterBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    backgroundColor: colors.card3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterSign: { color: colors.text, fontFamily: family.semibold, fontSize: font.h3 },
  counterValue: { color: colors.text, fontFamily: family.display, fontSize: 30, lineHeight: 35, minWidth: 32, textAlign: 'center', includeFontPadding: false },
  counterUnit: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, marginLeft: spacing.sm },
  accountEmail: { color: colors.text, fontFamily: family.medium, fontSize: font.body },
  footnote: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, lineHeight: 18 },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    gap: spacing.sm,
  },
  footerHint: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, textAlign: 'center' },
  footerRow: { flexDirection: 'row', gap: spacing.md },
  footerBtn: { flex: 1 },
});
