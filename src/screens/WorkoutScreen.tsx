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

import { EmptyState, PrimaryButton, WorkoutExerciseCard } from '../components';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { WorkoutExercise } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { withAlpha } from '../utils/color';
import { formatClock, formatVolume } from '../utils/format';
import { computePRs, epley1RM, lastPerformance, lastWorkout, sessionVolume } from '../utils/stats';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const CLEAN = ['CLEAN SET', 'ADD ONE MORE CLEAN SET', 'LOGGED', 'DIALED IN'];

function StatPill({ icon, value, accent }: { icon: IconName; value: string; accent: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[styles.pillText, { color: accent }]}>{value}</Text>
    </View>
  );
}

export default function WorkoutScreen({ navigation }: TabScreenProps<'Workout'>) {
  const active = useStore((s) => s.activeWorkout);
  const workouts = useStore((s) => s.workouts);
  const startWorkout = useStore((s) => s.startWorkout);
  const repeatLastWorkout = useStore((s) => s.repeatLastWorkout);
  const renameWorkout = useStore((s) => s.renameWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const addSet = useStore((s) => s.addSet);
  const updateSet = useStore((s) => s.updateSet);
  const toggleSetComplete = useStore((s) => s.toggleSetComplete);
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

  const prsByExercise = useMemo(() => computePRs(workouts), [workouts]);
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

  const encouragementFor = (we: WorkoutExercise | undefined, w: number, reps: number) => {
    if (we) {
      const prevMax = prsByExercise[we.exerciseId]?.maxWeight ?? 0;
      if (w > 0 && w > prevMax) return { text: `NEW BEST · ${we.name.toUpperCase()}`, accent: colors.primary };
      const prev = previousMap[we.exerciseId];
      if (prev && prev.length > 0) {
        const bestPrev = Math.max(...prev.map((s) => epley1RM(s.weight, s.reps)));
        const now = epley1RM(w, reps);
        if (bestPrev > 0 && now > bestPrev) return { text: `VOLUME UP · ${we.name.toUpperCase()}`, accent: colors.primary };
        if (bestPrev > 0 && Math.abs(now - bestPrev) < 0.5) return { text: 'MATCHED LAST SESSION', accent: colors.text };
      }
    }
    return { text: CLEAN[Math.floor(Math.random() * CLEAN.length)], accent: colors.text };
  };

  if (!active) {
    const hasLast = !!lastWorkout(workouts);
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="barbell-outline"
            title="Ready to train"
            message="Start a session and log your sets as you go. One tap to begin."
            actionLabel="Start Workout"
            onAction={() => startWorkout()}
          />
          {hasLast ? (
            <PrimaryButton
              title="Repeat Last Session"
              icon="refresh"
              variant="secondary"
              size="md"
              onPress={() => repeatLastWorkout()}
              style={styles.repeatBtn}
            />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const volume = sessionVolume(active, true);
  const totalSets = active.exercises.reduce((n, we) => n + we.sets.length, 0);
  const doneSets = active.exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);

  const onToggleSet = (weId: string, setId: string) => {
    const we = active.exercises.find((e) => e.id === weId);
    const set = we?.sets.find((s) => s.id === setId);
    const becoming = set ? !set.completed : false;
    toggleSetComplete(weId, setId);
    if (becoming && set) {
      const enc = encouragementFor(we, set.weight, set.reps);
      showToast(enc.text, enc.accent);
    }
  };

  const handleFinish = () => {
    if (doneSets === 0) {
      Alert.alert('Nothing logged yet', 'Complete at least one set before finishing.');
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
              placeholder="Workout"
              placeholderTextColor={colors.textFaint}
              style={styles.title}
              maxLength={26}
            />
          </View>
          <Pressable onPress={handleDiscard} hitSlop={8} style={styles.closeBtn}>
            <Ionicons name="close" size={20} color={colors.textDim} />
          </Pressable>
        </View>

        <View style={styles.statsBar}>
          <StatPill icon="time-outline" value={formatClock(elapsed)} accent={colors.text} />
          <StatPill icon="barbell-outline" value={`${formatVolume(volume)} KG`} accent={colors.primary} />
          <StatPill icon="checkmark-done-outline" value={`${doneSets}/${totalSets}`} accent={colors.text} />
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
            <EmptyState
              icon="add-circle-outline"
              title="No exercises yet"
              message="Add your first exercise to start logging sets."
              actionLabel="Add Exercise"
              onAction={() => navigation.navigate('ExercisePicker')}
            />
          ) : (
            <>
              {active.exercises.map((we) => (
                <WorkoutExerciseCard
                  key={we.id}
                  exercise={we}
                  previousSets={previousMap[we.exerciseId]}
                  onAddSet={() => addSet(we.id)}
                  onRemove={() => removeWorkoutExercise(we.id)}
                  onNotesChange={(notes) => setExerciseNotes(we.id, notes)}
                  onUpdateSet={(setId, patch) => updateSet(we.id, setId, patch)}
                  onToggleSet={(setId) => onToggleSet(we.id, setId)}
                  onRemoveSet={(setId) => removeSet(we.id, setId)}
                />
              ))}
              <PrimaryButton title="Add Exercise" icon="add" variant="secondary" size="md" fullWidth onPress={() => navigation.navigate('ExercisePicker')} />
            </>
          )}
        </ScrollView>

        <View style={styles.footer}>
          <PrimaryButton title="Finish Workout" icon="checkmark-done" onPress={handleFinish} fullWidth disabled={doneSets === 0} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  emptyWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg },
  repeatBtn: { marginHorizontal: spacing.xxl },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, gap: spacing.md },
  eyebrow: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6 },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.h1, letterSpacing: 0.5, padding: 0, marginTop: 2, includeFontPadding: false },
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
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.bgElevated },
});
