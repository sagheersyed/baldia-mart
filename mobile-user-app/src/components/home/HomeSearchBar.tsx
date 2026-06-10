// HomeSearchBar.tsx — Premium redesign v3
// Features: Floating card style, branded search icon with tint bg,
//           orange glow ring inside header, dark mode via ThemeContext

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
    || (isFood ? 'Search restaurants & dishes…' : 'Search groceries, brands & more…');

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
            backgroundColor: theme.colors.surface,
            borderColor: inHeader ? 'rgba(255,255,255,0.35)' : theme.colors.border,
          },
          pressed ? { transform: [{ scale: 0.98 }], opacity: 0.92 } : null,
          !inHeader ? {
            shadowColor: theme.colors.isDark ? '#000' : '#0A0F1E',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: theme.colors.isDark ? 0.3 : 0.07,
            shadowRadius: 12,
            elevation: 5,
          } : null,
        ]}
        android_ripple={{ color: theme.colors.primaryLight, borderless: false }}
      >
        {/* Branded icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: tint + '18' }]}>
          <Ionicons name="search" size={18} color={tint} />
        </View>

        <AppText
          variant="body"
          color={inHeader ? 'rgba(118, 112, 112, 0.7)' : theme.colors.textMuted}
          style={styles.placeholder}
          numberOfLines={1}
        >
          {ph}
        </AppText>

        <View style={styles.rightActions}>
          {onFilter && (
            <Pressable
              onPress={(e) => { e.stopPropagation(); onFilter(); }}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: theme.colors.surfaceMuted },
                pressed ? { transform: [{ scale: 0.9 }] } : null,
              ]}
              hitSlop={8}
            >
              <Ionicons name="options-outline" size={17} color={tint} />
            </Pressable>
          )}
          <View style={[styles.actionBtn, { backgroundColor: theme.colors.surfaceMuted }]}>
            <Ionicons name="mic-outline" size={17} color={theme.colors.textSecondary} />
          </View>
        </View>
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
    paddingBottom: 4,
    marginTop: 0,
    zIndex: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 50,
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  placeholder: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '500',
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeSearchBar;