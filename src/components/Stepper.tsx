import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { colors, family, font, radius } from '../theme';
import { formatWeight } from '../utils/format';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  max?: number;
  size?: 'md' | 'sm';
  decimal?: boolean;
  disabled?: boolean;
}

/** Square +/- stepper with a Bebas value you can also type into directly. */
export default function Stepper({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 100000,
  size = 'md',
  decimal = false,
  disabled = false,
}: StepperProps) {
  const format = (v: number) => (decimal ? formatWeight(v) : `${Math.round(v)}`);
  const [text, setText] = useState(format(value));

  useEffect(() => {
    setText(format(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (v: number) => Math.max(min, Math.min(max, v));
  const commit = (v: number) => onChange(clamp(decimal ? Math.round(v * 100) / 100 : Math.round(v)));

  const btn = size === 'sm' ? 34 : 40;
  const valueFont = size === 'sm' ? 22 : 26;

  return (
    <View style={[styles.row, disabled && styles.disabled]}>
      <Pressable
        disabled={disabled}
        onPress={() => commit(value - step)}
        hitSlop={6}
        style={({ pressed }) => [styles.btn, { width: btn, height: btn }, pressed && styles.pressed]}
      >
        <Ionicons name="remove" size={size === 'sm' ? 16 : 18} color={colors.text} />
      </Pressable>

      <TextInput
        value={text}
        editable={!disabled}
        onChangeText={(t) => {
          setText(t);
          const n = parseFloat(t.replace(',', '.'));
          if (!Number.isNaN(n)) commit(n);
        }}
        onBlur={() => setText(format(value))}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        selectTextOnFocus
        style={[styles.value, { fontSize: valueFont }]}
      />

      <Pressable
        disabled={disabled}
        onPress={() => commit(value + step)}
        hitSlop={6}
        style={({ pressed }) => [styles.btn, { width: btn, height: btn }, pressed && styles.pressed]}
      >
        <Ionicons name="add" size={size === 'sm' ? 16 : 18} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  disabled: { opacity: 0.45 },
  btn: {
    borderRadius: radius.sm,
    backgroundColor: colors.card3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: { transform: [{ translateY: 1 }], opacity: 0.8 },
  value: {
    minWidth: 54,
    textAlign: 'center',
    color: colors.text,
    fontFamily: family.display,
    paddingHorizontal: 4,
    paddingVertical: 0,
    includeFontPadding: false,
  },
});
