// CategoryGrid.tsx — Redesigned v4 (Borderless, full category image)
// Features: Full image background/content, borderless layout, dark mode aware

import React, { memo, useState } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import SectionHeader from '../ui/SectionHeader';
import { normalizeUrl } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_IMAGES } from '../../constants/images';

interface CategoryGridProps {
  categories: any[];
  onCategoryPress: (cat: any) => void;
  onSeeAll?: () => void;
  variant?: 'mart' | 'food';
}

// Background tints (no borders)
const TINTS: { bg: [string, string]; glow: string }[] = [
  { bg: ['#FFF7ED', '#FFE8D6'], glow: '#FF8C5415' },
  { bg: ['#F0FDF4', '#D1FAE5'], glow: '#10B98115' },
  { bg: ['#FDF2F8', '#FCE7F3'], glow: '#EC489915' },
  { bg: ['#EFF6FF', '#DBEAFE'], glow: '#3B82F615' },
  { bg: ['#F5F3FF', '#EDE9FE'], glow: '#7C3AED15' },
  { bg: ['#FEFCE8', '#FEF9C3'], glow: '#EAB30815' },
  { bg: ['#FEF2F2', '#FEE2E2'], glow: '#EF444415' },
  { bg: ['#F0FDFA', '#CCFBF1'], glow: '#0D948815' },
];

const CategoryGrid = memo(function CategoryGrid({
  categories,
  onCategoryPress,
  onSeeAll,
}: CategoryGridProps) {
  const { theme } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  if (!categories?.length) return null;

  const hasMore = categories.length > 7;
  const displayed = hasMore && !showAll ? categories.slice(0, 7) : categories;

  return (
    <View style={styles.section}>
      <SectionHeader
        title="Shop by Category"
        subtitle={`${categories.length} categories`}
        onAction={onSeeAll}
      />
      <View style={styles.grid}>
        {displayed.map((item, index) => {
          const tint = TINTS[index % TINTS.length];
          const iconUri = normalizeUrl(item.iconUrl || item.imageUrl);
          const isNew = item.isNew || (item.createdAt && Date.now() - new Date(item.createdAt).getTime() < 7 * 86400000);

          return (
            <Pressable
              key={item.id}
              onPress={() => onCategoryPress(item)}
              style={({ pressed }) => [
                styles.tile,
                pressed ? { opacity: 0.85, transform: [{ scale: 0.92 }] } : null,
              ]}
            >
              {/* Box (No borders) */}
              <View style={styles.iconBox}>
                <LinearGradient
                  colors={tint.bg}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Image
                  source={{ uri: imageErrors[item.id] ? DEFAULT_IMAGES.category : (iconUri || DEFAULT_IMAGES.category) }}
                  style={styles.icon}
                  contentFit="cover" // Full category image
                  cachePolicy="memory-disk"
                  transition={150}
                  onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
                />
                {isNew && (
                  <View style={[styles.newBadge, { backgroundColor: theme.colors.success }]}>
                    <AppText variant="badge" color="#fff" style={{ fontSize: 7, fontWeight: '800' }}>NEW</AppText>
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

        {/* Show More / Show Less tile */}
        {hasMore && (
          <Pressable
            onPress={() => setShowAll(!showAll)}
            style={({ pressed }) => [
              styles.tile,
              pressed ? { opacity: 0.85, transform: [{ scale: 0.92 }] } : null,
            ]}
          >
            <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons
                name={showAll ? 'chevron-up-outline' : 'grid-outline'}
                size={26}
                color={theme.colors.textSecondary}
              />
            </View>
            <AppText variant="caption" color={theme.colors.textSecondary} align="center" style={styles.label}>
              {showAll ? 'Less' : `+${categories.length - 7}`}
            </AppText>
          </Pressable>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  section: {
    paddingBottom: 8,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    rowGap: 14,
    marginTop: 8,
  },
  tile: {
    width: '25%',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  iconBox: {
    width: 74,
    height: 74,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 8,
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  icon: { width: '100%', height: '100%' }, // Full category image filling container
  newBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 2,
    borderColor: '#fff',
  },
  label: {
    fontSize: 11.5,
    fontWeight: '600',
    lineHeight: 15,
  },
});

export default CategoryGrid;
