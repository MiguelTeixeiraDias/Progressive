import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleProp, Text, TextStyle } from 'react-native';

interface CountUpProps {
  value: number;
  format?: (v: number) => string;
  duration?: number;
  style?: StyleProp<TextStyle>;
}

/** Gentle count-up for KPI numbers. Eases toward the target on mount/change. */
export default function CountUp({
  value,
  format = (v) => `${Math.round(v)}`,
  duration = 900,
  style,
}: CountUpProps) {
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    anim.setValue(0);
    const id = anim.addListener(({ value: t }) => setDisplay(value * t));
    Animated.timing(anim, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();
    return () => anim.removeListener(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return <Text style={style}>{format(display)}</Text>;
}
