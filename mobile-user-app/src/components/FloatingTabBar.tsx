import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './ui/AppText';
import { theme } from '../theme/theme';

const ICON_BY_ROUTE: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home:    ['home',         'home-outline'],
  Food:    ['restaurant',   'restaurant-outline'],
  Brands:  ['storefront',   'storefront-outline'],
  Search:  ['search',       'search-outline'],
  Cart:    ['bag-handle',   'bag-handle-outline'],
  Orders:  ['receipt',      'receipt-outline'],
  Profile: ['person',       'person-outline'],
};

const LABEL_BY_ROUTE: Record<string, string> = {
  Home: 'Mart', Food: 'Food', Brands: 'Brands', Search: 'Search',
  Cart: 'Cart', Orders: 'Orders', Profile: 'Account',
};

/**
 * Foodpanda-style floating bottom tab bar with active pill highlight,
 * polished badges, and smooth color transitions.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, theme.spacing.sm);

  return (
    <View pointerEvents="box-none" style={[styles.container, { paddingBottom: bottom }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const { options } = descriptors[route.key];
          const [iconActive, iconInactive] = ICON_BY_ROUTE[route.name] || ['ellipse', 'ellipse-outline'];
          const label = (options.tabBarLabel as string) || LABEL_BY_ROUTE[route.name] || route.name;

          const onPress = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name as never);
          };

          // Tab bar accents Food screen with the pink color, otherwise the brand orange
          const tabAccent = route.name === 'Food'
            ? theme.colors.food
            : theme.colors.primary;

          const badge = options.tabBarBadge;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.7 } : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              <View
                style={[
                  styles.iconWrap,
                  focused ? { backgroundColor: tabAccent + '18' } : null,
                ]}
              >
                <Ionicons
                  name={focused ? iconActive : iconInactive}
                  size={22}
                  color={focused ? tabAccent : theme.colors.textSecondary}
                />
                {badge != null ? (
                  <View style={[styles.badge, { backgroundColor: tabAccent }]}>
                    <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>
                      {String(badge).length > 2 ? '9+' : String(badge)}
                    </AppText>
                  </View>
                ) : null}
              </View>
              <AppText
                variant="tab"
                color={focused ? tabAccent : theme.colors.textSecondary}
                numberOfLines={1}
              >
                {label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: theme.spacing.md,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xxl,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    ...theme.shadows.lg,
    ...Platform.select({
      android: { borderWidth: 0.5, borderColor: theme.colors.border },
    }),
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    gap: 2,
  },
  iconWrap: {
    width: 44,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: theme.radius.pill,
    marginBottom: 2,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});
