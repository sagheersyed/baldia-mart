import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
 * Bento-style quick service cards. The "rail" variant is the Pandamart-like
 * horizontal scroll of large colored tiles. The "grid" variant lays them out
 * in a 4-column grid.
 */
const QuickServicesGrid = memo(function QuickServicesGrid({
  services,
  variant = 'rail',
}: Props) {
  const Item = useMemo(() => ({ item }: { item: QuickService }) => (
    <Pressable
      onPress={item.onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: item.bg },
        variant === 'grid' ? styles.gridCard : styles.railCard,
        pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      {item.badge ? (
        <View style={styles.badgeChip}>
          <AppText variant="badge" color={theme.colors.danger}>
            {item.badge}
          </AppText>
        </View>
      ) : null}
      <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.55)' }]}>
        <Ionicons name={item.icon} size={26} color={item.fg} />
      </View>
      <AppText variant="bodyStrong" color={theme.colors.textHeader} numberOfLines={2} align="center">
        {item.title}
      </AppText>
    </Pressable>
  ), [variant]);

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
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  railCard: {
    width: 116,
    height: 124,
    marginRight: theme.spacing.md,
  },
  gridCard: {
    width: '47%',
    height: 110,
    flexGrow: 1,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: theme.spacing.sm,
  },
  badgeChip: {
    position: 'absolute',
    top: 8, left: 8,
    backgroundColor: '#fff',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
});

export default QuickServicesGrid;
