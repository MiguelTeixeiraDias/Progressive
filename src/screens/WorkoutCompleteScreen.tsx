import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KPICard, MuscleGroupBadge, PageWidth, PersonalBestBadge, PrimaryButton } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { useStore } from '../store/useStore';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { formatClock, formatDuration, formatWeight, signedPct } from '../utils/format';

export default function WorkoutCompleteScreen({ route, navigation }: RootStackScreenProps<'WorkoutComplete'>) {
  const s = route.params.summary;
  // Pull the just-saved session so we can show exactly what was logged, not just
  // the aggregate stats — otherwise finishing feels like it only recorded "a
  // workout happened" without the exercises and sets behind it.
  const session = useStore((st) => st.workouts.find((w) => w.id === s.sessionId));
  // Reset the root stack to a fresh Tabs route so the completion screen never
  // lingers underneath the tabs. Without this, navigating back leaves
  // WorkoutComplete in the stack and every later screen reads as a modal stacked
  // on top of it (the swipe-down-returns-to-complete bug). A bare Tabs route lets
  // the tab navigator re-initialise with all tabs at its default Home screen.
  const goHome = () => navigation.reset({ index: 0, routes: [{ name: 'Tabs' }] });

  const message =
    s.newPRs.length > 0
      ? 'New records on the board. This is what progress looks like.'
      : s.volumeChangePct !== null && s.volumeChangePct > 0
        ? 'Stronger than last time. Keep stacking clean sessions.'
        : 'Logged and locked in. Consistency is the whole game.';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <PageWidth style={styles.page}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.mark}>
          <Ionicons name="checkmark" size={46} color={colors.bg} />
        </View>
        <Text style={styles.kicker}>SESSION LOGGED</Text>
        <Text style={styles.title}>WORKOUT COMPLETE</Text>
        <Text style={styles.subtitle}>{s.name.toUpperCase()}</Text>

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <KPICard style={styles.gridItem} label="Duration" value={formatDuration(s.durationSec)} />
            <KPICard
              style={styles.gridItem}
              label="Increase"
              value={s.volumeChangePct === null ? '—' : signedPct(s.volumeChangePct)}
              accent={s.volumeChangePct !== null && s.volumeChangePct >= 0 ? colors.primary : colors.text}
              caption="VS LAST SESSION"
            />
          </View>
          <View style={styles.gridRow}>
            <KPICard style={styles.gridItem} label="Sets" value={s.totalSets} countUp />
            <KPICard style={styles.gridItem} label="Exercises" value={s.exerciseCount} countUp />
          </View>
        </View>

        {s.muscleGroups.length > 0 ? (
          <View style={styles.muscles}>
            {s.muscleGroups.map((g) => (
              <MuscleGroupBadge key={g} group={g} />
            ))}
          </View>
        ) : null}

        {s.volumeChangePct !== null && s.volumeChangePct > 0 ? (
          <View style={styles.banner}>
            <Ionicons name="arrow-up" size={16} color={colors.primary} />
            <Text style={styles.bannerText}>UP {signedPct(s.volumeChangePct)} VS LAST SESSION</Text>
          </View>
        ) : null}

        {s.newPRs.length > 0 ? (
          <View style={styles.prSection}>
            <Text style={styles.prTitle}>NEW PERSONAL RECORDS</Text>
            <View style={{ gap: spacing.sm }}>
              {s.newPRs.map((pr, i) => (
                <PersonalBestBadge
                  key={`${pr.exerciseName}-${i}`}
                  title={pr.exerciseName}
                  value={`${formatWeight(pr.weight)} kg`}
                  caption={`${pr.reps} reps · e1RM ${formatWeight(pr.e1rm)} kg`}
                />
              ))}
            </View>
          </View>
        ) : null}

        {session && session.exercises.length > 0 ? (
          <View style={styles.logSection}>
            <Text style={styles.logTitle}>WHAT YOU LOGGED</Text>
            <View style={styles.logList}>
              {session.exercises.map((we) => {
                const cardio = we.muscleGroup === 'Cardio';
                return (
                  <View key={we.id} style={styles.logRow}>
                    <View style={styles.logHead}>
                      <Text style={styles.logName} numberOfLines={1}>{we.name}</Text>
                      <Text style={styles.logCount}>
                        {we.sets.length} {we.sets.length === 1 ? 'SET' : 'SETS'}
                      </Text>
                    </View>
                    <Text style={styles.logSets}>
                      {cardio
                        ? we.sets.map((set) => formatClock(set.durationSec ?? 0)).join('   ·   ')
                        : we.sets.map((set) => `${formatWeight(set.weight)}kg × ${set.reps}`).join('   ·   ')}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <Text style={styles.message}>{message}</Text>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton title="Back to Home" icon="home" onPress={goHome} fullWidth />
      </View>
      </PageWidth>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg, alignItems: 'center' },
  page: { flex: 1, width: '100%', maxWidth: layout.formMaxWidth },
  content: { paddingHorizontal: spacing.lg, paddingTop: spacing.xxl, paddingBottom: spacing.xl, alignItems: 'center' },
  mark: {
    width: 88,
    height: 88,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2, marginTop: spacing.xl },
  title: { color: colors.text, fontFamily: family.display, fontSize: 44, lineHeight: 51, letterSpacing: 1, marginTop: 4, includeFontPadding: false },
  subtitle: { color: colors.textDim, fontFamily: family.medium, fontSize: font.label, letterSpacing: 1.5, marginTop: 2 },
  grid: { width: '100%', gap: spacing.md, marginTop: spacing.xxl },
  gridRow: { flexDirection: 'row', gap: spacing.md },
  gridItem: { flex: 1 },
  muscles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.xl },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xl,
  },
  bannerText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.small, letterSpacing: 0.8, flex: 1 },
  prSection: { width: '100%', marginTop: spacing.xxl },
  prTitle: { color: colors.text, fontFamily: family.display, fontSize: font.h3, lineHeight: Math.ceil(font.h3 * 1.15), letterSpacing: 1, marginBottom: spacing.md, includeFontPadding: false },

  // What-you-logged breakdown
  logSection: { width: '100%', marginTop: spacing.xxl },
  logTitle: { color: colors.text, fontFamily: family.display, fontSize: font.h3, lineHeight: Math.ceil(font.h3 * 1.15), letterSpacing: 1, marginBottom: spacing.md, includeFontPadding: false },
  logList: { gap: spacing.sm },
  logRow: {
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 4,
  },
  logHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  logName: { flex: 1, color: colors.text, fontFamily: family.semibold, fontSize: font.body },
  logCount: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 0.8 },
  logSets: { color: colors.textDim, fontFamily: family.body, fontSize: font.small, lineHeight: 19 },
  message: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, textAlign: 'center', marginTop: spacing.xxl, lineHeight: 22, paddingHorizontal: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
