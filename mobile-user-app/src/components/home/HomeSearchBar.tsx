import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import AppSearchBar from '../ui/AppSearchBar';
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
 * Elevated search bar with stronger shadow and tighter floating overlap.
 * Sits atop the gradient header like FoodPanda/Pandamart hero search.
 */
const HomeSearchBar = memo(function HomeSearchBar({
  placeholder,
  onPress,
  onFilter,
  variant = 'mart',
  floating = true,
}: Props) {
  const ph = placeholder
    || (variant === 'food' ? '🍔  Search restaurants and dishes' : '🛒  Search groceries, brands...');
  const backgroundColor =
    variant === 'mart' ? 'green' : 'white';
  const isFood = variant === 'food';
  const colors: [string, string, string] = isFood
    ? [theme.colors.palette.pink500, theme.colors.palette.pink400, theme.colors.palette.pink300]
    : [theme.colors.palette.orange600, theme.colors.palette.orange500, theme.colors.palette.orange400];

  return (
    <LinearGradient colors={colors} style={[styles.wrap, floating ? { ...styles.floating } : null]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <View >
        <AppSearchBar
          mode="tappable"
          placeholder={ph}
          onPress={onPress}
          onFilter={onFilter}
          trailingFilter={!!onFilter}
        />
      </View>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.background,
  },
  floating: {
    marginTop: -22,
    zIndex: 5
  },
});

export default HomeSearchBar;
