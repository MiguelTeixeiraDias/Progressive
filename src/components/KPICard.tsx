import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';

import { colors, family, font, radius, spacing } from '../theme';
import { signedPct } from '../utils/format';
import Card from './Card';
import CountUp from './CountUp';

interface KPICardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number | null;
  trendLabel?: string;
  caption?: string;
  accent?: string;
  feature?: boolean;
  countUp?: boolean;
  format?: (n: number) => string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
}

/** Editorial KPI: tiny uppercase label, oversized Bebas number, tiny trend line. */
export default function KPICard({
  label,
  value,
  unit,
  trend,
  trendLabel = 'from last week',
  caption,
  accent,
  feature = false,
  countUp = false,
  format = (n) => `${Math.round(n)}`,
  onPress,
  style,
  children,
}: KPICardProps) {
  const numberColor = accent ?? colors.text;
  const numberSize = feature ? 68 : 42;
  const showTrend = trend !== undefined && trend !== null && isFinite(trend);
  const trendUp = (trend ?? 0) >= 0;
  const trendColor = trendUp ? colors.primary : colors.textDim;

  const numberStyle = [
    styles.number,
    { color: numberColor, fontSize: numberSize, lineHeight: numberSize * 0.96 },
  ];

  return (
    <Card onPress={onPress} style={[feature ? styles.feature : styles.card, style]}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>

      <View style={styles.numberRow}>
        {countUp && typeof value === 'number' ? (
          <CountUp value={value} format={format} style={numberStyle} />
        ) : (
          <Text style={numberStyle}>{value}</Text>
        )}
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>

      {showTrend ? (
        <View style={styles.trendRow}>
          <Ionicons
            name={trendUp ? 'arrow-up' : 'arrow-down'}
            size={12}
            color={trendColor}
          />
          <Text style={[styles.trendValue, { color: trendColor }]}>{signedPct(trend ?? 0)}</Text>
          <Text style={styles.trendLabel}>{trendLabel}</Text>
        </View>
      ) : caption ? (
        <Text style={styles.caption} numberOfLines={1}>
          {caption}
        </Text>
      ) : null}

      {children ? <View style={styles.children}>{children}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 118, justifyContent: 'flex-start' },
  feature: { minHeight: 150 },
  label: {
    color: colors.textDim,
    fontFamily: family.medium,
    fontSize: font.tiny,
    letterSpacing: 1.6,
  },
  numberRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: spacing.sm,
  },
  number: {
    fontFamily: family.display,
    includeFontPadding: false,
  },
  unit: {
    color: colors.textDim,
    fontFamily: family.medium,
    fontSize: font.label,
    marginLeft: 6,
    marginBottom: 7,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },
  trendValue: {
    fontFamily: family.semibold,
    fontSize: font.small,
  },
  trendLabel: {
    color: colors.textFaint,
    fontFamily: family.body,
    fontSize: font.small,
    marginLeft: 2,
  },
  caption: {
    color: colors.textFaint,
    fontFamily: family.body,
    fontSize: font.small,
    marginTop: spacing.sm,
  },
  children: { marginTop: spacing.lg },
});
