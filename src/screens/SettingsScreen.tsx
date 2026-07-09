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

import { PageWidth, SectionHeader } from '../components';
import PrimaryButton from '../components/PrimaryButton';
import { useResponsive } from '../hooks/useResponsive';
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
import { colors, family, font, layout, radius, spacing } from '../theme';
import { MUSCLE_COLOR_OPTIONS } from '../utils/color';

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
 * A muscle group's colour picker: a collapsed row showing the group name and its
 * current colour, which expands to the swatch options — so the settings screen
 * isn't a wall of swatches for every category at once.
 */
function MuscleColorRow({
  group,
  value,
  onSelect,
}: {
  group: MuscleGroup;
  value: string;
  onSelect: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.colorRow}>
      <Pressable style={styles.colorRowHead} onPress={() => setOpen((o) => !o)}>
        <Text style={styles.colorGroupName}>{group.toUpperCase()}</Text>
        <View style={styles.colorRowRight}>
          <View style={[styles.swatchCurrent, { backgroundColor: value }]} />
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.textDim} />
        </View>
      </Pressable>
      {open ? (
        <View style={styles.swatches}>
          {MUSCLE_COLOR_OPTIONS.map((c) => {
            const sel = value.toLowerCase() === c.toLowerCase();
            return (
              <Pressable
                key={c}
                onPress={() => {
                  onSelect(c);
                  setOpen(false);
                }}
                style={[styles.swatch, { backgroundColor: c }, sel && styles.swatchSelected]}
              >
                {sel ? <Ionicons name="checkmark" size={13} color={colors.bg} /> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
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
  muscleColors: Partial<Record<MuscleGroup, string>>;
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
    muscleColors: s.muscleColors ?? {},
  };
}

export default function SettingsScreen({ navigation }: TabScreenProps<'Settings'>) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const logBodyWeight = useStore((s) => s.logBodyWeight);
  const { user, signOut } = useAuth();
  const { isDesktop } = useResponsive();

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
    const newWeight = parseNum(draft.bodyWeight);
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
        currentWeight: newWeight,
        height: parseNum(draft.height),
      },
      goals: {
        ...settings.goals,
        primaryFitnessGoal: draft.primaryFitnessGoal,
        targetBodyWeight: parseNum(draft.targetBodyWeight),
      },
      muscleColors: draft.muscleColors,
    });
    // Record a dated weigh-in whenever the current weight changes, so the
    // Progress bodyweight trend builds up over time.
    if (newWeight !== undefined && newWeight !== settings.bodyStats.currentWeight) {
      logBodyWeight(newWeight);
    }
  };

  const onDiscard = () => setDraft(toDraft(settings));

  const unitLabel = draft.unit;

  // Each settings group is captured as an element so desktop can lay them out
  // in two balanced columns (less scrolling, no wasted side gutters) while
  // mobile keeps the single stacked column.
  const profileSection = (
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
  );

  {/* Custom splits — drive the Home "Train Next" suggestion when the
      preferred split is set to Custom. */}
  const splitsSection = (
          <View style={styles.section}>
            <SectionHeader title="Custom Splits" subtitle="Build your own training rotation" />
            <View style={styles.card}>
              {settings.customSplits.length === 0 ? (
                <Text style={styles.splitEmpty}>
                  No custom splits yet. Create one, then set your Preferred Split to “Custom” to use it.
                </Text>
              ) : (
                settings.customSplits.map((sp) => {
                  const active = settings.activeSplitId === sp.id;
                  return (
                    <View key={sp.id} style={styles.splitRow}>
                      <Pressable
                        onPress={() => updateSettings({ activeSplitId: sp.id })}
                        hitSlop={8}
                        style={styles.splitRadio}
                      >
                        <Ionicons
                          name={active ? 'radio-button-on' : 'radio-button-off'}
                          size={20}
                          color={active ? colors.primary : colors.textFaint}
                        />
                      </Pressable>
                      <Pressable style={styles.flex} onPress={() => navigation.navigate('SplitEditor', { splitId: sp.id })}>
                        <Text style={styles.splitName} numberOfLines={1}>{sp.name.toUpperCase()}</Text>
                        <Text style={styles.splitMeta} numberOfLines={1}>
                          {sp.days.length} {sp.days.length === 1 ? 'DAY' : 'DAYS'}{active ? ' · ACTIVE' : ''}
                        </Text>
                      </Pressable>
                      <Ionicons name="create-outline" size={16} color={colors.textDim} />
                    </View>
                  );
                })
              )}
              <PrimaryButton
                title="New Split"
                icon="add"
                variant="secondary"
                size="md"
                fullWidth
                onPress={() => navigation.navigate('SplitEditor')}
              />
            </View>
          </View>
  );

  {/* App preferences */}
  const prefsSection = (
          <View style={styles.section}>
            <SectionHeader title="App Preferences" subtitle="Units used across the workout flow" />
            <View style={styles.card}>
              <Field label="WEIGHT UNIT">
                <Choice value={draft.unit} options={UNITS} onSelect={(v) => patch({ unit: v })} />
              </Field>
            </View>
          </View>
  );

  {/* Body stats — future calculations / AI integration */}
  const bodySection = (
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
  );

  {/* Goals */}
  const goalsSection = (
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
            </View>
          </View>
  );

  {/* Muscle group colors — a per-group accent used on badges/icons across the
      app. Each group is a collapsed row that expands to a colour dropdown. */}
  const muscleColorsSection = (
          <View style={styles.section}>
            <SectionHeader title="Muscle Group Colors" subtitle="Tap a group to pick its colour · lime is the default" />
            <View style={styles.card}>
              {MUSCLE_GROUPS.map((group) => (
                <MuscleColorRow
                  key={group}
                  group={group}
                  value={draft.muscleColors[group] ?? MUSCLE_COLOR_OPTIONS[0]}
                  onSelect={(c) =>
                    patch({
                      muscleColors:
                        c === MUSCLE_COLOR_OPTIONS[0]
                          ? omitKey(draft.muscleColors, group)
                          : { ...draft.muscleColors, [group]: c },
                    })
                  }
                />
              ))}
            </View>
          </View>
  );

  {/* Account — Supabase auth */}
  const accountSection = (
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
  );

  const footnote = (
    <Text style={styles.footnote}>
      Your workouts, templates and profile sync to the cloud and load on any device you sign in to.
    </Text>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={[styles.page, isDesktop && styles.pageDesktop]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.head, isDesktop && styles.headDesktop]}>
          <Text style={styles.title}>SETTINGS</Text>
          <Text style={styles.subtitle}>TRAINING PROFILE · APP PREFERENCES</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.content, isDesktop && styles.contentDesktop]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {isDesktop ? (
            <View style={styles.grid}>
              <View style={styles.col}>
                {profileSection}
                {prefsSection}
                {bodySection}
              </View>
              <View style={styles.col}>
                {splitsSection}
                {goalsSection}
                {muscleColorsSection}
                {accountSection}
                {footnote}
              </View>
            </View>
          ) : (
            <>
              {profileSection}
              {splitsSection}
              {prefsSection}
              {bodySection}
              {goalsSection}
              {muscleColorsSection}
              {accountSection}
              {footnote}
            </>
          )}
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
      </PageWidth>
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

/** Return a copy of the muscle-color map without one group (i.e. reset to default). */
function omitKey(
  obj: Partial<Record<MuscleGroup, string>>,
  key: MuscleGroup,
): Partial<Record<MuscleGroup, string>> {
  const next = { ...obj };
  delete next[key];
  return next;
}

function numStr(n?: number): string {
  return n === undefined || n === null || Number.isNaN(n) ? '' : `${n}`;
}
function parseNum(s: string): number | undefined {
  const n = parseFloat(s.replace(',', '.'));
  return Number.isNaN(n) ? undefined : n;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth },
  pageDesktop: { maxWidth: 1120 },
  flex: { flex: 1 },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headDesktop: { paddingHorizontal: spacing.xxl, paddingTop: spacing.lg },
  contentDesktop: { paddingHorizontal: spacing.xxl },
  grid: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'flex-start' },
  col: { flex: 1, gap: spacing.xl, minWidth: 0 },
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
  splitEmpty: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, lineHeight: 18 },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  splitRadio: { padding: 2 },
  splitName: { color: colors.text, fontFamily: family.semibold, fontSize: font.body, letterSpacing: 0.3 },
  splitMeta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, marginTop: 2 },
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
  sheetBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: layout.formMaxWidth,
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
  // Muscle group colors
  colorRow: { gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  colorRowHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  colorRowRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatchCurrent: { width: 22, height: 22, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border },
  colorGroupName: { color: colors.text, fontFamily: family.medium, fontSize: font.body, letterSpacing: 0.5 },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  swatch: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  swatchSelected: { borderWidth: 2, borderColor: colors.text },
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
