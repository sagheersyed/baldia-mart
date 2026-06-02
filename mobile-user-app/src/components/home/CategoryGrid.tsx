import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet, Pressable, Animated } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import SectionHeader from '../ui/SectionHeader';
import { normalizeUrl } from '../../api/api';
import { theme } from '../../theme/theme';
import { DEFAULT_IMAGES } from '../../constants/images';

interface CategoryGridProps {
  categories: any[];
  onCategoryPress: (cat: any) => void;
  onSeeAll?: () => void;
  variant?: 'mart' | 'food';
}

const TINTS: { bg: [string, string]; icon: string; border: string }[] = [
  { bg: ['#FFF1EA', '#FFE0CF'], icon: theme.colors.palette.orange500, border: '#FFD8C4' },
  { bg: ['#E8F8EE', '#D1FAE5'], icon: '#10B981', border: '#A7F3D0' },
  { bg: ['#FFE7F0', '#FECDD3'], icon: '#E21B70', border: '#FCA5C0' },
  { bg: ['#E3EBFF', '#DBEAFE'], icon: '#3B82F6', border: '#BFDBFE' },
  { bg: ['#F3E8FF', '#EDE9FE'], icon: '#7C3AED', border: '#DDD6FE' },
  { bg: ['#FFFBEB', '#FEF3C7'], icon: '#F59E0B', border: '#FDE68A' },
  { bg: ['#FEE2E2', '#FECACA'], icon: '#EF4444', border: '#FCA5A5' },
  { bg: ['#E5F3FE', '#DBEAFE'], icon: '#0EA5E9', border: '#BAE6FD' },
];

/**
 * Premium category wrap grid, matching the Pharma categories layout.
 */
const CategoryGrid = memo(function CategoryGrid({
  categories,
  onCategoryPress,
  onSeeAll,
}: CategoryGridProps) {
  const [showAll, setShowAll] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!categories?.length) return null;

  const hasMoreThan7 = categories.length > 7;
  const displayedCategories = hasMoreThan7 && !showAll
    ? categories.slice(0, 7)
    : categories;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Shop by Category"
        subtitle={`${categories.length} categories`}
        onAction={onSeeAll}
      />
      <View style={styles.grid}>
        {displayedCategories.map((item, index) => {
          const tint = TINTS[index % TINTS.length];
          const iconUri = normalizeUrl(item.iconUrl || item.imageUrl);
          const isNew = item.isNew || item.createdAt && (Date.now() - new Date(item.createdAt).getTime() < 7 * 86400000);
          return (
            <Pressable
              key={item.id}
              onPress={() => onCategoryPress(item)}
              style={({ pressed }) => [
                styles.tile,
                pressed ? { opacity: 0.85, transform: [{ scale: 0.93 }] } : null,
              ]}
            >
              <View style={[styles.iconBox]}>
                <LinearGradient
                  colors={tint.bg}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Image
                  source={{ uri: imageErrors[item.id] ? DEFAULT_IMAGES.category : (iconUri || DEFAULT_IMAGES.category) }}
                  style={styles.icon}
                  contentFit="cover"
                  cachePolicy="memory-disk"
                  transition={150}
                  onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                />
                {/* New badge */}
                {isNew && (
                  <View style={styles.newBadge}>
                    <AppText variant="badge" color="#fff" style={{ fontSize: 8 }}>NEW</AppText>
                  </View>
                )}
              </View>
              <AppText
                variant="caption"
                color={theme.colors.textPrimary}
                align="center"
                numberOfLines={1}
                style={styles.label}
              >
                {item.name}
              </AppText>
            </Pressable>
          );
        })}

        {hasMoreThan7 && (
          <Pressable
            onPress={() => setShowAll(!showAll)}
            style={({ pressed }) => [
              styles.tile,
              pressed ? { opacity: 0.85, transform: [{ scale: 0.93 }] } : null,
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
              <Ionicons
                name={showAll ? 'chevron-up-outline' : 'grid-outline'}
                size={24}
                color={theme.colors.textSecondary}
              />
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary} align="center" style={styles.label}>
              {showAll ? 'Show Less' : 'Show More'}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingBottom: theme.spacing.sm,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    rowGap: 20,
    marginTop: theme.spacing.sm,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 10,
    ...theme.shadows.sm,
  },
  icon: { width: '100%', height: '100%' },
  newBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: theme.colors.success,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#fff',
    ...theme.shadows.sm,
  },
  label: {
    paddingHorizontal: 4,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
});

export default CategoryGrid;
