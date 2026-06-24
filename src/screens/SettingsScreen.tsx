import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
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
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import {
  BodyStats,
  ExperienceLevel,
  FitnessGoal,
  MUSCLE_GROUPS,
  MuscleGroup,
  TrainingSplit,
  UnitPreference,
  UserGoals,
  UserProfile,
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

export default function SettingsScreen(_: TabScreenProps<'Settings'>) {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  // Text/number fields keep local state and commit on blur to avoid persisting
  // on every keystroke; selections (chips/units) commit immediately.
  const [name, setName] = useState(settings.profile.name ?? settings.userName ?? '');
  const [email, setEmail] = useState(settings.profile.email ?? '');
  const [bodyWeight, setBodyWeight] = useState(numStr(settings.bodyStats.currentWeight));
  const [height, setHeight] = useState(numStr(settings.bodyStats.height));
  const [targetWeight, setTargetWeight] = useState(numStr(settings.goals.targetBodyWeight));

  const setProfile = (patch: Partial<UserProfile>) =>
    updateSettings({ profile: { ...settings.profile, ...patch } });
  const setGoals = (patch: Partial<UserGoals>) =>
    updateSettings({ goals: { ...settings.goals, ...patch } });
  const setBody = (patch: Partial<BodyStats>) =>
    updateSettings({ bodyStats: { ...settings.bodyStats, ...patch } });

  const unitLabel = settings.unit;

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
                  value={name}
                  onChangeText={setName}
                  onEndEditing={() => {
                    const trimmed = name.trim();
                    // Keep the home greeting (userName) in sync with the profile name.
                    updateSettings({
                      profile: { ...settings.profile, name: trimmed || undefined },
                      userName: trimmed || 'Athlete',
                    });
                  }}
                  placeholder="Your name"
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                />
              </Field>
              <Field label="EMAIL">
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  onEndEditing={() => setProfile({ email: email.trim() || undefined })}
                  placeholder="you@email.com"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                />
              </Field>
              <Field label="EXPERIENCE LEVEL">
                <Choice value={settings.profile.experienceLevel} options={EXPERIENCE} onSelect={(v) => setProfile({ experienceLevel: v })} />
              </Field>
              <Field label="PREFERRED SPLIT">
                <Choice value={settings.profile.preferredSplit} options={SPLITS} onSelect={(v) => setProfile({ preferredSplit: v })} />
              </Field>
            </View>
          </View>

          {/* App preferences */}
          <View style={styles.section}>
            <SectionHeader title="App Preferences" subtitle="Units used across the workout flow" />
            <View style={styles.card}>
              <Field label="WEIGHT UNIT">
                <Choice value={settings.unit} options={UNITS} onSelect={(v) => updateSettings({ unit: v })} />
              </Field>
            </View>
          </View>

          {/* Body stats — future calculations / AI integration */}
          <View style={styles.section}>
            <SectionHeader title="Body Stats" subtitle="Profile data for future insights" />
            <View style={styles.card}>
              <Field label={`CURRENT WEIGHT · ${unitLabel.toUpperCase()}`}>
                <TextInput
                  value={bodyWeight}
                  onChangeText={setBodyWeight}
                  onEndEditing={() => setBody({ currentWeight: parseNum(bodyWeight) })}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="HEIGHT · CM">
                <TextInput
                  value={height}
                  onChangeText={setHeight}
                  onEndEditing={() => setBody({ height: parseNum(height) })}
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
                    onPress={() => updateSettings({ weeklyGoal: Math.max(1, settings.weeklyGoal - 1) })}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterSign}>–</Text>
                  </Pressable>
                  <Text style={styles.counterValue}>{settings.weeklyGoal}</Text>
                  <Pressable
                    onPress={() => updateSettings({ weeklyGoal: Math.min(14, settings.weeklyGoal + 1) })}
                    style={styles.counterBtn}
                  >
                    <Text style={styles.counterSign}>+</Text>
                  </Pressable>
                  <Text style={styles.counterUnit}>workouts / week</Text>
                </View>
              </Field>
              <Field label="PRIMARY FITNESS GOAL">
                <Choice value={settings.goals.primaryFitnessGoal} options={GOALS} onSelect={(v) => setGoals({ primaryFitnessGoal: v })} />
              </Field>
              <Field label={`TARGET BODY WEIGHT · ${unitLabel.toUpperCase()} (OPTIONAL)`}>
                <TextInput
                  value={targetWeight}
                  onChangeText={setTargetWeight}
                  onEndEditing={() => setGoals({ targetBodyWeight: parseNum(targetWeight) })}
                  placeholder="0"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              </Field>
              <Field label="FOCUS MUSCLE GROUP (OPTIONAL)">
                <View style={styles.choices}>
                  {MUSCLE_GROUPS.map((g) => {
                    const sel = settings.goals.focusMuscleGroup === g;
                    return (
                      <Pressable
                        key={g}
                        onPress={() => setGoals({ focusMuscleGroup: sel ? undefined : (g as MuscleGroup) })}
                        style={[styles.choice, { backgroundColor: sel ? colors.primaryDim : colors.card, borderColor: sel ? colors.primary : colors.border }]}
                      >
                        <Text style={[styles.choiceText, { color: sel ? colors.primary : colors.textDim }]}>{g}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </Field>
            </View>
          </View>

          <Text style={styles.footnote}>
            Saved on this device. Profile and goals are structured to connect to real accounts and AI coaching later.
          </Text>
        </ScrollView>
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
  footnote: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, lineHeight: 18 },
});
