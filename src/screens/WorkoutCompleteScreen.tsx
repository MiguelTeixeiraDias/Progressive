import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KPICard, MuscleGroupBadge, PageWidth, PersonalBestBadge, PrimaryButton } from '../components';
import { RootStackScreenProps } from '../navigation/types';
import { colors, family, font, layout, radius, spacing } from '../theme';
import { formatDuration, formatWeight, signedPct } from '../utils/format';

export default function WorkoutCompleteScreen({ route, navigation }: RootStackScreenProps<'WorkoutComplete'>) {
  const s = route.params.summary;
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
  message: { color: colors.textDim, fontFamily: family.body, fontSize: font.body, textAlign: 'center', marginTop: spacing.xxl, lineHeight: 22, paddingHorizontal: spacing.md },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
});
