import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { SetEntry } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import Stepper from './Stepper';

interface SetRowProps {
  index: number;
  set: SetEntry;
  previousHint?: string | null;
  onChange: (patch: Partial<Pick<SetEntry, 'reps' | 'weight'>>) => void;
  onToggleComplete: () => void;
  onRemove?: () => void;
}

/** Compact, structured set row. Completed sets gain an acid-lime left indicator. */
function SetRow({ index, set, previousHint, onChange, onToggleComplete, onRemove }: SetRowProps) {
  const done = set.completed;
  const anim = useRef(new Animated.Value(done ? 1 : 0)).current;

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
        {onRemove && !done ? (
          <Pressable onPress={onRemove} hitSlop={8} style={styles.remove}>
            <Ionicons name="trash-outline" size={15} color={colors.textFaint} />
          </Pressable>
        ) : null}
        <Pressable
          onPress={onToggleComplete}
          hitSlop={6}
          style={({ pressed }) => [styles.check, done && styles.checkDone, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name={done ? 'checkmark' : 'checkmark-outline'} size={20} color={done ? colors.bg : colors.textFaint} />
        </Pressable>
      </View>

      <View style={styles.controls}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>WEIGHT · KG</Text>
          <Stepper value={set.weight} onChange={(weight) => onChange({ weight })} step={2.5} decimal size="sm" />
        </View>
        <View style={styles.divider} />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>REPS</Text>
          <Stepper value={set.reps} onChange={(reps) => onChange({ reps })} step={1} size="sm" />
        </View>
      </View>
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
  check: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  controls: { flexDirection: 'row', alignItems: 'flex-end' },
  field: { flex: 1, alignItems: 'center', gap: 6 },
  divider: { width: 1, height: 36, backgroundColor: colors.border, marginHorizontal: spacing.sm },
  fieldLabel: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1 },
});
