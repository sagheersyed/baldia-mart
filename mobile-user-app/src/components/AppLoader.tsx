import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from './ui/AppText';
import { theme } from '../theme/theme';

interface Props {
  label?: string;
}

/**
 * Branded full-screen splash/loader. Used while initial settings/auth load.
 */
export default function AppLoader({ label }: Props) {
  const pulse = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.7, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.wrap}>
      <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
        <View style={styles.logoCircle}>
          <Ionicons name="basket" size={36} color="#fff" />
        </View>
      </Animated.View>
      <AppText variant="h2" style={{ marginTop: theme.spacing.lg }}>
        BaldiaMart
      </AppText>
      <AppText variant="caption" style={{ marginTop: 4 }}>
        {label || 'Getting things ready…'}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrap: { alignItems: 'center' },
  logoCircle: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.brand,
  },
});
