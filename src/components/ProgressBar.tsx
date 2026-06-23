import React, { useEffect, useRef } from 'react';
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

import { colors, radius } from '../theme';

interface ProgressBarProps {
  /** 0..1 */
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

/** Thin editorial progress block that animates smoothly to its target width. */
export default function ProgressBar({
  progress,
  color = colors.primary,
  trackColor = colors.border,
  height = 8,
  style,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, isFinite(progress) ? progress : 0));
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: clamped,
      duration: 700,
      useNativeDriver: false,
    }).start();
  }, [clamped, anim]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.track, { height, backgroundColor: trackColor }, style]}>
      <Animated.View style={[styles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    borderRadius: radius.xs,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radius.xs,
  },
});
