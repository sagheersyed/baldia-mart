import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import { theme } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';

interface HomeHeaderProps {
  locationLabel: string;
  cartCount: number;
  onLocationPress: () => void;
  onNotificationsPress: () => void;
  onCartPress: () => void;
  onFavouritesPress?: () => void;
  scrollY?: Animated.Value;
  greeting?: string;
  variant?: 'mart' | 'food' | 'pharma';
  etaLabel?: string;
  children?: React.ReactNode;
}

const HomeHeader = memo(function HomeHeader({
  locationLabel,
  cartCount,
  onLocationPress,
  onNotificationsPress,
  onCartPress,
  onFavouritesPress,
  greeting,
  variant = 'mart',
  etaLabel,
  children,
}: HomeHeaderProps) {
  const { userData } = useAuthStore();
  const accent =
    variant === 'food'
      ? theme.colors.food
      : variant === 'pharma'
        ? theme.colors.pharma
        : theme.colors.primary;

  const firstName = userData?.name?.split(' ')[0] || 'Customer';
  const hours = new Date().getHours();
  let greetMsg = greeting;
  if (!greetMsg) {
    if (hours < 12) greetMsg = `Good morning, ${firstName}`;
    else if (hours < 17) greetMsg = `Good afternoon, ${firstName}`;
    else greetMsg = `Good evening, ${firstName}`;
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable onPress={onLocationPress} style={styles.locationBtn} hitSlop={6}>
          <View style={[styles.pinWrap, { backgroundColor: accent + '14' }]}>
            <Ionicons name="location" size={16} color={accent} />
          </View>
          <View style={styles.locationCol}>
            <AppText variant="overline" color={theme.colors.textMuted} style={styles.deliverLabel}>
              Deliver to
            </AppText>
            <View style={styles.locationLine}>
              <AppText
                variant="bodyStrong"
                color={theme.colors.textHeader}
                numberOfLines={1}
                style={styles.locationLabel}
              >
                {locationLabel}
              </AppText>
              <Ionicons name="chevron-down" size={14} color={theme.colors.textSecondary} />
            </View>
            {etaLabel ? (
              <AppText variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
                {etaLabel}
              </AppText>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.actions}>
          {onFavouritesPress ? (
            <Pressable
              onPress={onFavouritesPress}
              style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
              hitSlop={4}
            >
              <Ionicons name="heart-outline" size={22} color={theme.colors.textPrimary} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={onNotificationsPress}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={4}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={onCartPress}
            style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
            hitSlop={4}
          >
            <Ionicons name="bag-handle-outline" size={22} color={theme.colors.textPrimary} />
            {cartCount > 0 && (
              <View style={[styles.cartBadge, { backgroundColor: accent }]}>
                <AppText variant="badge" color="#fff" style={styles.cartBadgeText}>
                  {cartCount > 9 ? '9+' : String(cartCount)}
                </AppText>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      {greetMsg ? (
        <AppText variant="caption" color={theme.colors.textSecondary} style={styles.greeting}>
          {greetMsg}
        </AppText>
      ) : null}

      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginRight: 8,
  },
  pinWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCol: { flex: 1 },
  deliverLabel: {
    fontSize: 9,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationLabel: {
    maxWidth: '82%',
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnPressed: {
    backgroundColor: theme.colors.surfaceMuted,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: theme.colors.surface,
  },
  cartBadgeText: {
    fontSize: 9,
    lineHeight: 11,
    fontWeight: '800',
  },
  greeting: {
    marginTop: 10,
    fontWeight: '500',
  },
});

export default HomeHeader;
