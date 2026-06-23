import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, family, font, radius } from '../theme';
import { withAlpha } from '../utils/color';

export interface ChartDatum {
  label: string;
  value: number;
  highlight?: boolean;
}

interface StatChartProps {
  data: ChartDatum[];
  color?: string;
  height?: number;
  showValues?: boolean;
  formatValue?: (v: number) => string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Minimal editorial bar chart from plain Views. Bars are muted bone; the
 * highlighted bar(s) use the acid-lime accent. No chart library, no gradients.
 */
export default function StatChart({
  data,
  color = colors.primary,
  height = 140,
  showValues = false,
  formatValue = (v) => `${Math.round(v)}`,
  style,
}: StatChartProps) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const barsArea = showValues ? height - 18 : height;

  return (
    <View style={style}>
      <View style={[styles.bars, { height }]}>
        {data.map((d, i) => {
          const active = d.highlight ?? false;
          const h = d.value > 0 ? Math.max(4, (d.value / max) * barsArea) : 3;
          return (
            <View key={`${d.label}-${i}`} style={styles.col}>
              {showValues ? (
                <Text style={[styles.valueText, active && { color: colors.primary }]} numberOfLines={1}>
                  {d.value > 0 ? formatValue(d.value) : ''}
                </Text>
              ) : null}
              <View
                style={[
                  styles.bar,
                  {
                    height: h,
                    backgroundColor: d.value > 0 ? (active ? color : withAlpha(colors.text, 0.16)) : colors.card3,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={styles.labels}>
        {data.map((d, i) => (
          <Text
            key={`l-${d.label}-${i}`}
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
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 7 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%' },
  bar: { width: '74%', maxWidth: 30, borderRadius: radius.xs },
  valueText: {
    color: colors.textFaint,
    fontFamily: family.display,
    fontSize: font.label,
    marginBottom: 4,
    includeFontPadding: false,
  },
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
