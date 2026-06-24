import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
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

import { PrimaryButton, WorkoutExerciseCard } from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { MuscleGroup, WorkoutTemplate } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { formatClock } from '../utils/format';
import { lastPerformance, lastWorkout } from '../utils/stats';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function StatPill({ icon, value, accent }: { icon: IconName; value: string; accent: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[styles.pillText, { color: accent }]}>{value}</Text>
    </View>
  );
}

function templateGroups(t: WorkoutTemplate): MuscleGroup[] {
  return Array.from(new Set(t.exercises.map((e) => e.muscleGroup))) as MuscleGroup[];
}

export default function WorkoutScreen({ navigation }: TabScreenProps<'Workout'>) {
  const active = useStore((s) => s.activeWorkout);
  const workouts = useStore((s) => s.workouts);
  const templates = useStore((s) => s.templates);
  const startWorkout = useStore((s) => s.startWorkout);
  const repeatLastWorkout = useStore((s) => s.repeatLastWorkout);
  const startWorkoutFromTemplate = useStore((s) => s.startWorkoutFromTemplate);
  const renameWorkout = useStore((s) => s.renameWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const addSet = useStore((s) => s.addSet);
  const updateSet = useStore((s) => s.updateSet);
  const completeExercise = useStore((s) => s.completeExercise);
  const removeSet = useStore((s) => s.removeSet);
  const removeWorkoutExercise = useStore((s) => s.removeWorkoutExercise);
  const setExerciseNotes = useStore((s) => s.setExerciseNotes);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) return;
    const start = active.startedAt;
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [active?.id, active?.startedAt]);

  const previousMap = useMemo(() => {
    const map: Record<string, { reps: number; weight: number }[] | null> = {};
    active?.exercises.forEach((we) => {
      map[we.exerciseId] = lastPerformance(workouts, we.exerciseId)?.sets ?? null;
    });
    return map;
  }, [workouts, active?.exercises]);

  const [toast, setToast] = useState<{ text: string; accent: string } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const showToast = (text: string, accent: string) => {
    setToast({ text, accent });
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1500),
      Animated.timing(toastOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start(({ finished }) => finished && setToast(null));
  };

  // ── Pre-start screen ────────────────────────────────────────────────────
  if (!active) {
    const hasLast = !!lastWorkout(workouts);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.flex}>
          {/* Top: editorial intro, left-aligned */}
          <View style={styles.intro}>
            <View style={styles.introIcon}>
              <Ionicons name="barbell" size={26} color={colors.primary} />
            </View>
            <Text style={styles.introKicker}>TODAY’S TRAINING</Text>
            <Text style={styles.introTitle}>READY TO TRAIN</Text>
            <Text style={styles.introText}>
              Start a session and log your sets as you go — or launch a saved template to skip setup.
            </Text>
          </View>

          {/* Centre: two equal primary actions */}
          <View style={styles.actionsArea}>
            <PrimaryButton
              title="Start Workout"
              icon="add"
              size="lg"
              fullWidth
              onPress={() => startWorkout('')}
              style={styles.actionBtn}
            />
            <PrimaryButton
              title="Repeat Last Session"
              icon="refresh"
              variant="secondary"
              size="lg"
              fullWidth
              disabled={!hasLast}
              onPress={() => repeatLastWorkout()}
              style={styles.actionBtn}
            />
          </View>

          {/* Templates */}
          <View style={styles.templatesArea}>
            <Text style={styles.templatesLabel}>TEMPLATES</Text>
            {templates.length === 0 ? (
              <Text style={styles.templatesEmpty}>
                No templates yet. Create one with the button below to start faster next time.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templatesScroll}
              >
                {templates.map((t) => (
                  <Pressable
                    key={t.id}
                    onPress={() => startWorkoutFromTemplate(t.id)}
                    style={({ pressed }) => [styles.tplCard, pressed && styles.tplCardPressed]}
                  >
                    <View style={styles.tplTop}>
                      <Text style={styles.tplKicker}>TEMPLATE</Text>
                      <Pressable
                        onPress={() => navigation.navigate('TemplateEditor', { templateId: t.id })}
                        hitSlop={8}
                        style={styles.tplEdit}
                      >
                        <Ionicons name="create-outline" size={15} color={colors.textDim} />
                      </Pressable>
                    </View>
                    <Text style={styles.tplName} numberOfLines={1}>
                      {t.name.toUpperCase()}
                    </Text>
                    <Text style={styles.tplMeta} numberOfLines={1}>
                      {t.exercises.length} EXERCISES · {templateGroups(t).slice(0, 3).join(' / ').toUpperCase()}
                    </Text>
                    <View style={styles.tplStart}>
                      <Text style={styles.tplStartText}>START</Text>
                      <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </View>
        </View>

        {/* Bottom-right: square create-template button */}
        <Pressable
          onPress={() => navigation.navigate('TemplateEditor')}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Ionicons name="add" size={24} color={colors.bg} />
          <Text style={styles.fabText}>TEMPLATE</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  // ── Active workout ──────────────────────────────────────────────────────
  const totalSets = active.exercises.reduce((n, we) => n + we.sets.length, 0);
  const doneSets = active.exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);
  const nameValid = active.name.trim().length > 0;

  const onCompleteExercise = (weId: string) => {
    const we = active.exercises.find((e) => e.id === weId);
    const wasComplete = !!we && we.sets.length > 0 && we.sets.every((s) => s.completed);
    completeExercise(weId);
    if (we && !wasComplete) showToast(`LOGGED · ${we.name.toUpperCase()}`, colors.primary);
  };

  const handleFinish = () => {
    if (!nameValid) {
      Alert.alert('Name your workout', 'Name your workout before finishing.');
      return;
    }
    if (doneSets === 0) {
      Alert.alert('Nothing logged yet', 'Complete at least one exercise before finishing.');
      return;
    }
    const summary = finishWorkout();
    if (summary) navigation.navigate('WorkoutComplete', { summary });
  };

  const handleDiscard = () => {
    Alert.alert('Discard workout?', 'This will delete your current session.', [
      { text: 'Keep training', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => discardWorkout() },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.header}>
          <View style={styles.flex}>
            <Text style={styles.eyebrow}>ACTIVE SESSION</Text>
            <TextInput
              value={active.name}
              onChangeText={renameWorkout}
              placeholder="Name your workout"
              placeholderTextColor={colors.textFaint}
              style={styles.title}
              maxLength={26}
            />
            {!nameValid ? <Text style={styles.nameRequired}>NAME REQUIRED BEFORE FINISHING</Text> : null}
          </View>
          <Pressable onPress={handleDiscard} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textDim} />
          </Pressable>
        </View>

        <View style={styles.statsBar}>
          <StatPill icon="time-outline" value={formatClock(elapsed)} accent={colors.text} />
          <StatPill icon="checkmark-done-outline" value={`${doneSets}/${totalSets} SETS`} accent={colors.primary} />
        </View>

        {toast ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.toast, { opacity: toastOpacity, borderColor: toast.accent }]}
          >
            <Text style={[styles.toastText, { color: toast.accent }]}>{toast.text}</Text>
          </Animated.View>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {active.exercises.length === 0 ? (
            <View style={styles.emptyExercises}>
              <Ionicons name="add-circle-outline" size={30} color={colors.textFaint} />
              <Text style={styles.emptyTitle}>NO EXERCISES YET</Text>
              <Text style={styles.emptyText}>Add your first exercise to start logging sets.</Text>
              <PrimaryButton title="Add Exercise" icon="add" size="md" onPress={() => navigation.navigate('ExercisePicker')} style={{ marginTop: spacing.lg }} />
            </View>
          ) : (
            <>
              {active.exercises.map((we) => (
                <WorkoutExerciseCard
                  key={we.id}
                  exercise={we}
                  previousSets={previousMap[we.exerciseId]}
                  onAddSet={() => addSet(we.id)}
                  onRemove={() => removeWorkoutExercise(we.id)}
                  onComplete={() => onCompleteExercise(we.id)}
                  onNotesChange={(notes) => setExerciseNotes(we.id, notes)}
                  onUpdateSet={(setId, patch) => updateSet(we.id, setId, patch)}
                  onRemoveSet={(setId) => removeSet(we.id, setId)}
                />
              ))}
              <PrimaryButton title="Add Exercise" icon="add" variant="secondary" size="md" fullWidth onPress={() => navigation.navigate('ExercisePicker')} />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton
            title="Finish Workout"
            icon="checkmark-done"
            onPress={handleFinish}
            fullWidth
            disabled={doneSets === 0 || !nameValid}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },

  // Pre-start
  intro: { paddingHorizontal: spacing.lg, paddingTop: spacing.xl },
  introIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  introKicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2 },
  introTitle: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false, marginTop: 2 },
  introText: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, lineHeight: 21, marginTop: spacing.sm, maxWidth: 320 },

  actionsArea: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, gap: spacing.md },
  actionBtn: { width: '100%' },

  templatesArea: { paddingBottom: spacing.xl, minHeight: 150 },
  templatesLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  templatesEmpty: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, lineHeight: 18, paddingHorizontal: spacing.lg, maxWidth: 280 },
  templatesScroll: { paddingHorizontal: spacing.lg, gap: spacing.md, paddingRight: 96 },
  tplCard: {
    width: 188,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: 6,
  },
  tplCardPressed: { borderColor: colors.borderStrong, transform: [{ scale: 1.01 }] },
  tplTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tplKicker: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4 },
  tplEdit: { padding: 2 },
  tplName: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 0.6, includeFontPadding: false, marginTop: 2 },
  tplMeta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6 },
  tplStart: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  tplStartText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1.2 },

  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    width: 76,
    height: 76,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  fabPressed: { transform: [{ translateY: 1.5 }], opacity: 0.92 },
  fabText: { color: colors.bg, fontFamily: family.bold, fontSize: 9, letterSpacing: 1 },

  // Active workout
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6 },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, padding: 0, marginTop: 2, includeFontPadding: false },
  nameRequired: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, marginTop: 2 },
  closeBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },
  statsBar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillText: { fontFamily: family.semibold, fontSize: font.label, letterSpacing: 0.4 },
  toast: {
    position: 'absolute',
    top: 104,
    alignSelf: 'center',
    zIndex: 10,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: colors.card,
  },
  toastText: { fontFamily: family.bold, fontSize: font.label, letterSpacing: 1 },
  scroll: { padding: spacing.lg, gap: spacing.lg },
  emptyExercises: { alignItems: 'center', paddingVertical: spacing.xxxl, gap: spacing.sm },
  emptyTitle: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 1, includeFontPadding: false, marginTop: spacing.sm },
  emptyText: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, textAlign: 'center' },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated },
});
