import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { layout } from '../theme';

interface PageWidthProps {
  children?: React.ReactNode;
  maxWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Caps and centers screen content on wide viewports. Pair with
 * `alignItems: 'center'` on the screen's outer container — on phones this is a
 * no-op (the cap is wider than the viewport).
 */
export default function PageWidth({ children, maxWidth = layout.maxContentWidth, style }: PageWidthProps) {
  return <View style={[styles.wrap, { maxWidth }, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
});
