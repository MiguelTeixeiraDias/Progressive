import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MuscleGroup, WorkoutSession } from '../types';
import { colors, family, font, spacing } from '../theme';
import { relativeDay } from '../utils/date';
import { formatDuration, signedPct } from '../utils/format';
import { sessionSetCount } from '../utils/stats';
import Card from './Card';
import MuscleGroupBadge from './MuscleGroupBadge';
import PrimaryButton from './PrimaryButton';

interface WorkoutSummaryCardProps {
  session: WorkoutSession;
  /** Average per-exercise % increase vs previous logging; null = not enough data. */
  pctIncrease?: number | null;
  onPress?: () => void;
  onRepeat?: () => void;
}

function Stat({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function WorkoutSummaryCard({ session, pctIncrease = null, onPress, onRepeat }: WorkoutSummaryCardProps) {
  const groups = Array.from(new Set(session.exercises.map((e) => e.muscleGroup))) as MuscleGroup[];
  const shown = groups.slice(0, 4);
  const extra = groups.length - shown.length;

  const hasPct = pctIncrease !== null && isFinite(pctIncrease);
  const pctColor = hasPct ? (pctIncrease >= 0 ? colors.primary : colors.text) : colors.textDim;

  return (
    <Card onPress={onPress} style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.name} numberOfLines={1}>
            {session.name.toUpperCase()}
          </Text>
          <Text style={styles.date}>{relativeDay(session.startedAt).toUpperCase()}</Text>
        </View>
        <View style={styles.durationPill}>
          <Ionicons name="time-outline" size={13} color={colors.textDim} />
          <Text style={styles.durationText}>{formatDuration(session.durationSec)}</Text>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat
          value={hasPct ? signedPct(pctIncrease) : '—'}
          label={hasPct ? 'INCREASE' : 'NO COMPARISON'}
          color={pctColor}
        />
        <View style={styles.statDivider} />
        <Stat value={`${sessionSetCount(session, true)}`} label="SETS" />
        <View style={styles.statDivider} />
        <Stat value={`${session.exercises.length}`} label="EXERCISES" />
      </View>

      {shown.length > 0 ? (
        <View style={styles.muscles}>
          {shown.map((g) => (
            <MuscleGroupBadge key={g} group={g} size="sm" />
          ))}
          {extra > 0 ? <Text style={styles.extra}>+{extra}</Text> : null}
        </View>
      ) : null}

      {onRepeat ? (
        <PrimaryButton title="Repeat Workout" icon="refresh" variant="secondary" size="md" fullWidth onPress={onRepeat} />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerText: { flex: 1 },
  name: { color: colors.text, fontFamily: family.display, fontSize: font.h2, lineHeight: Math.ceil(font.h2 * 1.15), letterSpacing: 0.8, includeFontPadding: false },
  date: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, marginTop: 2 },
  durationPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  durationText: { color: colors.textDim, fontFamily: family.medium, fontSize: font.small },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'flex-start' },
  statValue: { color: colors.text, fontFamily: family.display, fontSize: 30, lineHeight: 35, includeFontPadding: false },
  statLabel: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8, marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.border, marginHorizontal: spacing.md },
  muscles: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  extra: { color: colors.textDim, fontFamily: family.medium, fontSize: font.small },
});
