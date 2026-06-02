import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import { theme } from '../../theme/theme';
import { LinearGradient } from 'expo-linear-gradient';

interface Props {
  placeholder?: string;
  onPress: () => void;
  onFilter?: () => void;
  variant?: 'mart' | 'food';
  floating?: boolean;
}

/**
 * Premium Foodpanda-style search bar with:
 * - Elevated card design with soft shadows
 * - Gradient accent border
 * - Animated press feedback
 * - Filter button integration
 * - Modern iconography
 */
const HomeSearchBar = memo(function HomeSearchBar({
  placeholder,
  onPress,
  onFilter,
  variant = 'mart',
  floating = true,
}: Props) {
  const ph = placeholder
    || (variant === 'food' ? '🍔  Search restaurants and dishes' : '🛒  Search groceries, brands & more...');
  
  const isFood = variant === 'food';
  const gradientColors: [string, string] = isFood
    ? [theme.colors.palette.pink500, theme.colors.palette.pink400]
    : [theme.colors.palette.orange500, theme.colors.palette.orange400];

  return (
    <View style={[styles.container, floating ? styles.floating : null]}>
      {/* Gradient border wrapper */}
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradientBorder}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.searchBar,
            pressed ? styles.searchBarPressed : null,
          ]}
          android_ripple={{ color: theme.colors.primaryLight, borderless: false }}
        >
          {/* Search Icon with gradient background */}
          <View style={styles.iconContainer}>
            <Ionicons name="search" size={20} color={theme.colors.textSecondary} />
          </View>
          
          {/* Placeholder text */}
          <AppText
            variant="body"
            color={theme.colors.textMuted}
            style={styles.placeholder}
            numberOfLines={1}
          >
            {ph}
          </AppText>

          {/* Action buttons */}
          <View style={styles.actions}>
            {onFilter && (
              <Pressable
                onPress={(e) => {
                  e.stopPropagation();
                  onFilter();
                }}
                style={({ pressed }) => [
                  styles.filterBtn,
                  pressed ? styles.filterBtnPressed : null,
                ]}
                hitSlop={8}
              >
                <Ionicons name="filter" size={18} color={theme.colors.primary} />
              </Pressable>
            )}
            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                // Voice search placeholder
              }}
              style={({ pressed }) => [
                styles.voiceBtn,
                pressed ? styles.voiceBtnPressed : null,
              ]}
              hitSlop={8}
            >
              <Ionicons name="mic-outline" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        </Pressable>
      </LinearGradient>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.none,
    backgroundColor: theme.colors.background,
  },
  floating: {
    marginTop: -24,
    zIndex: 5,
  },
  gradientBorder: {
    borderRadius: theme.radius.xl,
    padding: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    minHeight: 52,
    ...theme.shadows.md,
  },
  searchBarPressed: {
    transform: [{ scale: 0.98 }],
    shadowOpacity: 0.15,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: theme.spacing.sm,
  },
  placeholder: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnPressed: {
    transform: [{ scale: 0.9 }],
    backgroundColor: theme.colors.primaryLight,
  },
  voiceBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceBtnPressed: {
    transform: [{ scale: 0.9 }],
    backgroundColor: theme.colors.surface,
  },
});

export default HomeSearchBar;