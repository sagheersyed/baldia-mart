import React, { memo, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import SectionHeader from '../ui/SectionHeader';
import FavouriteButton from '../ui/FavouriteButton';
import { normalizeUrl } from '../../api/api';
import { isBusinessOpen } from '../../utils/helpers';
import { theme } from '../../theme/theme';

interface BrandStripProps {
  brands: any[];
  onBrandPress: (b: any) => void;
  onSeeAll?: () => void;
  isFavourite?: (id: string) => boolean;
  onToggleFavourite?: (b: any) => void;
  title?: string;
  subtitle?: string;
}

/**
 * Premium brand rail with gradient overlay, delivery time pill, and
 * FoodPanda-style "Popular Shops" visual density.
 */
const BrandStrip = memo(function BrandStrip({
  brands,
  onBrandPress,
  onSeeAll,
  isFavourite,
  onToggleFavourite,
  title = 'Popular Brands',
  subtitle,
}: BrandStripProps) {
  const renderItem = useCallback(({ item }: { item: any }) => {
    const uri = normalizeUrl(item.logoUrl || item.imageUrl);
    const isOpen = isBusinessOpen(item.openingTime, item.closingTime);
    const fav = isFavourite?.(item.id) ?? false;
    const eta = item.deliveryTime || (item.productCount ? `${item.productCount} items` : '15-40 min');

    return (
      <Pressable
        onPress={() => onBrandPress(item)}
        style={({ pressed }) => [
          styles.card,
          pressed ? { opacity: 0.92, transform: [{ scale: 0.97 }] } : null,
        ]}
      >
        <View style={styles.imgWrap}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.img}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={styles.imgPlaceholder}>
              <Ionicons name="storefront" size={30} color={theme.colors.textSecondary} />
            </View>
          )}

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.5)']}
            start={{ x: 0, y: 0.4 }}
            end={{ x: 0, y: 1 }}
            style={styles.imgGradient}
          />

          {/* Delivery time pill on image */}
          <View style={styles.etaPill}>
            <Ionicons name="bicycle-outline" size={11} color="#fff" />
            <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>{eta}</AppText>
          </View>

          {!isOpen && (
            <View style={styles.closedOverlay}>
              <AppText variant="badge" color="#fff">CLOSED</AppText>
            </View>
          )}
          {onToggleFavourite ? (
            <FavouriteButton
              active={fav}
              onPress={() => onToggleFavourite(item)}
              size={26}
              style={styles.favBtn}
            />
          ) : null}
        </View>
        <AppText variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {item.name}
        </AppText>
      </Pressable>
    );
  }, [onBrandPress, isFavourite, onToggleFavourite]);

  if (!brands?.length) return null;

  return (
    <View style={styles.wrap}>
      <SectionHeader title={title} subtitle={subtitle} onAction={onSeeAll} />
      <FlatList
        data={brands}
        horizontal
        keyExtractor={(b) => b.id}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        initialNumToRender={6}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { paddingBottom: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.sm },
  card: { width: 136, marginRight: theme.spacing.sm },
  imgWrap: {
    width: 136,
    height: 136,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadows.md,
    marginBottom: theme.spacing.sm,
  },
  img: { width: '100%', height: '100%' },
  imgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surfaceMuted,
  },
  imgGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 60,
  },
  etaPill: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: theme.radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: { position: 'absolute', top: 6, right: 6 },
  name: { marginBottom: 2 },
});

export default BrandStrip;
