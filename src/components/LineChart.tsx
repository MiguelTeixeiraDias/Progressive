import React, { useState } from 'react';
import { LayoutChangeEvent, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, family, font } from '../theme';
import { withAlpha } from '../utils/color';

interface LineChartProps {
  /** Y values, oldest → newest. */
  values: number[];
  /** Optional x-axis labels; the first and last are shown beneath the plot. */
  labels?: string[];
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Formats the min/max guide values printed at the right edge. */
  formatValue?: (v: number) => string;
}

const DOT = 7;
const V_PAD = 12; // vertical breathing room so end dots aren't clipped

/**
 * Lightweight trend line for a numeric series (e.g. bodyweight over time).
 * Built without SVG: each pair of points is joined by a thin View rotated about
 * its own centre (midpoint placement + default centre origin avoids needing
 * `transformOrigin`, which isn't reliable across RN targets). The plot measures
 * its own width via `onLayout` so it fills whatever column it's dropped into.
 */
export default function LineChart({
  values,
  labels,
  height = 150,
  style,
  formatValue = (v) => `${Math.round(v)}`,
}: LineChartProps) {
  const [w, setW] = useState(0);
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const plotH = height - V_PAD * 2;

  const pts = values.map((v, i) => {
    const x = values.length > 1 ? (i / (values.length - 1)) * w : w / 2;
    const norm = (v - min) / span;
    const y = V_PAD + (1 - norm) * plotH;
    return { x, y };
  });

  return (
    <View style={style}>
      <View style={[styles.plot, { height }]} onLayout={onLayout}>
        {/* faint top/bottom guides */}
        <View style={[styles.guide, { top: V_PAD }]} />
        <View style={[styles.guide, { top: height - V_PAD }]} />

        {w > 0 &&
          pts.slice(0, -1).map((p, i) => {
            const n = pts[i + 1];
            const dx = n.x - p.x;
            const dy = n.y - p.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const mx = (p.x + n.x) / 2;
            const my = (p.y + n.y) / 2;
            return (
              <View
                key={`seg-${i}`}
                style={[
                  styles.segment,
                  {
                    left: mx - len / 2,
                    top: my - 1,
                    width: len,
                    transform: [{ rotateZ: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}

        {w > 0 &&
          pts.map((p, i) => {
            const last = i === pts.length - 1;
            return (
              <View
                key={`dot-${i}`}
                style={[
                  styles.dot,
                  {
                    left: p.x - DOT / 2,
                    top: p.y - DOT / 2,
                    backgroundColor: last ? colors.primary : colors.bg,
                    borderColor: last ? colors.primary : withAlpha(colors.primary, 0.55),
                  },
                  last && styles.dotLast,
                ]}
              />
            );
          })}

        {/* min / max guide values pinned to the right edge */}
        <Text style={[styles.axis, { top: V_PAD - 7 }]}>{formatValue(max)}</Text>
        <Text style={[styles.axis, { top: height - V_PAD - 7 }]}>{formatValue(min)}</Text>
      </View>

      {labels && labels.length >= 2 ? (
        <View style={styles.labels}>
          <Text style={styles.label}>{labels[0]}</Text>
          <Text style={styles.label}>{labels[labels.length - 1]}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  plot: { width: '100%', position: 'relative' },
  guide: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.border },
  segment: { position: 'absolute', height: 2, borderRadius: 1, backgroundColor: colors.primary },
  dot: { position: 'absolute', width: DOT, height: DOT, borderRadius: DOT / 2, borderWidth: 1.5 },
  dotLast: { width: DOT + 2, height: DOT + 2, borderRadius: (DOT + 2) / 2 },
  axis: {
    position: 'absolute',
    right: 0,
    color: colors.textFaint,
    fontFamily: family.medium,
    fontSize: font.tiny,
    letterSpacing: 0.4,
    backgroundColor: colors.card,
    paddingHorizontal: 3,
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  label: { color: colors.textFaint, fontFamily: family.body, fontSize: font.tiny, letterSpacing: 0.4 },
});
