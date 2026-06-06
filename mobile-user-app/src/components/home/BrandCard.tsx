// BrandCard.tsx — Redesigned v4 (No circular bubbles)
// Wide variant: Rounded square (squircle) card with 14px borderRadius
// List variant: Clean card row with rounded square logo
// Dark mode via ThemeContext

import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import FavouriteButton from '../ui/FavouriteButton';
import { normalizeUrl } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import { DEFAULT_IMAGES } from '../../constants/images';

interface BrandCardProps {
  brand: any;
  onPress: () => void;
  onToggleFavourite?: () => void;
  isFavourite?: boolean;
  variant?: 'wide' | 'list';
  meta?: string;
}

const BrandCard = memo(function BrandCard({
  brand,
  onPress,
  onToggleFavourite,
  isFavourite = false,
  variant = 'list',
  meta,
}: BrandCardProps) {
  const { theme } = useTheme();
  const logo = normalizeUrl(brand.logoUrl || brand.imageUrl);
  const uri = logo || DEFAULT_IMAGES.brand;
  const countText = brand.productCount ? `${brand.productCount} items` : null;
  const displayMeta = meta || countText;

  if (variant === 'wide') {
    // Squircle/rounded-square card instead of a circle
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.wide,
          pressed ? { opacity: 0.9, transform: [{ scale: 0.96 }] } : null,
        ]}
      >
        <View style={[
          styles.wideSquare,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
            shadowColor: theme.colors.isDark ? '#000' : '#0A0F1E',
          }
        ]}>
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.wideImg}
              contentFit="contain"
              cachePolicy="memory-disk"
              transition={150}
            />
          ) : (
            <View style={[styles.wideImg, styles.placeholder]}>
              <Ionicons name="storefront" size={24} color={theme.colors.textSecondary} />
            </View>
          )}
          {onToggleFavourite && (
            <FavouriteButton
              active={isFavourite}
              onPress={onToggleFavourite}
              size={22}
              style={styles.wideFav}
            />
          )}
        </View>
        <AppText
          variant="caption"
          color={theme.colors.textPrimary}
          align="center"
          numberOfLines={1}
          style={styles.wideName}
        >
          {brand.name}
        </AppText>
        {displayMeta && (
          <AppText
            variant="caption"
            color={theme.colors.textSecondary}
            align="center"
            numberOfLines={1}
            style={styles.wideMeta}
          >
            {displayMeta}
          </AppText>
        )}
      </Pressable>
    );
  }

  // List variant — rounded-square logo card
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.isDark ? '#000' : '#0A0F1E',
        },
        pressed ? { opacity: 0.9, transform: [{ scale: 0.99 }] } : null,
      ]}
    >
      <View style={[styles.rowAvatar, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
        {uri ? (
          <Image
            source={{ uri }}
            style={styles.rowImg}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <Ionicons name="storefront" size={22} color={theme.colors.textSecondary} />
        )}
      </View>

      <View style={styles.rowMeta}>
        <AppText variant="bodyStrong" color={theme.colors.textPrimary} numberOfLines={1}>
          {brand.name}
        </AppText>
        {brand.category && (
          <AppText variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
            {brand.category}
          </AppText>
        )}
        {displayMeta && (
          <AppText variant="captionStrong" color={theme.colors.primary} style={{ marginTop: 2 }}>
            {displayMeta}
          </AppText>
        )}
      </View>

      <View style={styles.rowRight}>
        {onToggleFavourite && (
          <FavouriteButton active={isFavourite} onPress={onToggleFavourite} size={22} />
        )}
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // Wide (Squircle/Rounded Square)
  wide: {
    width: 88,
    alignItems: 'center',
  },
  wideSquare: {
    width: 80,
    height: 80,
    borderRadius: 16, // squircle radius
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
    borderWidth: 1,
    marginBottom: 7,
    position: 'relative',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  wideImg: { width: '85%', height: '85%', borderRadius: 12 },
  wideFav: { position: 'absolute', bottom: -4, right: -4 },
  wideName: { fontSize: 11, fontWeight: '600', width: '100%', marginTop: 2 },
  wideMeta: { fontSize: 9.5, width: '100%', marginTop: 1 },

  // List
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 5,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  rowAvatar: {
    width: 58,
    height: 58,
    borderRadius: 12, // rounded-square instead of circle
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  rowImg: { width: '90%', height: '90%' },
  rowMeta: { flex: 1, gap: 2 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 },

  placeholder: { alignItems: 'center', justifyContent: 'center' },
});

export default BrandCard;
