import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import AppSearchBar from '../ui/AppSearchBar';
import { theme } from '../../theme/theme';

interface Props {
  placeholder?: string;
  onPress: () => void;
  onFilter?: () => void;
  variant?: 'mart' | 'food';
  floating?: boolean;
}

/**
 * Home / Food search affordance. Floating variant overlaps the gradient header
 * — used inside `HomeScreen` and `FoodScreen` headers for a Foodpanda-style hero.
 */
const HomeSearchBar = memo(function HomeSearchBar({
  placeholder,
  onPress,
  onFilter,
  variant = 'mart',
  floating = true,
}: Props) {
  const ph = placeholder
    || (variant === 'food' ? 'Search restaurants and dishes' : 'Search groceries, brands and essentials');

  return (
    <View style={[styles.wrap, floating ? styles.floating : null]}>
      <AppSearchBar
        mode="tappable"
        placeholder={ph}
        onPress={onPress}
        onFilter={onFilter}
        trailingFilter={!!onFilter}
      />
    </View>
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
    marginTop: -28,
    backgroundColor: 'transparent',
  },
});

export default HomeSearchBar;
