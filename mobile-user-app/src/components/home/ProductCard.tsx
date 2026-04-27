import React, { memo, useMemo } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import AppText from '../ui/AppText';
import PriceText from '../ui/PriceText';
import FavouriteButton from '../ui/FavouriteButton';
import QuantityStepper from '../ui/QuantityStepper';
import { isBusinessOpen } from '../../utils/helpers';
import { normalizeUrl } from '../../api/api';
import { theme } from '../../theme/theme';

export interface ProductCardProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
  price: number | string;
  discount?: number | string;
  discountPercent?: number | null;
  unit?: string | null;
  weight?: string | null;
  stockQuantity?: number;
  stock?: number;
  openingTime?: string | null;
  closingTime?: string | null;
  category?: { name?: string; openingTime?: string | null; closingTime?: string | null } | null;
  brand?: { name?: string; openingTime?: string | null; closingTime?: string | null } | null;
  maxQuantityPerOrder?: number;
}

interface ProductCardProps {
  product: ProductCardProduct;
  cartQty: number;
  variant?: 'horizontal' | 'grid';
  isFavourite?: boolean;
  onPress?: () => void;
  onAdd: () => void;
  onIncrement?: () => void;
  onDecrement?: () => void;
  onToggleFavourite?: () => void;
  tint?: string;
}

const ProductCard = memo(function ProductCard({
  product,
  cartQty,
  variant = 'grid',
  isFavourite,
  onPress,
  onAdd,
  onIncrement,
  onDecrement,
  onToggleFavourite,
  tint = theme.colors.primary,
}: ProductCardProps) {
  const stock = product.stock ?? product.stockQuantity ?? 1;
  const isOOS = stock <= 0;

  const businessClosed = useMemo(() => {
    const productOpen = isBusinessOpen(product.openingTime, product.closingTime);
    const brandOpen = !product.brand || isBusinessOpen(product.brand?.openingTime, product.brand?.closingTime);
    const categoryOpen = !product.category || isBusinessOpen(product.category?.openingTime, product.category?.closingTime);
    return !productOpen || !brandOpen || !categoryOpen;
  }, [product]);

  const blocked = isOOS || businessClosed;
  const numericPrice = Number(product.price);
  const numericDiscount = Number(product.discount || 0);
  const finalPrice = numericPrice - numericDiscount;
  const hasDiscount = numericDiscount > 0;
  const computedPercent = hasDiscount && numericPrice > 0
    ? Math.max(1, Math.round((numericDiscount / numericPrice) * 100))
    : 0;
  const discountPercent = product.discountPercent || computedPercent;

  const containerStyle = variant === 'horizontal' ? styles.horizontal : styles.grid;
  const subline = product.weight || product.unit || product.brand?.name || product.category?.name;
  const maxedOut = product.maxQuantityPerOrder ? cartQty >= product.maxQuantityPerOrder : false;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        containerStyle,
        pressed ? { opacity: 0.95, transform: [{ scale: 0.98 }] } : null,
      ]}
    >
      <View style={styles.imageWrap}>
        {product.imageUrl ? (
          <Image
            source={{ uri: normalizeUrl(product.imageUrl) || product.imageUrl! }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="image-outline" size={32} color={theme.colors.textMuted} />
          </View>
        )}

        {discountPercent > 0 && !blocked && (
          <View style={styles.discountBadge}>
            <AppText variant="badge" color="#fff">-{discountPercent}%</AppText>
          </View>
        )}

        {blocked && (
          <View style={styles.blockedOverlay}>
            <AppText variant="badge" color="#fff">
              {businessClosed ? 'Currently Closed' : 'Out of Stock'}
            </AppText>
          </View>
        )}

        {onToggleFavourite ? (
          <FavouriteButton
            active={!!isFavourite}
            onPress={onToggleFavourite}
            size={28}
            style={styles.heartBtn}
          />
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText variant="bodyStrong" numberOfLines={2} style={styles.name}>
          {product.name}
        </AppText>
        {subline ? (
          <AppText variant="caption" numberOfLines={1} style={styles.subline}>
            {subline}
          </AppText>
        ) : null}

        <View style={styles.priceRow}>
          <View style={styles.priceCol}>
            <PriceText
              price={finalPrice}
              oldPrice={hasDiscount ? numericPrice : undefined}
              align="vertical"
              size="md"
            />
          </View>
          {cartQty > 0 && onIncrement && onDecrement ? (
            <QuantityStepper
              quantity={cartQty}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              disabled={blocked || maxedOut}
              size="sm"
              tint={tint}
            />
          ) : (
            <Pressable
              onPress={onAdd}
              disabled={blocked}
              style={({ pressed }) => [
                styles.addBtn,
                { backgroundColor: tint },
                blocked ? styles.addBtnDisabled : null,
                pressed ? { transform: [{ scale: 0.95 }] } : null,
              ]}
              hitSlop={6}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </Pressable>
  );
});

const CARD_PADDING = theme.spacing.md;
const IMG_HEIGHT = 116;

const styles = StyleSheet.create({
  grid: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: CARD_PADDING,
    margin: 6,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  horizontal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: CARD_PADDING,
    width: theme.sizes.productCardWLg,
    marginRight: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  imageWrap: {
    width: '100%',
    height: IMG_HEIGHT,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    marginBottom: theme.spacing.sm,
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  discountBadge: {
    position: 'absolute',
    top: 8, left: 8,
    backgroundColor: theme.colors.discount,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 6, paddingVertical: 3,
  },
  blockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: theme.spacing.sm,
  },
  heartBtn: { position: 'absolute', top: 6, right: 6 },

  body: { paddingTop: 2, gap: 2 },
  name: { lineHeight: 18 },
  subline: { marginTop: 2 },

  priceRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceCol: { flex: 1 },
  addBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...theme.shadows.sm,
  },
  addBtnDisabled: {
    backgroundColor: theme.colors.borderStrong,
    shadowOpacity: 0,
  },
});

export default ProductCard;
