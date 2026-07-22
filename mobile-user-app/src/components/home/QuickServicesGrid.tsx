import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import { theme } from '../../theme/theme';

export interface QuickService {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  bg: string | [string, string];
  fg: string;
  onPress: () => void;
  badge?: string;
}

interface Props {
  services: QuickService[];
  variant?: 'rail' | 'grid';
}

/**
 * Foodpanda / Pandamart-style quick service cards —
 * white surfaces, soft tinted icon wells, thin borders.
 */
const QuickServicesGrid = memo(function QuickServicesGrid({
  services,
  variant = 'rail',
}: Props) {
  const Item = useMemo(() => {
    return ({ item }: { item: QuickService }) => {
      if (!item) return null;

      const tintBg = Array.isArray(item.bg) ? item.bg[0] : (item.bg as string);

      return (
        <Pressable
          onPress={item.onPress}
          style={({ pressed }) => [
            styles.card,
            variant === 'grid' ? styles.gridCard : styles.railCard,
            pressed ? { opacity: 0.88, transform: [{ scale: 0.97 }] } : null,
          ]}
        >
          {item.badge ? (
            <View style={[styles.badgeChip, { backgroundColor: item.fg }]}>
              <AppText variant="badge" color="#fff" style={styles.badgeText}>
                {item.badge}
              </AppText>
            </View>
          ) : null}

          <View style={[styles.iconCircle, { backgroundColor: tintBg }]}>
            <Ionicons
              name={
                (Ionicons.glyphMap[`${item.icon}-outline` as keyof typeof Ionicons.glyphMap]
                  ? `${item.icon}-outline`
                  : item.icon) as keyof typeof Ionicons.glyphMap
              }
              size={26}
              color={item.fg}
            />
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
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: 10,
  },
  gridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingTop: 18,
    paddingBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.sm,
  },
  railCard: {
    width: 110,
    height: 128,
    marginRight: 10,
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
    marginBottom: 10,
  },
  badgeChip: {
    position: 'absolute',
    top: 8,
    right: 8,
    borderRadius: theme.radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: {
    fontSize: 8,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default QuickServicesGrid;
