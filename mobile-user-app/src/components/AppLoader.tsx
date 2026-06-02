import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import AppText from './ui/AppText';
import { theme } from '../theme/theme';

interface Props {
  label?: string;
}

/**
 * Premium full-screen splash/loader.
 * - Logo scales in with spring
 * - Three animated dots below (like Foodpanda)
 * - Subtle pulsing glow ring
 */
export default function AppLoader({ label }: Props) {
  const scaleAnim = useRef(new Animated.Value(0.7)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(1)).current;

  // Dot bounce animations
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo entrance
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.15, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    ).start();

    // Staggered dot bounce
    const dotLoop = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -8, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 280, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.delay(600),
        ]),
      );

    dotLoop(dot1, 0).start();
    dotLoop(dot2, 180).start();
    dotLoop(dot3, 360).start();
  }, []);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.logoArea, { opacity: opacityAnim, transform: [{ scale: scaleAnim }] }]}>
        {/* Glow ring */}
        <Animated.View style={[styles.glowRing, { transform: [{ scale: glowAnim }] }]} />

        {/* Logo circle */}
        <View style={styles.logoCircle}>
          <AppText style={styles.logoEmoji}>🛒</AppText>
        </View>
      </Animated.View>

      <Animated.View style={[styles.brandRow, { opacity: opacityAnim }]}>
        <AppText variant="h2" style={styles.brandName}>BaldiaMart</AppText>
      </Animated.View>

      <Animated.View style={[styles.taglineRow, { opacity: opacityAnim }]}>
        <AppText variant="caption" style={styles.tagline}>
          {label || 'Fresh groceries, delivered fast'}
        </AppText>
      </Animated.View>

      {/* Bouncing dots */}
      <View style={styles.dotsRow}>
        {[dot1, dot2, dot3].map((dot, i) => (
          <Animated.View
            key={i}
            style={[styles.dot, { transform: [{ translateY: dot }] }]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  logoArea: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  glowRing: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: theme.colors.primary + '18',
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  logoEmoji: {
    fontSize: 40,
  },
  brandRow: {
    marginBottom: 4,
  },
  brandName: {
    fontSize: 26,
    fontWeight: '800',
    color: theme.colors.textHeader,
    letterSpacing: -0.5,
  },
  taglineRow: {
    marginBottom: 32,
  },
  tagline: {
    color: theme.colors.textSecondary,
    fontSize: 13,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-end',
    height: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
});
