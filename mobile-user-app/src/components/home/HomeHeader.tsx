// HomeHeader.tsx — Premium redesign v3
// Features: Time-based greeting, richer 3-stop gradient, glassmorphic location pill,
//           larger action buttons, dark mode aware via ThemeContext

import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import AppIconButton from '../ui/AppIconButton';
import { useTheme } from '../../context/ThemeContext';

interface HomeHeaderProps {
  locationLabel: string;
  cartCount: number;
  onLocationPress: () => void;
  onNotificationsPress: () => void;
  onCartPress: () => void;
  onFavouritesPress?: () => void;
  variant?: 'mart' | 'food';
  etaLabel?: string;
  greeting?: string;
  children?: React.ReactNode;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good Morning';
  if (h < 17) return 'Good Afternoon';
  if (h < 21) return 'Good Evening';
  return 'Good Night';
}

const HomeHeader = memo(function HomeHeader({
  locationLabel,
  cartCount,
  onLocationPress,
  onNotificationsPress,
  onCartPress,
  onFavouritesPress,
  variant = 'mart',
  etaLabel,
  greeting,
  children,
}: HomeHeaderProps) {
  const { theme } = useTheme();
  const isFood = variant === 'food';

  const gradColors = useMemo((): [string, string, string] =>
    isFood
      ? ['#A31F1F', '#C62828', '#E03030']
      : [theme.colors.gradStart, theme.colors.gradMid, theme.colors.gradEnd],
    [isFood, theme],
  );

  const brandName = isFood ? 'BaldiaFood' : 'BaldiaMart';
  const greetText = greeting ?? getGreeting();

  return (
    <LinearGradient
      colors={gradColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.wrap, children ? { paddingBottom: 14 } : null]}
    >
      {/* Top row: Greeting + Action buttons */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <AppText variant="overline" color="rgba(255,255,255,0.7)" style={styles.brand}>
            {brandName}
          </AppText>
          <AppText variant="bodyStrong" color="#fff" style={styles.greeting} numberOfLines={1}>
            {greetText} 👋
          </AppText>
        </View>

        <View style={styles.actions}>
          {onFavouritesPress ? (
            <AppIconButton size={42} bg="rgba(255,255,255,0.18)" onPress={onFavouritesPress}>
              <Ionicons name="heart-outline" size={21} color="#fff" />
            </AppIconButton>
          ) : null}
          <AppIconButton size={42} bg="rgba(255,255,255,0.18)" onPress={onNotificationsPress}>
            <Ionicons name="notifications-outline" size={21} color="#fff" />
          </AppIconButton>
          <View>
            <AppIconButton size={42} bg="rgba(255,255,255,0.18)" onPress={onCartPress}>
              <Ionicons name="bag-handle-outline" size={21} color="#fff" />
            </AppIconButton>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <AppText
                  variant="badge"
                  color={isFood ? theme.colors.food : theme.colors.primary}
                  style={{ fontSize: 10, fontWeight: '800' }}
                >
                  {cartCount > 9 ? '9+' : String(cartCount)}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Location pill */}
      <Pressable onPress={onLocationPress} style={styles.locationPill} hitSlop={6}>
        {/* Pulsing live dot */}
        <View style={styles.liveDotWrap}>
          <View style={styles.liveDot} />
        </View>

        <View style={styles.locationIcon}>
          <Ionicons name="location" size={16} color="#fff" />
        </View>

        <View style={styles.locationCol}>
          <AppText variant="caption" color="rgba(255,255,255,0.75)" style={{ fontSize: 10.5 }}>
            Delivering to
          </AppText>
          <View style={styles.locationLine}>
            <AppText
              variant="bodyStrong"
              color="#fff"
              numberOfLines={1}
              style={styles.locationLabel}
            >
              {locationLabel}
            </AppText>
            <Ionicons name="chevron-down" size={13} color="rgba(255,255,255,0.85)" />
          </View>
        </View>

        {/* ETA chip */}
        {etaLabel ? (
          <View style={styles.etaChip}>
            <Ionicons name="bicycle-outline" size={12} color="#fff" />
            <AppText variant="badge" color="#fff" style={{ fontSize: 10 }}>
              {etaLabel}
            </AppText>
          </View>
        ) : null}
      </Pressable>

      {children}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 36,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 48,
  },
  brand: {
    letterSpacing: 1.5,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 1,
  },
  greeting: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  liveDotWrap: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  locationIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCol: { flex: 1 },
  locationLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  locationLabel: {
    maxWidth: '75%',
    fontSize: 14,
    fontWeight: '700',
  },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});

export default HomeHeader;
