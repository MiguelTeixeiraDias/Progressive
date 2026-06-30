import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, family, font, layout, spacing } from '../theme';

/** Desktop replacement for the bottom tab bar — a fixed-width left rail. */
export default function SidebarNav({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  return (
    <View style={[styles.sidebar, { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }]}>
      <View style={styles.brand}>
        <View style={styles.mark}>
          <Text style={styles.markText}>PR</Text>
        </View>
        <Text style={styles.brandText}>PROGRESSIVE</Text>
      </View>

      <View style={styles.items}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : (options.title ?? route.name);
          const color = focused ? colors.primary : colors.textFaint;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [styles.item, focused && styles.itemActive, pressed && styles.itemPressed]}
            >
              <View style={[styles.indicator, focused && styles.indicatorActive]} />
              {options.tabBarIcon?.({ focused, color, size: 20 })}
              <Text style={[styles.itemLabel, { color }]} numberOfLines={1}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: layout.sidebarWidth,
    backgroundColor: colors.card2,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxl, paddingHorizontal: spacing.sm },
  mark: { width: 32, height: 32, borderRadius: 4, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.bg, fontSize: 16, lineHeight: 18, fontFamily: family.display, includeFontPadding: false, marginTop: 2 },
  brandText: { color: colors.text, fontFamily: family.display, fontSize: font.lg, letterSpacing: 1, includeFontPadding: false },

  items: { gap: 2 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: 11,
    paddingHorizontal: spacing.sm,
    borderRadius: 4,
  },
  itemActive: { backgroundColor: colors.primaryDim },
  itemPressed: { opacity: 0.85 },
  indicator: { width: 3, height: 18, borderRadius: 2, backgroundColor: 'transparent', marginLeft: -spacing.sm },
  indicatorActive: { backgroundColor: colors.primary },
  itemLabel: { fontFamily: family.medium, fontSize: font.label, letterSpacing: 0.4, textTransform: 'uppercase' },
});
