import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { WorkoutSession } from '../types';
import { colors, family, font, radius, spacing } from '../theme';
import { dayKey } from '../utils/date';
import { currentStreak, currentWeekProgress, uniqueWorkoutDays, weekStreak } from '../utils/stats';

interface StreakCalendarModalProps {
  visible: boolean;
  onClose: () => void;
  sessions: WorkoutSession[];
  /** Weekly workout-day target from settings; defaults to 3 when unset. */
  weeklyGoal?: number;
}

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Calendar of logged training days with current + longest streak. Streaks are
 * derived from unique workout days, so multiple sessions in one day count once.
 */
export default function StreakCalendarModal({
  visible,
  onClose,
  sessions,
  weeklyGoal,
}: StreakCalendarModalProps) {
  const [monthOffset, setMonthOffset] = useState(0);

  const stats = useMemo(() => {
    const days = new Set(uniqueWorkoutDays(sessions));
    return {
      days,
      streak: currentStreak(sessions),
      weekStreak: weekStreak(sessions, weeklyGoal),
      week: currentWeekProgress(sessions, weeklyGoal),
    };
  }, [sessions, weeklyGoal]);

  const view = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const lead = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const todayKey = dayKey(Date.now());

    const cells: ({ day: number; logged: boolean; today: boolean } | null)[] = [];
    for (let i = 0; i < lead; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = dayKey(new Date(year, month, d));
      cells.push({ day: d, logged: stats.days.has(key), today: key === todayKey });
    }
    while (cells.length % 7 !== 0) cells.push(null);

    return { year, month, cells };
  }, [monthOffset, stats.days]);

  const week = stats.week;
  const weekStatus = week.met ? 'GOAL MET' : `${Math.max(0, week.goal - week.done)} SHORT`;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.handleWrap}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            <View>
              <Text style={styles.kicker}>CONSISTENCY</Text>
              <Text style={styles.title}>TRAINING CALENDAR</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color={colors.textDim} />
            </Pressable>
          </View>

          <View style={styles.statRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.streak}</Text>
              <Text style={styles.statLabel}>DAY STREAK</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{stats.weekStreak}</Text>
              <Text style={styles.statLabel}>WEEK STREAK</Text>
            </View>
          </View>

          <View style={styles.bestRun}>
            <Ionicons name={week.met ? 'checkmark-circle' : 'flame'} size={14} color={colors.primary} />
            <Text style={styles.bestRunText}>
              {week.done}/{week.goal} THIS WEEK · {weekStatus}
            </Text>
          </View>

          <View style={styles.calHeader}>
            <Pressable onPress={() => setMonthOffset((o) => o - 1)} hitSlop={10} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={18} color={colors.textDim} />
            </Pressable>
            <Text style={styles.monthLabel}>
              {MONTHS[view.month].toUpperCase()} {view.year}
            </Text>
            <Pressable
              onPress={() => setMonthOffset((o) => Math.min(0, o + 1))}
              hitSlop={10}
              style={[styles.navBtn, monthOffset >= 0 && styles.navBtnDisabled]}
              disabled={monthOffset >= 0}
            >
              <Ionicons name="chevron-forward" size={18} color={colors.textDim} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <Text key={i} style={styles.weekday}>
                {w}
              </Text>
            ))}
          </View>

          <View style={styles.grid}>
            {view.cells.map((cell, i) => (
              <View key={i} style={styles.cell}>
                {cell ? (
                  <View
                    style={[
                      styles.dayDot,
                      cell.logged && styles.dayLogged,
                      cell.today && !cell.logged && styles.dayToday,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        cell.logged && styles.dayTextLogged,
                      ]}
                    >
                      {cell.day}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>

          <View style={styles.legend}>
            <View style={[styles.legendDot, styles.dayLogged]} />
            <Text style={styles.legendText}>Logged a workout</Text>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bgElevated,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  handleWrap: { alignItems: 'center', paddingVertical: spacing.md },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.borderStrong },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  kicker: { color: colors.primary, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 2 },
  title: {
    color: colors.text,
    fontFamily: family.display,
    fontSize: font.h1,
    lineHeight: Math.ceil(font.h1 * 1.15),
    letterSpacing: 1,
    includeFontPadding: false,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.card3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingVertical: spacing.lg,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: {
    color: colors.primary,
    fontFamily: family.display,
    fontSize: 44,
    lineHeight: 51,
    includeFontPadding: false,
  },
  statLabel: { color: colors.textFaint, fontFamily: family.medium, fontSize: font.tiny, letterSpacing: 1, marginTop: 2 },
  statDivider: { width: 1, height: 40, backgroundColor: colors.border },
  bestRun: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim,
  },
  bestRunText: { color: colors.primary, fontFamily: family.semibold, fontSize: font.small, letterSpacing: 0.8 },
  calHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  navBtn: { padding: 4 },
  navBtnDisabled: { opacity: 0.25 },
  monthLabel: { color: colors.text, fontFamily: family.semibold, fontSize: font.label, letterSpacing: 1.4 },
  weekRow: { flexDirection: 'row', marginBottom: spacing.sm },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: colors.textFaint,
    fontFamily: family.medium,
    fontSize: font.tiny,
    letterSpacing: 0.5,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 3 },
  dayDot: {
    width: '100%',
    height: '100%',
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayLogged: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayToday: { borderColor: colors.borderStrong },
  dayText: { color: colors.textDim, fontFamily: family.medium, fontSize: font.small },
  dayTextLogged: { color: colors.bg, fontFamily: family.semibold },
  legend: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  legendDot: { width: 14, height: 14, borderRadius: radius.xs },
  legendText: { color: colors.textDim, fontFamily: family.body, fontSize: font.small },
});
