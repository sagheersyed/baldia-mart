import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import { theme } from '../../theme/theme';

export interface QuickService {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string;
  fg: string;
  onPress: () => void;
  badge?: string;
}

interface Props {
  services: QuickService[];
  variant?: 'rail' | 'grid';
}

/**
 * Premium bento-style quick service cards. Taller with gradient icon circles
 * and contrasting badge chips. FoodPanda Pandamart-inspired.
 */
const QuickServicesGrid = memo(function QuickServicesGrid({
  services,
  variant = 'rail',
}: Props) {
  const Item = useMemo(() => {
    return ({ item }: { item: QuickService }) => {
      if (!item) return null;

      // Derive a slightly darker shade for gradient
      const darkerBg = item.bg.replace(/([0-9A-F]{2})$/i, (match) => {
        const val = Math.max(0, parseInt(match, 16) - 30);
        return val.toString(16).padStart(2, '0');
      });

      return (
        <Pressable
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.card,
            variant === 'grid' ? styles.gridCard : styles.railCard,
            pressed ? { opacity: 0.88, transform: [{ scale: 0.95 }] } : null,
          ]}
        >
          <LinearGradient
            colors={[item.bg, darkerBg]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Badge (HOT) — top-right */}
          {item.badge ? (
            <View style={styles.badgeChip}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>
                {item.badge}
              </AppText>
            </View>
          ) : null}
          {/* Icon circle */}
          <View style={styles.iconCircle}>
            <Ionicons name={item.icon} size={28} color={item.fg} />
          </View>
          <AppText
            variant="captionStrong"
            color={theme.colors.textHeader}
            numberOfLines={2}
            align="center"
            style={styles.label}
          >
            {item.title}
          </AppText>
        </Pressable>
      );
    };
  }, [variant]);

  if (variant === 'grid') {
    return (
      <View style={styles.gridWrap}>
        {services.map((s) => <Item key={s.id} item={s} />)}
      </View>
    );
  }

  return (
    <FlatList
      data={services}
      horizontal
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => <Item item={item} />}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.railWrap}
    />
  );
});

const styles = StyleSheet.create({
  railWrap: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    borderRadius: theme.radius.xl,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  railCard: {
    width: 120,
    height: 136,
    marginRight: theme.spacing.md,
  },
  gridCard: {
    width: '47%',
    height: 120,
    flexGrow: 1,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: theme.spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.65)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  badgeChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: theme.colors.danger,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  label: {
    fontSize: 12.5,
    lineHeight: 16,
  },
});

export default QuickServicesGrid;
