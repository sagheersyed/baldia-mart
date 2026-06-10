import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import AppIconButton from '../ui/AppIconButton';
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
  const isFood = variant === 'food';
  const isPharma = variant === 'pharma';

  const colors: [string, string] = isFood
    ? [theme.colors.food, theme.colors.food + 'CC']
    : isPharma
      ? [theme.colors.pharma, theme.colors.pharma + 'CC']
      : [theme.colors.primary, theme.colors.primary + 'CC'];

  const firstName = userData?.name?.split(' ')[0] || 'Customer';
  const hours = new Date().getHours();
  let greetMsg = greeting;
  if (!greetMsg) {
    if (hours < 12) greetMsg = `Good Morning, ${firstName}!`;
    else if (hours < 17) greetMsg = `Good Afternoon, ${firstName}!`;
    else greetMsg = `Good Evening, ${firstName}!`;
  }

  return (
    <LinearGradient colors={colors} style={styles.wrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
      <View style={styles.row}>
        <Pressable onPress={onLocationPress} style={styles.locationBtn} hitSlop={6}>
          <Ionicons name="location" size={16} color="#fff" />
          <View style={styles.locationCol}>
            <View style={styles.locationLine}>
              <AppText
                variant="bodyStrong"
                color="#fff"
                numberOfLines={1}
                style={styles.locationLabel}
              >
                {locationLabel}
              </AppText>
              <Ionicons name="chevron-down" size={14} color="#fff" />
            </View>
            {etaLabel ? (
              <AppText variant="caption" color="rgba(255,255,255,0.85)" numberOfLines={1}>
                {etaLabel}
              </AppText>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.actions}>
          {onFavouritesPress ? (
            <AppIconButton
              size={36}
              bg="rgba(255,255,255,0.18)"
              onPress={onFavouritesPress}
            >
              <Ionicons name="heart-outline" size={20} color="#fff" />
            </AppIconButton>
          ) : null}
          <AppIconButton
            size={36}
            bg="rgba(255,255,255,0.18)"
            onPress={onNotificationsPress}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </AppIconButton>
          <View>
            <AppIconButton
              size={36}
              bg="rgba(255,255,255,0.18)"
              onPress={onCartPress}
            >
              <Ionicons name="bag-handle-outline" size={20} color="#fff" />
            </AppIconButton>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <AppText variant="badge" color={colors[0]} style={{ fontSize: 10, fontWeight: 'bold' }}>
                  {cartCount > 9 ? '9+' : String(cartCount)}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {greetMsg && (
        <AppText variant="caption" color="rgba(255,255,255,0.95)" style={{ marginTop: 8, fontWeight: '600' }}>
          {greetMsg}
        </AppText>
      )}
      {children}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  locationCol: { flex: 1 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationLabel: { maxWidth: '78%' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
});

export default HomeHeader;
