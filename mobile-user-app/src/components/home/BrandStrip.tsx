import React, { memo, useCallback } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
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
 * Foodpanda-style "Popular Shops" rail. Each card is a logo tile + name +
 * delivery time hint, with a heart overlay if a favourite handler is provided.
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
          pressed ? { opacity: 0.92, transform: [{ scale: 0.98 }] } : null,
        ]}
      >
        <View style={styles.imgWrap}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.img}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <Ionicons name="storefront" size={26} color={theme.colors.textSecondary} />
          )}
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
        <AppText variant="caption" numberOfLines={1}>{eta}</AppText>
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
  list: { paddingHorizontal: theme.spacing.lg, gap: theme.spacing.md },
  card: { width: 124, marginRight: theme.spacing.md },
  imgWrap: {
    width: 124,
    height: 124,
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadows.sm,
    marginBottom: theme.spacing.sm,
  },
  img: { width: '100%', height: '100%' },
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
