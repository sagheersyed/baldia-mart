// HomeSearchBar — Foodpanda-inspired clean search field

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import { useTheme } from '../../context/ThemeContext';

interface Props {
  placeholder?: string;
  onPress: () => void;
  onFilter?: () => void;
  variant?: 'mart' | 'food';
  floating?: boolean;
  inHeader?: boolean;
}

const HomeSearchBar = memo(function HomeSearchBar({
  placeholder,
  onPress,
  onFilter,
  variant = 'mart',
  floating = true,
  inHeader = false,
}: Props) {
  const { theme } = useTheme();
  const isFood = variant === 'food';
  const tint = isFood ? theme.colors.food : theme.colors.primary;

  const ph = placeholder
    || (isFood ? 'Search for shops & restaurants' : 'Search for shops & products');

  return (
    <View style={[
      styles.container,
      { backgroundColor: inHeader ? 'transparent' : theme.colors.background },
      floating && !inHeader ? styles.floating : null,
      inHeader ? styles.inHeader : null,
    ]}>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.bar,
          {
            backgroundColor: theme.colors.surfaceMuted,
            borderColor: theme.colors.border,
          },
          pressed ? { opacity: 0.92 } : null,
        ]}
        android_ripple={{ color: theme.colors.primaryLight, borderless: false }}
      >
        <Ionicons name="search" size={18} color={theme.colors.textMuted} />

        <AppText
          variant="body"
          color={theme.colors.textMuted}
          style={styles.placeholder}
          numberOfLines={1}
        >
          {ph}
        </AppText>

        <View style={styles.divider} />

        {onFilter ? (
          <Pressable
            onPress={(e) => { e.stopPropagation(); onFilter(); }}
            hitSlop={8}
            style={styles.trailingBtn}
          >
            <Ionicons name="options-outline" size={18} color={tint} />
          </Pressable>
        ) : (
          <Ionicons name="mic-outline" size={18} color={theme.colors.textSecondary} />
        )}
      </Pressable>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
  },
  floating: {
    marginTop: -24,
    zIndex: 5,
  },
  inHeader: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 0,
    marginTop: 0,
    zIndex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    minHeight: 46,
    gap: 10,
  },
  placeholder: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400',
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: '#CBD5E1',
  },
  trailingBtn: {
    padding: 2,
  },
});

export default HomeSearchBar;
