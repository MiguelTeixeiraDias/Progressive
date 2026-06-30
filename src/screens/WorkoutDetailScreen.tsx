import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState, MuscleGroupBadge, PageWidth, PrimaryButton } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { fullDate } from '../utils/date';
import { formatClock, formatDuration, formatVolume } from '../utils/format';
import { exerciseVolume, sessionSetCount, setVolume } from '../utils/stats';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function StatPill({ icon, value, accent }: { icon: IconName; value: string; accent: string }) {
  return (
    <View style={styles.pill}>
      <Ionicons name={icon} size={14} color={accent} />
      <Text style={[styles.pillText, { color: accent }]}>{value}</Text>
    </View>
  );
}

export default function WorkoutDetailScreen({ route, navigation }: RootStackScreenProps<'WorkoutDetail'>) {
  const { sessionId } = route.params;
  const workouts = useStore((s) => s.workouts);
  const startWorkoutFrom = useStore((s) => s.startWorkoutFrom);
  const session = workouts.find((w) => w.id === sessionId);

  if (!session) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <PageWidth style={styles.page}>
          <View style={styles.header}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textDim} />
            </Pressable>
          </View>
          <EmptyState icon="alert-circle-outline" title="Workout not found" />
        </PageWidth>
      </SafeAreaView>
    );
  }

  const repeat = () => {
    if (startWorkoutFrom(session.id)) navigation.navigate('Tabs', { screen: 'Workout' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <PageWidth style={styles.page}>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{session.name.toUpperCase()}</Text>
          <Text style={styles.date}>{fullDate(session.startedAt).toUpperCase()}</Text>
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color={colors.textDim} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.statsBar}>
          <StatPill icon="time-outline" value={formatDuration(session.durationSec)} accent={colors.text} />
          <StatPill icon="barbell-outline" value={`${formatVolume(session.totalVolume)} KG`} accent={colors.primary} />
          <StatPill icon="layers-outline" value={`${sessionSetCount(session, true)} SETS`} accent={colors.text} />
        </View>

        {session.exercises.map((we) => (
          <View key={we.id} style={styles.card}>
            <View style={styles.exHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{we.name}</Text>
                <View style={{ marginTop: 6, flexDirection: 'row' }}>
                  <MuscleGroupBadge group={we.muscleGroup} size="sm" />
                </View>
              </View>
              <Text style={styles.exVolume}>{formatVolume(exerciseVolume(we, true))} KG</Text>
            </View>

            {we.notes ? (
              <View style={styles.noteBox}>
                <Ionicons name="chatbox-ellipses-outline" size={14} color={colors.textDim} />
                <Text style={styles.noteText}>{we.notes}</Text>
              </View>
            ) : null}

            <View style={styles.sets}>
              {we.sets.map((s, i) => {
                const isCardio = we.muscleGroup === 'Cardio';
                return (
                  <View key={s.id}>
                    <View style={styles.setRow}>
                      <View style={styles.setBadge}>
                        <Text style={styles.setBadgeText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.setMain}>
                        {isCardio ? formatClock(s.durationSec ?? 0) : `${s.weight}kg × ${s.reps}`}
                      </Text>
                      {!isCardio ? <Text style={styles.setVol}>{formatVolume(setVolume(s))} kg</Text> : null}
                    </View>
                    {s.drops?.length ? (
                      <Text style={styles.dropsLine}>
                        ↳ DROPS · {s.drops.map((d) => `${d.weight}kg×${d.reps}`).join(', ')}
                      </Text>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Repeat Workout" icon="refresh" onPress={repeat} fullWidth />
      </View>
      </PageWidth>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  title: { color: colors.text, fontFamily: family.display, fontSize: font.h1, lineHeight: Math.ceil(font.h1 * 1.15), letterSpacing: 0.5, includeFontPadding: false },
  date: { color: colors.textDim, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, marginTop: 4 },
  closeBtn: { width: 36, height: 36, borderRadius: radius.sm, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  statsBar: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
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
  card: { backgroundColor: colors.card, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg, gap: spacing.md },
  exHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  exName: { color: colors.text, fontFamily: family.semibold, fontSize: font.h3 },
  exVolume: { color: colors.textDim, fontFamily: family.medium, fontSize: font.small },
  noteBox: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    alignItems: 'flex-start',
  },
  noteText: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, flex: 1, fontStyle: 'italic', lineHeight: 18 },
  sets: { gap: spacing.sm },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  setBadge: { width: 24, height: 24, borderRadius: radius.xs, backgroundColor: colors.card3, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  setBadgeText: { color: colors.text, fontFamily: family.display, fontSize: font.label, includeFontPadding: false },
  setMain: { color: colors.text, fontFamily: family.medium, fontSize: font.lg, flex: 1 },
  setVol: { color: colors.textDim, fontFamily: family.body, fontSize: font.small },
  dropsLine: { color: colors.textFaint, fontFamily: family.body, fontSize: font.tiny, marginTop: 4, marginLeft: 36 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
});
