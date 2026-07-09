import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
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

import { PageWidth, PrimaryButton, WorkoutExerciseCard } from '../components';
import { useResponsive } from '../hooks/useResponsive';
import { TabScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { MuscleGroup, TemplateExercise, WorkoutExercise, WorkoutSession, WorkoutTemplate } from '../types';
import { colors, family, font, layout, radius, spacing } from '../theme';
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

/** Clusters consecutive same-supersetId exercises into render groups. */
function groupExercises(exercises: WorkoutExercise[]): WorkoutExercise[][] {
  const groups: WorkoutExercise[][] = [];
  for (const we of exercises) {
    const last = groups[groups.length - 1];
    if (we.supersetId && last && last[0].supersetId === we.supersetId) {
      last.push(we);
    } else {
      groups.push([we]);
    }
  }
  return groups;
}

export default function WorkoutScreen({ navigation }: TabScreenProps<'Workout'>) {
  const active = useStore((s) => s.activeWorkout);
  const workouts = useStore((s) => s.workouts);
  const templates = useStore((s) => s.templates);
  const startWorkout = useStore((s) => s.startWorkout);
  const repeatLastWorkout = useStore((s) => s.repeatLastWorkout);
  const startWorkoutFromTemplate = useStore((s) => s.startWorkoutFromTemplate);
  const deleteTemplate = useStore((s) => s.deleteTemplate);
  const addTemplate = useStore((s) => s.addTemplate);
  const updateTemplate = useStore((s) => s.updateTemplate);
  const renameWorkout = useStore((s) => s.renameWorkout);
  const discardWorkout = useStore((s) => s.discardWorkout);
  const replaceActiveWorkout = useStore((s) => s.replaceActiveWorkout);
  const finishWorkout = useStore((s) => s.finishWorkout);
  const addSet = useStore((s) => s.addSet);
  const updateSet = useStore((s) => s.updateSet);
  const updateSetDuration = useStore((s) => s.updateSetDuration);
  const completeExercise = useStore((s) => s.completeExercise);
  const removeSet = useStore((s) => s.removeSet);
  const removeWorkoutExercise = useStore((s) => s.removeWorkoutExercise);
  const setExerciseNotes = useStore((s) => s.setExerciseNotes);
  const toggleDropSet = useStore((s) => s.toggleDropSet);
  const addDropStage = useStore((s) => s.addDropStage);
  const updateDropStage = useStore((s) => s.updateDropStage);
  const removeDropStage = useStore((s) => s.removeDropStage);
  const linkSuperset = useStore((s) => s.linkSuperset);
  const unlinkSuperset = useStore((s) => s.unlinkSuperset);

  const { isDesktop } = useResponsive();

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
    const map: Record<string, { reps: number; weight: number; durationSec?: number }[] | null> = {};
    active?.exercises.forEach((we) => {
      map[we.exerciseId] = lastPerformance(workouts, we.exerciseId)?.sets ?? null;
    });
    return map;
  }, [workouts, active?.exercises]);

  const [confirmTpl, setConfirmTpl] = useState<WorkoutTemplate | null>(null);
  const [confirmDeleteTpl, setConfirmDeleteTpl] = useState<WorkoutTemplate | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [startChooser, setStartChooser] = useState(false);

  // Superset linking — select 2+ ungrouped exercises, then confirm.
  const [linkMode, setLinkMode] = useState(false);
  const [linkSelected, setLinkSelected] = useState<string[]>([]);
  const ungroupedCount = active?.exercises.filter((e) => !e.supersetId).length ?? 0;
  const toggleLinkSelect = (id: string) =>
    setLinkSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const cancelLink = () => {
    setLinkMode(false);
    setLinkSelected([]);
  };
  const confirmLink = () => {
    linkSuperset(linkSelected);
    cancelLink();
  };

  const supersetLetters = useMemo(() => {
    const map: Record<string, string> = {};
    let idx = 0;
    active?.exercises.forEach((we) => {
      if (we.supersetId && !(we.supersetId in map)) map[we.supersetId] = String.fromCharCode(65 + idx++);
    });
    return map;
  }, [active?.exercises]);

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

  // Interactive undo bar for destructive removals. It snapshots the whole active
  // session before the delete, so tapping UNDO restores it exactly.
  const [undo, setUndo] = useState<{ text: string; restore: WorkoutSession } | null>(null);
  const undoOpacity = useRef(new Animated.Value(0)).current;
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideUndo = () => {
    Animated.timing(undoOpacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(
      ({ finished }) => finished && setUndo(null),
    );
  };
  const showUndo = (text: string, restore: WorkoutSession) => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo({ text, restore });
    undoOpacity.setValue(0);
    Animated.timing(undoOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    undoTimer.current = setTimeout(hideUndo, 4500);
  };
  const doUndo = () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
    setUndo((u) => {
      if (u) replaceActiveWorkout(u.restore);
      return null;
    });
    undoOpacity.setValue(0);
  };
  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  // ── Pre-start screen ────────────────────────────────────────────────────
  if (!active) {
    const hasLast = !!lastWorkout(workouts);
    const startFromConfirmed = () => {
      const tpl = confirmTpl;
      setConfirmTpl(null);
      if (tpl) startWorkoutFromTemplate(tpl.id);
    };

    const headEl = (
      <View style={styles.head}>
        <Text style={styles.headTitle}>WORKOUT</Text>
        <Text style={styles.subtitle}>START A SESSION · LOG YOUR SETS</Text>
      </View>
    );

    const actionsEl = (
      <View style={styles.actions}>
        <PrimaryButton
          title="Start Workout"
          icon="add"
          size="lg"
          fullWidth
          onPress={() => setStartChooser(true)}
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
    );

    const templatesEl = (
      <View style={styles.templatesArea}>
        <Text style={styles.templatesLabel}>TEMPLATES</Text>
        {templates.length === 0 ? (
          <Text style={styles.templatesEmpty}>
            No templates yet. Create one with the button below to start faster next time.
          </Text>
        ) : (
          <View style={isDesktop ? styles.templatesGrid : styles.templatesList}>
            {templates.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => setConfirmTpl(t)}
                style={({ pressed }) => [styles.tplRow, isDesktop && styles.tplRowDesktop, pressed && styles.tplRowPressed]}
              >
                <View style={styles.flex}>
                  <Text style={styles.tplRowName} numberOfLines={1}>
                    {t.name.toUpperCase()}
                  </Text>
                  <Text style={styles.tplRowMeta} numberOfLines={1}>
                    {t.exercises.length} EXERCISES · {templateGroups(t).slice(0, 3).join(' / ').toUpperCase()}
                  </Text>
                </View>
                <Pressable
                  onPress={() => navigation.navigate('TemplateEditor', { templateId: t.id })}
                  hitSlop={10}
                  style={styles.tplRowEdit}
                >
                  <Ionicons name="create-outline" size={16} color={colors.textDim} />
                </Pressable>
                <Pressable onPress={() => setConfirmDeleteTpl(t)} hitSlop={10} style={styles.tplRowEdit}>
                  <Ionicons name="trash-outline" size={16} color={colors.textDim} />
                </Pressable>
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </Pressable>
            ))}
          </View>
        )}
      </View>
    );

    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScrollView style={{ width: '100%' }} contentContainerStyle={styles.preStartScroll} showsVerticalScrollIndicator={false}>
          <PageWidth style={[styles.page, isDesktop && styles.pageDesktop]}>
            {isDesktop ? (
              <>
                {headEl}
                <View style={styles.desktopGrid}>
                  <View style={styles.mainCol}>{templatesEl}</View>
                  <View style={styles.sideCol}>{actionsEl}</View>
                </View>
              </>
            ) : (
              <>
                {headEl}
                {actionsEl}
                {templatesEl}
              </>
            )}
          </PageWidth>
        </ScrollView>

        {/* Bottom-right: square create-template button */}
        <Pressable
          onPress={() => navigation.navigate('TemplateEditor')}
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        >
          <Ionicons name="add" size={24} color={colors.bg} />
          <Text style={styles.fabText}>TEMPLATE</Text>
        </Pressable>

        {/* Choose how to begin — empty, or from a template */}
        <Modal visible={startChooser} transparent animationType="fade" onRequestClose={() => setStartChooser(false)}>
          <Pressable style={styles.confirmBackdrop} onPress={() => setStartChooser(false)}>
            <Pressable style={styles.confirmDialog} onPress={() => {}}>
              <Text style={styles.confirmKicker}>START A WORKOUT</Text>
              <Text style={styles.confirmName}>CHOOSE HOW TO BEGIN</Text>
              <Text style={styles.confirmCopy}>Start from scratch, or load one of your templates.</Text>
              <PrimaryButton
                title="Empty Workout"
                icon="add"
                size="md"
                fullWidth
                onPress={() => {
                  setStartChooser(false);
                  startWorkout('');
                }}
                style={styles.chooserEmptyBtn}
              />
              {templates.length > 0 ? (
                <>
                  <Text style={styles.chooserLabel}>OR START FROM A TEMPLATE</Text>
                  <ScrollView style={styles.chooserList} showsVerticalScrollIndicator={false}>
                    {templates.map((t) => (
                      <Pressable
                        key={t.id}
                        onPress={() => {
                          setStartChooser(false);
                          startWorkoutFromTemplate(t.id);
                        }}
                        style={({ pressed }) => [styles.chooserRow, pressed && styles.tplRowPressed]}
                      >
                        <View style={styles.flex}>
                          <Text style={styles.chooserName} numberOfLines={1}>{t.name.toUpperCase()}</Text>
                          <Text style={styles.chooserMeta} numberOfLines={1}>
                            {t.exercises.length} EXERCISES · {templateGroups(t).slice(0, 3).join(' / ').toUpperCase()}
                          </Text>
                        </View>
                        <Ionicons name="arrow-forward" size={16} color={colors.primary} />
                      </Pressable>
                    ))}
                  </ScrollView>
                </>
              ) : (
                <Text style={styles.chooserNoTpl}>
                  No templates yet — start empty, then use “Save as Template” during your session.
                </Text>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Confirm before starting from a template */}
        <Modal visible={!!confirmTpl} transparent animationType="fade" onRequestClose={() => setConfirmTpl(null)}>
          <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmTpl(null)}>
            <Pressable style={styles.confirmDialog} onPress={() => {}}>
              <Text style={styles.confirmKicker}>START FROM TEMPLATE</Text>
              <Text style={styles.confirmName}>{confirmTpl?.name.toUpperCase()}</Text>
              <Text style={styles.confirmMeta}>
                {confirmTpl?.exercises.length ?? 0} EXERCISES
                {confirmTpl && confirmTpl.exercises.length > 0
                  ? ` · ${templateGroups(confirmTpl).slice(0, 3).join(' / ').toUpperCase()}`
                  : ''}
              </Text>
              <Text style={styles.confirmCopy}>Start a workout using this template?</Text>
              <View style={styles.confirmActions}>
                <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={() => setConfirmTpl(null)} style={styles.flex} />
                <PrimaryButton title="Start Workout" icon="play" size="md" onPress={startFromConfirmed} style={styles.flex} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>

        {/* Confirm before deleting a template */}
        <Modal visible={!!confirmDeleteTpl} transparent animationType="fade" onRequestClose={() => setConfirmDeleteTpl(null)}>
          <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDeleteTpl(null)}>
            <Pressable style={styles.confirmDialog} onPress={() => {}}>
              <Text style={styles.confirmKicker}>DELETE TEMPLATE</Text>
              <Text style={styles.confirmName}>{confirmDeleteTpl?.name.toUpperCase()}</Text>
              <Text style={styles.confirmCopy}>This template will be removed. Your logged workouts are kept.</Text>
              <View style={styles.confirmActions}>
                <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={() => setConfirmDeleteTpl(null)} style={styles.flex} />
                <PrimaryButton
                  title="Delete"
                  variant="danger"
                  size="md"
                  onPress={() => {
                    if (confirmDeleteTpl) deleteTemplate(confirmDeleteTpl.id);
                    setConfirmDeleteTpl(null);
                  }}
                  style={styles.flex}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── Active workout ──────────────────────────────────────────────────────
  const totalSets = active.exercises.reduce((n, we) => n + we.sets.length, 0);
  const doneSets = active.exercises.reduce((n, we) => n + we.sets.filter((s) => s.completed).length, 0);
  const nameValid = active.name.trim().length > 0;
  // A workout can only be finished once every set is completed.
  const allSetsComplete = totalSets > 0 && doneSets === totalSets;

  // Template sync: only offer update / save-as-new when this session came from a
  // template AND its exercise list has been changed (an exercise added/removed).
  const sourceTpl = active.templateId ? templates.find((t) => t.id === active.templateId) : undefined;
  const templateExercisesChanged = (() => {
    if (!sourceTpl) return false;
    const now = [...active.exercises.map((e) => e.exerciseId)].sort();
    const was = [...sourceTpl.exercises.map((e) => e.exerciseId)].sort();
    return now.length !== was.length || now.some((id, i) => id !== was[i]);
  })();
  const toTemplateExercises = (): TemplateExercise[] =>
    active.exercises.map((we) => ({
      exerciseId: we.exerciseId,
      exerciseName: we.name,
      muscleGroup: we.muscleGroup,
      notes: we.notes || undefined,
    }));
  const groups = groupExercises(active.exercises);

  const onCompleteExercise = (weId: string) => {
    const we = active.exercises.find((e) => e.id === weId);
    const wasComplete = !!we && we.sets.length > 0 && we.sets.every((s) => s.completed);
    completeExercise(weId);
    if (we && !wasComplete) {
      showToast(`LOGGED · ${we.name.toUpperCase()}`, colors.primary);
    }
  };

  const handleRemoveExercise = (weId: string) => {
    const snapshot = active; // full session before the delete, for undo
    const we = active.exercises.find((e) => e.id === weId);
    removeWorkoutExercise(weId);
    showUndo(`REMOVED · ${(we?.name ?? 'EXERCISE').toUpperCase()}`, snapshot);
  };

  const handleRemoveSet = (weId: string, setId: string) => {
    const snapshot = active;
    removeSet(weId, setId);
    showUndo('SET REMOVED', snapshot);
  };

  const saveAsTemplate = () => {
    const exercises: TemplateExercise[] = active.exercises.map((we) => ({
      exerciseId: we.exerciseId,
      exerciseName: we.name,
      muscleGroup: we.muscleGroup,
      notes: we.notes || undefined,
    }));
    if (exercises.length === 0) {
      showToast('ADD AN EXERCISE FIRST', colors.primary);
      return;
    }
    addTemplate(active.name.trim() || 'Template', exercises);
    showToast('SAVED AS TEMPLATE', colors.primary);
  };

  const handleFinish = () => {
    if (!nameValid) {
      showToast('NAME YOUR WORKOUT FIRST', colors.primary);
      return;
    }
    if (totalSets === 0) {
      showToast('LOG AT LEAST ONE EXERCISE', colors.primary);
      return;
    }
    if (!allSetsComplete) {
      showToast(`COMPLETE ALL SETS FIRST · ${doneSets}/${totalSets}`, colors.primary);
      return;
    }
    setConfirmFinish(true);
  };

  const doFinish = () => {
    setConfirmFinish(false);
    const summary = finishWorkout();
    if (summary) navigation.navigate('WorkoutComplete', { summary });
  };

  const onUpdateTemplate = () => {
    if (!sourceTpl) return;
    updateTemplate(sourceTpl.id, { exercises: toTemplateExercises() });
    showToast(`TEMPLATE UPDATED · ${sourceTpl.name.toUpperCase()}`, colors.primary);
  };

  const onSaveAsNewTemplate = () => {
    const name = saveAsName.trim();
    if (!name) return;
    addTemplate(name, toTemplateExercises());
    setSaveAsOpen(false);
    setSaveAsName('');
    showToast(`TEMPLATE SAVED · ${name.toUpperCase()}`, colors.primary);
  };

  const renderCard = (we: WorkoutExercise, label?: string) => (
    <WorkoutExerciseCard
      key={we.id}
      exercise={we}
      previousSets={previousMap[we.exerciseId]}
      supersetLabel={label}
      onAddSet={() => addSet(we.id)}
      onRemove={() => handleRemoveExercise(we.id)}
      onComplete={() => onCompleteExercise(we.id)}
      onNotesChange={(notes) => setExerciseNotes(we.id, notes)}
      onUpdateSet={(setId, patch) => updateSet(we.id, setId, patch)}
      onUpdateDuration={(setId, durationSec) => updateSetDuration(we.id, setId, durationSec)}
      onRemoveSet={(setId) => handleRemoveSet(we.id, setId)}
      onToggleDropSet={(setId) => toggleDropSet(we.id, setId)}
      onAddDropStage={(setId) => addDropStage(we.id, setId)}
      onUpdateDropStage={(setId, dropId, patch) => updateDropStage(we.id, setId, dropId, patch)}
      onRemoveDropStage={(setId, dropId) => removeDropStage(we.id, setId, dropId)}
    />
  );

  const renderGroup = (group: WorkoutExercise[]) => {
    const isSuperset = group.length > 1;
    const selectable = linkMode && !isSuperset;

    const body = isSuperset ? (
      <View style={styles.supersetGroup}>
        <View style={styles.supersetHeader}>
          <Text style={styles.supersetEyebrow}>SUPERSET</Text>
          <Pressable onPress={() => unlinkSuperset(group[0].supersetId!)} hitSlop={8}>
            <Text style={styles.unlinkText}>UNLINK</Text>
          </Pressable>
        </View>
        <View style={styles.supersetMembers}>
          {group.map((we, gi) => renderCard(we, `${supersetLetters[we.supersetId!]}${gi + 1}`))}
        </View>
      </View>
    ) : (
      renderCard(group[0])
    );

    const selected = selectable && linkSelected.includes(group[0].id);

    return (
      <View key={group[0].id} style={isDesktop ? styles.gridItem : styles.gridItemFull}>
        {body}
        {selectable ? (
          <Pressable
            onPress={() => toggleLinkSelect(group[0].id)}
            style={[StyleSheet.absoluteFill, styles.linkOverlay, selected && styles.linkOverlayOn]}
          >
            <View style={styles.linkCheck}>
              <Ionicons
                name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                size={26}
                color={selected ? colors.primary : colors.textFaint}
              />
            </View>
          </Pressable>
        ) : null}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={styles.page}>
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
          {ungroupedCount >= 2 && !linkMode ? (
            <Pressable onPress={() => setLinkMode(true)} hitSlop={8} style={styles.supersetBtn}>
              <Ionicons name="link" size={14} color={colors.primary} />
              <Text style={styles.supersetBtnText}>SUPERSET</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => setConfirmDiscard(true)} hitSlop={8} style={styles.closeBtn}>
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
              <View style={isDesktop ? styles.exerciseGrid : undefined}>
                {groups.map((g) => renderGroup(g))}
              </View>
              {!linkMode ? (
                <>
                  <PrimaryButton title="Add Exercise" icon="add" variant="secondary" size="md" fullWidth onPress={() => navigation.navigate('ExercisePicker')} />
                  {active.exercises.length > 0 ? (
                    <PrimaryButton title="Save as Template" icon="bookmark-outline" variant="ghost" size="md" fullWidth onPress={saveAsTemplate} />
                  ) : null}
                </>
              ) : null}
            </>
          )}
        </ScrollView>

        {undo ? (
          <Animated.View style={[styles.undoBar, { opacity: undoOpacity }]}>
            <Ionicons name="trash-outline" size={15} color={colors.textDim} />
            <Text style={styles.undoText} numberOfLines={1}>{undo.text}</Text>
            <Pressable
              onPress={doUndo}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Undo removal"
              style={({ pressed }) => [styles.undoBtn, pressed && styles.undoBtnPressed]}
            >
              <Ionicons name="arrow-undo" size={14} color={colors.bg} />
              <Text style={styles.undoBtnText}>UNDO</Text>
            </Pressable>
          </Animated.View>
        ) : null}

        {linkMode ? (
          <View style={styles.linkActionBar}>
            <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={cancelLink} style={styles.flex} />
            <PrimaryButton
              title={`Link as Superset${linkSelected.length ? ` (${linkSelected.length})` : ''}`}
              icon="link"
              size="md"
              onPress={confirmLink}
              disabled={linkSelected.length < 2}
              style={styles.flex}
            />
          </View>
        ) : (
          <View style={styles.footer}>
            {templateExercisesChanged ? (
              <>
                <Text style={styles.tplSyncLabel}>YOU CHANGED THIS TEMPLATE’S EXERCISES</Text>
                <View style={styles.tplSyncRow}>
                  <PrimaryButton title="Update Template" variant="secondary" size="sm" onPress={onUpdateTemplate} style={styles.flex} />
                  <PrimaryButton title="Save as New" variant="secondary" size="sm" onPress={() => setSaveAsOpen(true)} style={styles.flex} />
                </View>
              </>
            ) : null}
            <PrimaryButton
              title="Finish Workout"
              icon="flag"
              onPress={handleFinish}
              fullWidth
              disabled={!allSetsComplete || !nameValid}
            />
          </View>
        )}
      </KeyboardAvoidingView>
      </PageWidth>

      {/* Confirm before discarding — a custom modal, since RN's Alert is a no-op on web. */}
      <Modal visible={confirmDiscard} transparent animationType="fade" onRequestClose={() => setConfirmDiscard(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDiscard(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>DISCARD WORKOUT</Text>
            <Text style={styles.confirmName}>{active.name.trim() ? active.name.toUpperCase() : 'CURRENT SESSION'}</Text>
            <Text style={styles.confirmCopy}>This will delete your current session. This can't be undone.</Text>
            <View style={styles.confirmActions}>
              <PrimaryButton title="Keep training" variant="secondary" size="md" onPress={() => setConfirmDiscard(false)} style={styles.flex} />
              <PrimaryButton
                title="Discard"
                variant="danger"
                size="md"
                onPress={() => {
                  setConfirmDiscard(false);
                  discardWorkout();
                }}
                style={styles.flex}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Confirm before finishing the workout. */}
      <Modal visible={confirmFinish} transparent animationType="fade" onRequestClose={() => setConfirmFinish(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmFinish(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>FINISH WORKOUT</Text>
            <Text style={styles.confirmName}>{active.name.trim() ? active.name.toUpperCase() : 'THIS SESSION'}</Text>
            <Text style={styles.confirmCopy}>
              {doneSets} {doneSets === 1 ? 'set' : 'sets'} logged across {active.exercises.length}{' '}
              {active.exercises.length === 1 ? 'exercise' : 'exercises'}. Save this workout?
            </Text>
            <View style={styles.confirmActions}>
              <PrimaryButton title="Keep going" variant="secondary" size="md" onPress={() => setConfirmFinish(false)} style={styles.flex} />
              <PrimaryButton title="Finish" icon="flag" size="md" onPress={doFinish} style={styles.flex} />
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Save the modified exercise list as a new template. */}
      <Modal visible={saveAsOpen} transparent animationType="fade" onRequestClose={() => setSaveAsOpen(false)}>
        <Pressable style={styles.confirmBackdrop} onPress={() => setSaveAsOpen(false)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <Text style={styles.confirmKicker}>SAVE AS NEW TEMPLATE</Text>
            <TextInput
              value={saveAsName}
              onChangeText={setSaveAsName}
              placeholder="Template name"
              placeholderTextColor={colors.textFaint}
              style={styles.saveAsInput}
              autoFocus
              maxLength={28}
              returnKeyType="done"
              onSubmitEditing={onSaveAsNewTemplate}
            />
            <View style={styles.confirmActions}>
              <PrimaryButton title="Cancel" variant="secondary" size="md" onPress={() => setSaveAsOpen(false)} style={styles.flex} />
              <PrimaryButton title="Save" icon="checkmark" size="md" onPress={onSaveAsNewTemplate} disabled={!saveAsName.trim()} style={styles.flex} />
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
  pageDesktop: { paddingHorizontal: spacing.xxl },
  flex: { flex: 1 },

  // Pre-start
  preStartScroll: { width: '100%', alignItems: 'center', paddingBottom: spacing.xxl },
  desktopGrid: { flexDirection: 'row', gap: spacing.xxxl, alignItems: 'flex-start' },
  mainCol: { flex: 1, minWidth: 0 },
  sideCol: { width: 360 },
  head: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  headTitle: { color: colors.text, fontFamily: family.display, fontSize: font.display, lineHeight: Math.ceil(font.display * 1.15), letterSpacing: 1, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.2, marginTop: 2 },

  actions: { paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.xl },
  actionBtn: { width: '100%' },

  templatesArea: { marginTop: spacing.xl },
  templatesLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.6, paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  templatesEmpty: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, lineHeight: 18, paddingHorizontal: spacing.lg, maxWidth: 280 },
  templatesList: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  templatesGrid: { paddingHorizontal: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tplRowDesktop: { width: '48%' },
  tplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tplRowPressed: { borderColor: colors.borderStrong, backgroundColor: colors.card2 },
  tplRowName: { color: colors.text, fontFamily: family.display, fontSize: font.h3, lineHeight: Math.ceil(font.h3 * 1.15), letterSpacing: 0.5, includeFontPadding: false },
  tplRowMeta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6, marginTop: 2 },
  tplRowEdit: { width: 34, height: 34, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },

  // Confirm-from-template dialog
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
  confirmMeta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, marginTop: 4 },
  confirmCopy: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, lineHeight: 21, marginTop: spacing.lg },
  confirmActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xl },

  // Start chooser
  chooserEmptyBtn: { marginTop: spacing.xl },
  chooserLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1.4, marginTop: spacing.xl, marginBottom: spacing.md },
  chooserList: { maxHeight: 240 },
  chooserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  chooserName: { color: colors.text, fontFamily: family.display, fontSize: font.h3, lineHeight: Math.ceil(font.h3 * 1.15), letterSpacing: 0.5, includeFontPadding: false },
  chooserMeta: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.6, marginTop: 2 },
  chooserNoTpl: { color: colors.textFaint, fontFamily: family.body, fontSize: font.small, lineHeight: 18, marginTop: spacing.xl },

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
  supersetBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 36, paddingHorizontal: spacing.md, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primaryDim },
  supersetBtnText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
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
  tplSyncLabel: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, textAlign: 'center', marginBottom: spacing.sm },
  tplSyncRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  saveAsInput: {
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 50,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.body,
    marginTop: spacing.lg,
  },

  // Desktop exercise grid
  exerciseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg },
  gridItem: { width: '48%', marginBottom: spacing.lg, position: 'relative' },
  gridItemFull: { marginBottom: spacing.lg, position: 'relative' },

  // Superset grouping
  supersetGroup: {
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.md,
    backgroundColor: colors.primaryDim,
  },
  supersetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  supersetEyebrow: { color: colors.primary, fontFamily: family.bold, fontSize: font.tiny, letterSpacing: 1.6 },
  unlinkText: { color: colors.textDim, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 0.8 },
  supersetMembers: { gap: spacing.md },

  // Superset link-select mode
  linkOverlay: {
    borderRadius: radius.md,
    backgroundColor: 'transparent',
    alignItems: 'flex-end',
    padding: spacing.sm,
  },
  linkOverlayOn: { backgroundColor: colors.overlay, borderWidth: 2, borderColor: colors.primary },
  linkCheck: { backgroundColor: colors.bg, borderRadius: radius.pill },
  linkActionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },

  // Undo bar
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.card,
  },
  undoText: { flex: 1, color: colors.textDim, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 0.8 },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.xs,
    backgroundColor: colors.primary,
  },
  undoBtnPressed: { opacity: 0.85 },
  undoBtnText: { color: colors.bg, fontFamily: family.bold, fontSize: font.tiny, letterSpacing: 1 },
});
