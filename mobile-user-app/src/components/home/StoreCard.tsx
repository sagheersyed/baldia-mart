import React, { memo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import AppBadge from '../ui/AppBadge';
import FavouriteButton from '../ui/FavouriteButton';
import { normalizeUrl } from '../../api/api';
import { isBusinessOpen } from '../../utils/helpers';
import { theme } from '../../theme/theme';

interface StoreCardProps {
  store: any;
  onPress: () => void;
  onToggleFavourite?: () => void;
  isFavourite?: boolean;
  variant?: 'wide' | 'list';
  meta?: string;
}

/**
 * Foodpanda/Pandamart-style store/restaurant tile.
 * - `wide` is used in horizontal rails and brand listings.
 * - `list` is used in vertical "Deals & Discounts" lists.
 */
const StoreCard = memo(function StoreCard({
  store,
  onPress,
  onToggleFavourite,
  isFavourite = false,
  variant = 'list',
  meta,
}: StoreCardProps) {
  const cover = normalizeUrl(store.coverUrl || store.imageUrl);
  const logo = normalizeUrl(store.logoUrl || store.imageUrl);
  const isOpen = isBusinessOpen(store);

  const eta = store.deliveryTime || '15-40 min';
  const fee = store.deliveryFee != null ? `Rs.${Math.round(Number(store.deliveryFee))}` : null;
  const sponsored = !!store.sponsored || !!store.isAd;
  const hasDeal = !!store.hasDeal || !!store.discountText;

  if (variant === 'wide') {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.wide, pressed ? { opacity: 0.9 } : null]}>
        <View style={styles.wideImgWrap}>
          {cover || logo ? (
            <Image
              source={{ uri: cover || logo! }}
              style={styles.wideImg}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={180}
            />
          ) : (
            <View style={[styles.wideImg, styles.placeholder]}>
              <Ionicons name="storefront" size={28} color={theme.colors.textSecondary} />
            </View>
          )}
          {!isOpen && (
            <View style={styles.closedOverlay}>
              <AppText variant="badge" color="#fff">CLOSED</AppText>
            </View>
          )}
          {hasDeal && (
            <View style={styles.dealBadge}>
              <AppText variant="badge" color="#fff">
                {store.discountText || 'DEAL'}
              </AppText>
            </View>
          )}
          {/* {onToggleFavourite ? (
            <FavouriteButton
              active={isFavourite}
              onPress={onToggleFavourite}
              size={28}
              style={styles.favTopRight}
            />
          ) : null} */}
        </View>
        <View style={styles.wideMeta}>
          <AppText variant="bodyStrong" numberOfLines={1}>{store.name}</AppText>
          <AppText variant="caption" numberOfLines={1}>{eta}{fee ? ` • ${fee}` : ''}</AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed ? { opacity: 0.92 } : null]}>
      <View style={styles.rowImgWrap}>
        {cover || logo ? (
          <Image
            source={{ uri: cover || logo! }}
            style={styles.rowImg}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={180}
          />
        ) : (
          <View style={[styles.rowImg, styles.placeholder]}>
            <Ionicons name="storefront" size={26} color={theme.colors.textSecondary} />
          </View>
        )}
        {!isOpen && (
          <LinearGradient
            colors={['rgba(15,23,42,0.0)', 'rgba(15,23,42,0.7)']}
            style={styles.closedOverlay}
          >
            <AppText variant="badge" color="#fff">CLOSED</AppText>
          </LinearGradient>
        )}
        {sponsored && (
          <View style={styles.sponsored}>
            <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>Ad</AppText>
          </View>
        )}
        {/* {onToggleFavourite ? (
          <FavouriteButton
            active={isFavourite}
            onPress={onToggleFavourite}
            size={28}
            style={styles.favTopRight}
          />
        ) : null} */}
      </View>

      <View style={styles.rowMeta}>
        <AppText variant="title" numberOfLines={1}>{store.name}</AppText>
        <AppText variant="caption" style={{ marginTop: 2 }}>{eta}</AppText>
        <View style={styles.metaRow}>
          {fee ? (
            <View style={styles.metaPill}>
              <Ionicons name="bicycle" size={12} color={theme.colors.textSecondary} />
              <AppText variant="caption">{fee}</AppText>
            </View>
          ) : null}
          {store.proLabel ? (
            <AppBadge label={store.proLabel} variant="pro" />
          ) : null}
        </View>
        {meta ? (
          <AppText variant="caption" color={theme.colors.primary} style={{ marginTop: 4 }}>
            {meta}
          </AppText>
        ) : null}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  // ── wide ──
  wide: { width: 220, marginRight: theme.spacing.md },
  wideImgWrap: {
    width: 220, height: 124,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
  },
  wideImg: { width: '100%', height: '100%' },
  wideMeta: { paddingTop: theme.spacing.sm },

  // ── row ──
  row: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
  },
  rowImgWrap: {
    width: 84,
    height: 84,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
  },
  rowImg: { width: '100%', height: '100%' },
  rowMeta: { flex: 1, justifyContent: 'center', gap: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  placeholder: { alignItems: 'center', justifyContent: 'center' },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.sm,
  },
  dealBadge: {
    position: 'absolute',
    top: 8, left: 8,
    backgroundColor: theme.colors.discount,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  sponsored: {
    position: 'absolute',
    bottom: 6, left: 6,
    backgroundColor: 'rgba(15,23,42,0.65)',
    borderRadius: theme.radius.xs,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  favTopRight: { position: 'absolute', top: 6, right: 6 },
});

export default StoreCard;
