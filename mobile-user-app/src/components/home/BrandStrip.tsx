// BrandStrip.tsx — Premium redesign v3
// Circular bubble brand avatars, dark mode via ThemeContext

import React, { memo, useCallback, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import SectionHeader from '../ui/SectionHeader';
import FavouriteButton from '../ui/FavouriteButton';
import { normalizeUrl } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_IMAGES } from '../../constants/images';

interface BrandStripProps {
  brands: any[];
  onBrandPress: (b: any) => void;
  onSeeAll?: () => void;
  isFavourite?: (id: string) => boolean;
  onToggleFavourite?: (b: any) => void;
  title?: string;
  subtitle?: string;
}

const BrandStrip = memo(function BrandStrip({
  brands,
  onBrandPress,
  onSeeAll,
  isFavourite,
  onToggleFavourite,
  title = 'Popular Brands',
  subtitle,
}: BrandStripProps) {
  const { theme } = useTheme();
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  const renderItem = useCallback(({ item }: { item: any }) => {
    const originalUri = normalizeUrl(item.logoUrl || item.imageUrl);
    const uri = imageErrors[item.id]
      ? DEFAULT_IMAGES.brand
      : (originalUri || DEFAULT_IMAGES.brand);
    const fav = isFavourite?.(item.id) ?? false;
    const countText = item.productCount ? `${item.productCount} items` : null;

    return (
      <Pressable
        onPress={() => onBrandPress(item)}
        style={({ pressed }) => [
          styles.card,
          pressed ? { opacity: 0.9, transform: [{ scale: 0.95 }] } : null,
        ]}
      >
        {/* Circular avatar */}
        <View style={[
          styles.circle,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.isDark ? '#000' : '#0A0F1E',
          }
        ]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.img}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
              onError={() => setImageErrors(prev => ({ ...prev, [item.id]: true }))}
            />
          ) : (
            <Ionicons name="storefront" size={22} color={theme.colors.textSecondary} />
          )}
          {onToggleFavourite ? (
            <FavouriteButton
              active={fav}
              onPress={() => onToggleFavourite(item)}
              size={22}
              style={styles.favBtn}
            />
          ) : null}
        </View>

        <AppText
          variant="caption"
          color={theme.colors.textPrimary}
          align="center"
          numberOfLines={1}
          style={styles.name}
        >
          {item.name}
        </AppText>
        {countText && (
          <AppText
            variant="caption"
            color={theme.colors.textSecondary}
            align="center"
            numberOfLines={1}
            style={styles.count}
          >
            {countText}
          </AppText>
        )}
      </Pressable>
    );
  }, [onBrandPress, isFavourite, onToggleFavourite, imageErrors, theme]);

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
  wrap: { paddingBottom: 16 },
  list: { paddingHorizontal: 16, gap: 20, paddingBottom: 4 },
  card: { width: 100, alignItems: 'center' },
  circle: {
    width: 100,
    height: 100,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    // borderWidth: 1.5,
    marginBottom: 7,
    position: 'relative',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  img: { width: '100%', height: '100%', borderRadius: 10 },
  favBtn: { position: 'absolute', bottom: -4, right: -4 },
  name: { fontSize: 11, fontWeight: '600', width: '100%' },
  count: { fontSize: 9.5, width: '100%', marginTop: 1 },
});

export default BrandStrip;
