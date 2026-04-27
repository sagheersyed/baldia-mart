import React, { memo } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import AppIconButton from '../ui/AppIconButton';
import { theme } from '../../theme/theme';

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
  const colors: [string, string] = isFood
    ? [theme.colors.palette.pink500, theme.colors.palette.pink400]
    : [theme.colors.palette.orange500, theme.colors.palette.orange400];

  return (
    <LinearGradient colors={colors} style={styles.wrap}>
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
                <AppText variant="badge" color={isFood ? theme.colors.food : theme.colors.primary}>
                  {cartCount > 9 ? '9+' : String(cartCount)}
                </AppText>
              </View>
            )}
          </View>
        </View>
      </View>

      {greeting ? (
        <AppText variant="caption" color="rgba(255,255,255,0.9)" style={{ marginTop: theme.spacing.sm }}>
          {greeting}
        </AppText>
      ) : null}
    </LinearGradient>
  );
});

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.sm,
    paddingBottom: theme.spacing.lg,
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  locationCol: { flex: 1 },
  locationLine: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  locationLabel: { maxWidth: '78%' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 6,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
});

export default HomeHeader;
