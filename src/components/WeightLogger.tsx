import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleProp, StyleSheet, Text, TextInput, View, ViewStyle } from 'react-native';

import { colors, family, font, radius, spacing } from '../theme';

interface WeightLoggerProps {
  /** Latest recorded weight (in the user's unit), used as the placeholder. */
  current: number | null;
  /** Unit label, e.g. "kg" / "lb". */
  unit: string;
  /** Called with the parsed, positive weight when the user submits. */
  onLog: (weight: number) => void;
  /** Button label — "LOG" for a first entry, "UPDATE" once weigh-ins exist. */
  actionLabel?: string;
  style?: StyleProp<ViewStyle>;
}

/** Shared inline weigh-in row: a numeric field plus a submit button. Used by the
 *  Home BODY card and the Progress bodyweight card so both stay consistent. */
export default function WeightLogger({
  current,
  unit,
  onLog,
  actionLabel = 'LOG',
  style,
}: WeightLoggerProps) {
  const [value, setValue] = useState('');
  const submit = () => {
    const n = parseFloat(value.replace(',', '.'));
    if (!Number.isFinite(n) || n <= 0) return;
    onLog(n);
    setValue('');
  };
  const disabled = !value.trim();

  return (
    <View style={[styles.row, style]}>
      <TextInput
        value={value}
        onChangeText={setValue}
        placeholder={current !== null ? `${current}` : `Weight in ${unit.toLowerCase()}`}
        placeholderTextColor={colors.textFaint}
        keyboardType="decimal-pad"
        returnKeyType="done"
        onSubmitEditing={submit}
        style={styles.input}
        accessibilityLabel={`Weight in ${unit}`}
      />
      <Pressable
        onPress={submit}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={`${actionLabel} weight`}
        style={({ pressed }) => [styles.btn, disabled && styles.btnDisabled, pressed && styles.btnPressed]}
      >
        <Ionicons name="add" size={18} color={colors.bg} />
        <Text style={styles.btnText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  input: {
    flex: 1,
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    height: 46,
    color: colors.text,
    fontFamily: family.medium,
    fontSize: font.body,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    height: 46,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  btnDisabled: { opacity: 0.4 },
  btnPressed: { opacity: 0.85 },
  btnText: { color: colors.bg, fontFamily: family.bold, fontSize: font.label, letterSpacing: 0.8 },
});
