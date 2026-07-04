import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { DropStage, SetEntry } from '../types';
import { useStore } from '../store/useStore';
import { colors, family, font, radius, spacing } from '../theme';
import { formatClock } from '../utils/format';
import Stepper from './Stepper';

interface SetRowProps {
  index: number;
  set: SetEntry;
  /** Cardio exercises log a timed effort instead of weight/reps. */
  cardio?: boolean;
  previousHint?: string | null;
  onChange: (patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => void;
  onChangeDuration?: (durationSec: number) => void;
  onRemove?: () => void;
  onToggleDropSet?: () => void;
  onAddDropStage?: () => void;
  onUpdateDropStage?: (dropId: string, patch: Partial<Pick<DropStage, 'reps' | 'weight'>>) => void;
  onRemoveDropStage?: (dropId: string) => void;
}

/** Compact, structured set row. Completed sets gain an acid-lime left indicator.
 *  Completion is now driven by the exercise-level "Complete Exercise" button. */
function SetRow({
  index,
  set,
  cardio,
  previousHint,
  onChange,
  onChangeDuration,
  onRemove,
  onToggleDropSet,
  onAddDropStage,
  onUpdateDropStage,
  onRemoveDropStage,
}: SetRowProps) {
  const unit = useStore((s) => s.settings.unit);
  const done = set.completed;
  const anim = useRef(new Animated.Value(done ? 1 : 0)).current;
  const isDropSet = !!set.drops;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: done ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
  }, [done, anim]);

  const borderColor = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.primary],
  });

  // Stopwatch for cardio sets — ticks once a second while running. A ref keeps
  // the running total so the interval never reads a stale closure value.
  const [running, setRunning] = useState(false);
  const durationRef = useRef(set.durationSec ?? 0);
  useEffect(() => {
    durationRef.current = set.durationSec ?? 0;
  }, [set.durationSec]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      durationRef.current += 1;
      onChangeDuration?.(durationRef.current);
    }, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const adjustDuration = (delta: number) => {
    const next = Math.max(0, (set.durationSec ?? 0) + delta);
    durationRef.current = next;
    onChangeDuration?.(next);
  };

  return (
    <Animated.View style={[styles.card, { borderColor }, done && styles.cardDone]}>
      <Animated.View style={[styles.leftBar, { opacity: anim }]} />

      <View style={styles.top}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{index}</Text>
        </View>
        <Text style={styles.hint} numberOfLines={1}>
          {previousHint ? `LAST · ${previousHint}` : 'FIRST TIME — SET A BASELINE'}
        </Text>
        {done ? <Text style={styles.doneTag}>DONE</Text> : null}
        {!cardio && onToggleDropSet ? (
          <Pressable
            onPress={onToggleDropSet}
            hitSlop={8}
            style={[styles.dropToggle, isDropSet && styles.dropToggleOn]}
          >
            <Ionicons name="flash" size={12} color={isDropSet ? colors.bg : colors.primary} />
            <Text style={[styles.dropToggleText, isDropSet && styles.dropToggleTextOn]}>DROP SET</Text>
          </Pressable>
        ) : null}
        {onRemove && !done ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.remove}>
            <Ionicons name="trash-outline" size={15} color={colors.textFaint} />
          </Pressable>
        ) : null}
      </View>

      {cardio ? (
        <View style={styles.cardioRow}>
          <Pressable onPress={() => adjustDuration(-5)} hitSlop={6} style={styles.timeAdjust}>
            <Ionicons name="remove" size={16} color={colors.text} />
          </Pressable>
          <Text style={styles.clock}>{formatClock(set.durationSec ?? 0)}</Text>
          <Pressable onPress={() => adjustDuration(5)} hitSlop={6} style={styles.timeAdjust}>
            <Ionicons name="add" size={16} color={colors.text} />
          </Pressable>
          <Pressable
            onPress={() => setRunning((r) => !r)}
            style={[styles.timerBtn, running && styles.timerBtnActive]}
          >
            <Ionicons name={running ? 'pause' : 'play'} size={18} color={running ? colors.bg : colors.primary} />
          </Pressable>
        </View>
      ) : (
        <>
          <View style={styles.controls}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>WEIGHT · {unit.toUpperCase()}</Text>
              <Stepper value={set.weight} onChange={(weight) => onChange({ weight })} step={2.5} decimal size="sm" />
            </View>
            <View style={styles.divider} />
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>REPS</Text>
              <Stepper value={set.reps} onChange={(reps) => onChange({ reps })} step={1} size="sm" />
            </View>
          </View>

          {isDropSet ? (
            <View style={styles.drops}>
              {set.drops!.map((stage, i) => (
                <View key={stage.id} style={styles.dropRow}>
                  <Text style={styles.dropIndex}>↳{i + 1}</Text>
                  <View style={styles.dropField}>
                    <Stepper
                      value={stage.weight}
                      onChange={(weight) => onUpdateDropStage?.(stage.id, { weight })}
                      step={2.5}
                      decimal
                      size="sm"
                    />
                  </View>
                  <View style={styles.dropField}>
                    <Stepper
                      value={stage.reps}
                      onChange={(reps) => onUpdateDropStage?.(stage.id, { reps })}
                      step={1}
                      size="sm"
                    />
                  </View>
                  <Pressable onPress={() => onRemoveDropStage?.(stage.id)} hitSlop={8} style={styles.dropRemove}>
                    <Ionicons name="close" size={14} color={colors.textFaint} />
                  </Pressable>
                </View>
              ))}
              <Pressable onPress={onAddDropStage} style={styles.addDrop}>
                <Ionicons name="add" size={14} color={colors.primary} />
                <Text style={styles.addDropText}>ADD DROP</Text>
              </Pressable>
            </View>
          ) : null}
        </>
      )}
    </Animated.View>
  );
}

export default React.memo(SetRow);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.md,
    paddingLeft: spacing.lg,
    gap: spacing.md,
    overflow: 'hidden',
  },
  cardDone: { backgroundColor: colors.primaryDim },
  leftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: colors.primary,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  badge: {
    width: 24,
    height: 24,
    borderRadius: radius.xs,
    backgroundColor: colors.card3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: colors.text, fontFamily: family.display, fontSize: font.label, includeFontPadding: false },
  hint: { flex: 1, color: colors.textFaint, fontFamily: family.body, fontSize: font.tiny, letterSpacing: 0.6 },
  remove: { padding: 4 },
  dropToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.xs,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dropToggleOn: { backgroundColor: colors.primary },
  dropToggleText: { color: colors.primary, fontFamily: family.bold, fontSize: font.tiny, letterSpacing: 0.8 },
  dropToggleTextOn: { color: colors.bg },
  doneTag: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
  controls: { flexDirection: 'row', alignItems: 'flex-end' },
  field: { flex: 1, alignItems: 'center', gap: 6 },
  divider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  fieldLabel: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1 },

  // Cardio stopwatch
  cardioRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  clock: { color: colors.text, fontFamily: family.display, fontSize: 32, includeFontPadding: false, minWidth: 96, textAlign: 'center' },
  timeAdjust: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.card3,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing.sm,
  },
  timerBtnActive: { backgroundColor: colors.primary },

  // Drop-set stages
  drops: { gap: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.border },
  dropRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dropIndex: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, width: 18 },
  dropField: { flex: 1 },
  dropRemove: { padding: 4 },
  addDrop: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: 4 },
  addDropText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.tiny, letterSpacing: 1 },
});
