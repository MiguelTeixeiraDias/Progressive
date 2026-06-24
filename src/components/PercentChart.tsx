import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, family, font, radius } from '../theme';
import { withAlpha } from '../utils/color';
import type { PctPoint } from '../utils/stats';

interface PercentChartProps {
  data: PctPoint[];
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Signed editorial bar chart for daily progressive-overload percentage. Positive
 * days grow up from a centre baseline in acid-lime; negative days grow down in
 * muted bone; days without comparison data show a faint stub on the baseline.
 */
export default function PercentChart({ data, height = 120, style }: PercentChartProps) {
  const maxAbs = Math.max(8, ...data.map((d) => Math.abs(d.pct ?? 0)));
  const half = height / 2;
  const span = half - 6; // keep bars off the top/bottom edges

  return (
    <View style={style}>
      <View style={[styles.plot, { height }]}>
        <View style={[styles.baseline, { top: half }]} />
        {data.map((d, i) => {
          const hasData = d.pct !== null;
          const positive = (d.pct ?? 0) >= 0;
          const barH = hasData
            ? Math.max(3, (Math.abs(d.pct ?? 0) / maxAbs) * span)
            : 3;
          const fill = !hasData
            ? colors.card3
            : d.highlight
              ? colors.primary
              : positive
                ? withAlpha(colors.primary, 0.5)
                : withAlpha(colors.text, 0.3);
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              <View style={styles.upper}>
                {hasData && positive ? (
                  <View style={[styles.bar, { height: barH, backgroundColor: fill }]} />
                ) : null}
              </View>
              <View style={styles.lower}>
                {!hasData ? (
                  <View style={[styles.bar, { height: 3, backgroundColor: colors.card3 }]} />
                ) : !positive ? (
                  <View style={[styles.bar, { height: barH, backgroundColor: fill }]} />
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text
            key={`l-${i}`}
            style={[styles.label, d.highlight && styles.labelActive]}
            numberOfLines={1}
          >
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { flexDirection: 'row', alignItems: 'stretch', gap: 7 },
  baseline: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.border,
  },
  col: { flex: 1, alignItems: 'center' },
  upper: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  lower: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'flex-start' },
  bar: { width: '70%', maxWidth: 26, borderRadius: radius.xs },
  labels: { flexDirection: 'row', marginTop: 8, gap: 7 },
  label: {
    flex: 1,
    textAlign: 'center',
    color: colors.textFaint,
    fontFamily: family.body,
    fontSize: font.tiny,
    letterSpacing: 0.4,
  },
  labelActive: { color: colors.text, fontFamily: family.semibold },
});
