import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, TextInput, View, ViewStyle } from 'react-native';

import { colors, family, font, radius, spacing } from '../theme';

interface SearchInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Shared search field. The input fills the bordered row and centres its text
 * vertically with includeFontPadding off + an explicit height, so neither the
 * placeholder nor typed text clips at the bottom with the custom font.
 */
export default function SearchInput({
  value,
  onChangeText,
  placeholder = 'Search exercises',
  style,
}: SearchInputProps) {
  return (
    <View style={[styles.wrap, style]}>
      <Ionicons name="search" size={18} color={colors.textDim} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        style={styles.input}
        autoCorrect={false}
        returnKeyType="search"
        textAlignVertical="center"
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.textFaint} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.card2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  input: {
    flex: 1,
    height: 46,
    color: colors.text,
    fontFamily: family.body,
    fontSize: font.body,
    paddingVertical: 0,
    margin: 0,
    includeFontPadding: false,
  },
});
