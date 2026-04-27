import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import AppBadge from '../ui/AppBadge';
import { theme } from '../../theme/theme';

interface RashanBannerProps {
  onPress: () => void;
}

const RashanBanner = memo(function RashanBanner({ onPress }: RashanBannerProps) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.wrap, pressed ? { opacity: 0.95 } : null]}>
      <LinearGradient
        colors={['#1E1B4B', '#312E81', '#5B21B6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.banner}
      >
        <View style={styles.col}>
          <AppBadge label="MONTHLY GROCERIES" variant="pro" />
          <AppText variant="h2" color="#fff" style={{ marginTop: 8 }}>
            Bulk Rashan, delivered.
          </AppText>
          <AppText variant="caption" color="rgba(255,255,255,0.85)" style={{ marginTop: 4, paddingRight: 8 }}>
            Upload your list — we'll prep, price, and deliver via Suzuki or rickshaw.
          </AppText>
          <View style={styles.cta}>
            <AppText variant="bodyStrong" color="#fff">Upload list</AppText>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
        <View style={styles.iconBox}>
          <Ionicons name="cube" size={36} color="#fff" />
        </View>
      </LinearGradient>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: theme.spacing.lg, paddingBottom: theme.spacing.lg },
  banner: {
    borderRadius: theme.radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.xl,
    overflow: 'hidden',
    ...theme.shadows.lg,
  },
  col: { flex: 1 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: theme.spacing.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'flex-start',
  },
  iconBox: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
    marginLeft: theme.spacing.md,
  },
});

export default RashanBanner;
