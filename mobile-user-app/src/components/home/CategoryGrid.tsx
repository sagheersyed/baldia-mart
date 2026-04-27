import React, { memo } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import { normalizeUrl } from '../../api/api';
import { theme } from '../../theme/theme';

interface CategoryGridProps {
  categories: any[];
  onCategoryPress: (cat: any) => void;
  variant?: 'mart' | 'food';
}

const TINTS = [
  { bg: '#FFF1EA', icon: theme.colors.palette.orange500 },
  { bg: '#E8F8EE', icon: '#10B981' },
  { bg: '#FFE7F0', icon: '#E21B70' },
  { bg: '#E3EBFF', icon: '#3B82F6' },
  { bg: '#F3E8FF', icon: '#7C3AED' },
  { bg: '#FFFBEB', icon: '#F59E0B' },
  { bg: '#FEE2E2', icon: '#EF4444' },
  { bg: '#E5F3FE', icon: '#0EA5E9' },
];

/**
 * Bento-style horizontal category rail (Foodpanda Pandamart inspired).
 * Each card is a colored tile with an emoji/icon and a one/two-line label.
 */
const CategoryGrid = memo(function CategoryGrid({
  categories,
  onCategoryPress,
}: CategoryGridProps) {
  if (!categories?.length) return null;

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const tint = TINTS[index % TINTS.length];
    const iconUri = normalizeUrl(item.iconUrl || item.imageUrl);
    return (
      <Pressable
        onPress={() => onCategoryPress(item)}
        style={({ pressed }) => [
          styles.tile,
          pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
        ]}
      >
        <View style={[styles.iconBox, { backgroundColor: tint.bg }]}>
          {iconUri ? (
            <Image
              source={{ uri: iconUri }}
              style={styles.icon}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Ionicons name="grid" size={22} color={tint.icon} />
          )}
        </View>
        <AppText
          variant="captionStrong"
          color={theme.colors.textPrimary}
          align="center"
          numberOfLines={2}
          style={styles.label}
        >
          {item.name}
        </AppText>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={categories}
      keyExtractor={(c) => c.id}
      renderItem={renderItem}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
    />
  );
});

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  tile: {
    width: theme.sizes.categoryCardW,
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  iconBox: {
    width: 76,
    height: 76,
    borderRadius: theme.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
  },
  icon: { width: '100%', height: '100%' },
  label: { paddingHorizontal: 2, lineHeight: 14 },
});

export default CategoryGrid;
