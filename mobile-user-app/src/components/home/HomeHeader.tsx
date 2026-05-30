import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import AppIconButton from '../ui/AppIconButton';
import { sizes, theme } from '../../theme/theme';

interface HomeHeaderProps {
  locationLabel: string;
  cartCount: number;
  onLocationPress: () => void;
  onNotificationsPress: () => void;
  onCartPress: () => void;
  onFavouritesPress?: () => void;
  scrollY?: Animated.Value;
  greeting?: string;
  variant?: 'mart' | 'food';
  etaLabel?: string;
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
}: HomeHeaderProps) {
  const isFood = variant === 'food';
  const colors: [string, string, string] = isFood
    ? [theme.colors.palette.pink500, theme.colors.palette.pink400, theme.colors.palette.pink300]
    : [theme.colors.palette.orange600, theme.colors.palette.orange500, theme.colors.palette.orange400];

  return (
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.wrap}>
      {/* Top row: Brand + Action buttons */}
      <View style={styles.topRow}>
        <AppText variant="overline" color="rgba(255,255,255,0.7)" style={styles.brand}>
          {isFood ? 'BALDIAFOOD' : 'BALDIAMART'}
        </AppText>
        <View style={styles.actions}>
          {onFavouritesPress ? (
            <AppIconButton
              size={38}
              bg="rgba(255,255,255,0.15)"
              onPress={onFavouritesPress}
            >
              <Ionicons name="heart-outline" size={20} color="#fff" />
            </AppIconButton>
          ) : null}
          <AppIconButton
            size={38}
            bg="rgba(255,255,255,0.15)"
            onPress={onNotificationsPress}
          >
            <Ionicons name="notifications-outline" size={20} color="#fff" />
          </AppIconButton>
          <View>
            <AppIconButton
              size={38}
              bg="rgba(255,255,255,0.15)"
              onPress={onCartPress}
            >
              <Ionicons name="bag-handle-outline" size={20} color="#fff" />
            </AppIconButton>
            {cartCount > 0 && (
              <View style={styles.cartBadge}>
                <AppText variant="badge" color={isFood ? theme.colors.food : theme.colors.primary} style={{ fontSize: 10 }}>
                  {cartCount > 9 ? '9+' : String(cartCount)}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Location row with "Delivering to" prefix */}
      <Pressable onPress={onLocationPress} style={styles.locationBtn} hitSlop={6}>
        <View style={styles.locationIconWrap}>
          <Ionicons name="location" size={18} color="#fff" />
        </View>
        <View style={styles.locationCol}>
          <AppText variant="caption" color="rgba(255,255,255,0.75)" style={{ fontSize: 11 }}>
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
            <Ionicons name="chevron-down" size={14} color="rgba(255,255,255,0.8)" />
          </View>
        </View>
        {/* ETA chip */}
        {etaLabel ? (
          <View style={styles.etaChip}>
            <Ionicons name="bicycle-outline" size={13} color="#fff" />
            <AppText variant="badge" color="#fff" style={{ fontSize: 10 }}>
              {etaLabel}
            </AppText>
          </View>
        ) : null}
      </Pressable>
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xs,
    paddingBottom: theme.spacing.xxl,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
    minHeight: 42,
  },
  brand: {
    letterSpacing: 1.5,
    fontSize: 11,
    fontWeight: '900',
  },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  locationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  locationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationCol: { flex: 1 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationLabel: { maxWidth: '78%', fontSize: 15 },
  etaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});

export default HomeHeader;
