import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from './ui/AppText';
import { theme } from '../theme/theme';
import { useCartStore } from '../store/cartStore';

const ICON_BY_ROUTE: Record<string, [keyof typeof Ionicons.glyphMap, keyof typeof Ionicons.glyphMap]> = {
  Home:    ['home',         'home-outline'],
  Food:    ['restaurant',   'restaurant-outline'],
  Brands:  ['storefront',   'storefront-outline'],
  Search:  ['search',       'search-outline'],
  Cart:    ['bag-handle',   'bag-handle-outline'],
  Orders:  ['receipt',      'receipt-outline'],
  Profile: ['person',       'person-outline'],
  Pharma:  ['medical',      'medical-outline'],
};

const LABEL_BY_ROUTE: Record<string, string> = {
  Home: 'Mart', Food: 'Food', Brands: 'Brands', Search: 'Search',
  Cart: 'Cart', Orders: 'Orders', Profile: 'Account', Pharma: 'Pharma',
};

/**
 * Clean bottom tab bar — active tab changes icon + label color only.
 * No pill/filled background on active tab.
 */
export default function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, theme.spacing.sm);
  const activeMode = useCartStore(s => s.activeMode);

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

          // Dynamic accent based on route or active mode
          let tabAccent = theme.colors.primary; // Default Mart (Orange)
          
          if (route.name === 'Food') {
            tabAccent = theme.colors.food;
          } else if (route.name === 'Pharma') {
            tabAccent = theme.colors.pharma;
          } else if (route.name === 'Cart' || route.name === 'Orders' || route.name === 'Profile') {
            // These tabs adapt to the current active module
            if (activeMode === 'food') tabAccent = theme.colors.food;
            else if (activeMode === 'pharma') tabAccent = theme.colors.pharma;
            else tabAccent = theme.colors.mart;
          }

          const badge = options.tabBarBadge;

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              style={({ pressed }) => [styles.tab, pressed ? { opacity: 0.65 } : null]}
              accessibilityRole="button"
              accessibilityState={{ selected: focused }}
            >
              {/* Icon wrapper — NO background fill, just an icon */}
              <View style={styles.iconWrap}>
                <Ionicons
                  name={focused ? iconActive : iconInactive}
                  size={23}
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

              {/* Active tab shows colored label, inactive stays grey */}
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
    paddingVertical: 5,
    gap: 2,
  },
  iconWrap: {
    width: 32,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    // NO backgroundColor — just the icon changes color
  },
  badge: {
    position: 'absolute',
    top: -3,
    right: -6,
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
