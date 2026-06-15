// ProductCard.tsx — Redesigned v4 (Minimalist premium aesthetic)
// Features: Clean white card, flat tag discount badge, white '+ ADD' action pill,
//           improved detail sheet modal, dark mode via ThemeContext

import React, { memo, useMemo, useState, useRef, useEffect } from 'react';
import {
  View, StyleSheet, Pressable, Modal,
  ScrollView, Dimensions, Animated, PanResponder, Text,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import FavouriteButton from '../ui/FavouriteButton';
import { isBusinessOpen } from '../../utils/helpers';
import { normalizeUrl } from '../../api/api';
import { useTheme } from '../../context/ThemeContext';
import SleekExpandModal from '../animations/SleekExpandModal';
import { DEFAULT_IMAGES } from '../../constants/images';

const { height: SCREEN_H } = Dimensions.get('window');

export interface ProductCardProduct {
  id: string;
  name: string;
  imageUrl?: string | null;
  price?: number | string;
  mrp?: number | string;
  prescriptionRequired?: boolean;
  requiresPrescription?: boolean;
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
  description?: string;
  isPharma?: boolean;
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
  tint: tintProp,
}: ProductCardProps) {
  const { theme } = useTheme();
  const tint = tintProp ?? theme.colors.primary;

  const [detailVisible, setDetailVisible] = useState(false);
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [startLayout, setStartLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const cardRef = useRef<View>(null);
  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (detailVisible) {
      translateY.setValue(SCREEN_H);
      backdropOpacity.setValue(0);
      Animated.parallel([
        Animated.timing(backdropOpacity, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }),
      ]).start();
    }
  }, [detailVisible]);

  const closeModal = () => {
    setDetailVisible(false);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => isScrollAtTop && gs.dy > 5,
      onPanResponderMove: (_, gs) => { if (gs.dy > 0) translateY.setValue(gs.dy); },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 120 || gs.vy > 0.5) closeModal();
        else Animated.spring(translateY, { toValue: 0, damping: 18, stiffness: 140, useNativeDriver: true }).start();
      },
    })
  ).current;

  const stock = product.stock ?? product.stockQuantity;
  const isOOS = stock !== undefined ? stock <= 0 : false;
  const isLowStock = stock !== undefined ? (stock > 0 && stock <= 5) : false;

  const businessClosed = useMemo(() => {
    const productOpen = isBusinessOpen(product.openingTime, product.closingTime);
    const brandOpen = !product.brand || isBusinessOpen(product.brand?.openingTime, product.brand?.closingTime);
    const catOpen = !product.category || isBusinessOpen(product.category?.openingTime, product.category?.closingTime);
    return !productOpen || !brandOpen || !catOpen;
  }, [product]);

  const blocked = isOOS || businessClosed;
  const numericPrice = Number(product.price || product.mrp || 0);
  const numericDiscount = Number(product.discount || 0);
  const finalPrice = numericPrice - numericDiscount;
  const hasDiscount = numericDiscount > 0;
  const computedPct = hasDiscount && numericPrice > 0
    ? Math.max(1, Math.round((numericDiscount / numericPrice) * 100))
    : 0;
  const discountPercent = product.discountPercent || computedPct;

  const subline = product.weight || product.unit || product.brand?.name || product.category?.name;
  const maxedOut = product.maxQuantityPerOrder ? cartQty >= product.maxQuantityPerOrder : false;

  const imgUri = imageError
    ? DEFAULT_IMAGES.product
    : (normalizeUrl(product.imageUrl ?? (product as any).image_url) || DEFAULT_IMAGES.product);

  const handleCardPress = () => {
    cardRef.current?.measure((x, y, w, h, px, py) => {
      setStartLayout({ x: px, y: py, width: w, height: h });
      if (onPress) onPress();
      else setDetailVisible(true);
    });
  };

  const isGrid = variant === 'grid';

  return (
    <>
      <View ref={cardRef} collapsable={false}>
        <Pressable
          onPress={handleCardPress}
          style={({ pressed }) => [
            isGrid ? styles.grid : styles.horizontal,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            pressed ? { transform: [{ scale: 0.97 }] } : null,
          ]}
        >
        {/* Image Box */}
        <View style={[styles.imageWrap, { backgroundColor: theme.colors.isDark ? theme.colors.surfaceMuted : '#F8FAFC' }]}>
          <Image
            source={{ uri: imgUri }}
            style={styles.image}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={200}
            onError={() => setImageError(true)}
          />

          {/* Flat Tag discount badge (looks much cleaner) */}
          {discountPercent > 0 && !blocked && (
            <View style={[styles.discountTag, { backgroundColor: theme.colors.danger }]}>
              <Text style={styles.discountTagText}>{discountPercent}% OFF</Text>
            </View>
          )}

          {/* Low stock tag */}
          {isLowStock && !blocked && (
            <View style={[styles.lowStockBadge, { backgroundColor: theme.colors.warningLight, borderColor: theme.colors.warningBorder }]}>
              <Text style={[styles.lowStockText, { color: theme.colors.warning }]}>{stock} left</Text>
            </View>
          )}

          {/* Blocked overlay */}
          {blocked && (
            <View style={styles.blockedOverlay}>
              <View style={styles.blockedPill}>
                <Text style={styles.blockedText}>
                  {businessClosed ? 'CLOSED' : 'Out Of Stock'}
                </Text>
              </View>
            </View>
          )}

          {/* Favourite button */}
          {onToggleFavourite ? (
            <FavouriteButton
              active={!!isFavourite}
              onPress={onToggleFavourite}
              size={26}
              style={styles.heartBtn}
            />
          ) : null}
        </View>

        {/* Body info */}
        <View style={styles.body}>
          <AppText
            variant="bodyStrong"
            color={theme.colors.textPrimary}
            numberOfLines={2}
            style={styles.name}
          >
            {product.name}
          </AppText>

          {subline ? (
            <AppText variant="caption" color={theme.colors.textSecondary} style={styles.subline} numberOfLines={1}>
              {subline}
            </AppText>
          ) : (
            <View style={{ height: 14 }} />
          )}

          {/* Price + Add Row */}
          <View style={styles.bottomRow}>
            <View style={styles.priceCol}>
              <AppText variant="price" color={theme.colors.textHeader} style={styles.finalPrice}>
                Rs.{Math.round(finalPrice).toLocaleString()}
              </AppText>
              {hasDiscount && (
                <AppText variant="pricePrev" style={styles.oldPrice}>
                  Rs.{Math.round(numericPrice).toLocaleString()}
                </AppText>
              )}
            </View>

            {!blocked && (
              <View style={styles.actionCol}>
                {cartQty > 0 && onIncrement && onDecrement ? (
                  <View style={[styles.stepper, { backgroundColor: tint }]}>
                    <Pressable onPress={onDecrement} style={styles.stepperBtn} hitSlop={8}>
                      <Ionicons name="remove" size={13} color="#fff" />
                    </Pressable>
                    <Text style={styles.stepperQty}>{cartQty}</Text>
                    <Pressable onPress={onIncrement} style={styles.stepperBtn} disabled={maxedOut} hitSlop={8}>
                      <Ionicons name="add" size={13} color="#fff" />
                    </Pressable>
                  </View>
                ) : (
                  // Minimalist additive button (White outline with primary color text)
                  <Pressable
                    onPress={(e) => { e.stopPropagation(); onAdd(); }}
                    style={({ pressed }) => [
                      styles.addPill,
                      { borderColor: tint },
                      pressed ? { backgroundColor: tint + '12' } : null,
                    ]}
                    hitSlop={6}
                  >
                    <Text style={[styles.addText, { color: tint }]}>ADD</Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </View>

      {/* Product Detail Modal with Premium Expansion Animation */}
      <SleekExpandModal
        visible={detailVisible}
        onClose={closeModal}
        startLayout={startLayout}
        theme={theme}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.modalContent}
          onScroll={(e) => setIsScrollAtTop(e.nativeEvent.contentOffset.y <= 0)}
          scrollEventThrottle={16}
        >
          <View style={[styles.modalImageWrap, { backgroundColor: theme.colors.isDark ? theme.colors.surfaceMuted : '#EFF3FF' }]}>
            <Image
              source={{ uri: imgUri }}
              style={styles.modalImage}
              contentFit="cover"
              cachePolicy="memory-disk"
              onError={() => setImageError(true)}
            />
            {discountPercent > 0 && !blocked && (
              <View style={[styles.discountTag, { backgroundColor: theme.colors.danger, position: 'absolute', top: 12, left: 12 }]}>
                <Text style={styles.discountTagText}>{discountPercent}% OFF</Text>
              </View>
            )}
          </View>

          <View style={styles.modalInfo}>
            {product.brand?.name && (
              <AppText variant="overline" color={tint} style={{ marginBottom: 4 }}>
                {product.brand.name}
              </AppText>
            )}
            <AppText variant="h2" color={theme.colors.textHeader} style={styles.modalName}>
              {product.name}
            </AppText>
            {subline && (
              <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
                {subline}
              </AppText>
            )}

            <View style={styles.modalPriceRow}>
              <AppText variant="display" color={tint} style={styles.modalPrice}>
                Rs. {Math.round(finalPrice).toLocaleString()}
              </AppText>
              {hasDiscount && (
                <AppText variant="pricePrev" style={styles.modalOldPrice}>
                  Rs. {Math.round(numericPrice).toLocaleString()}
                </AppText>
              )}
            </View>

            <View style={styles.trustRow}>
              <TrustChip icon="bicycle" label="30 min" tint={tint} theme={theme} />
              <TrustChip icon="shield-checkmark" label="Verified" tint={tint} theme={theme} />
              <TrustChip icon="refresh" label="Easy Returns" tint={tint} theme={theme} />
            </View>

            <View style={[styles.modalDivider, { backgroundColor: theme.colors.divider }]} />

            <View style={styles.modalSection}>
              <AppText variant="title" color={theme.colors.textHeader} style={{ marginBottom: 8 }}>
                Product Details
              </AppText>
              <AppText variant="body" color={theme.colors.textSecondary} style={styles.modalDesc}>
                {product.description ||
                  'Premium quality product. Carefully sourced and packed to meet the highest safety and hygiene standards. Enjoy with BaldiaMart\'s 100% satisfaction guarantee.'}
              </AppText>
            </View>

            {/* Specifications Section */}
            <View style={[styles.modalSection, { marginTop: 16 }]}>
              <AppText variant="title" color={theme.colors.textHeader} style={{ marginBottom: 12 }}>
                Specifications
              </AppText>
              <View style={[styles.specTable, { backgroundColor: theme.colors.surfaceMuted, borderColor: theme.colors.border }]}>
                <SpecRow label="Category" value={product.category?.name || 'Groceries'} theme={theme} last={false} />
                {product.brand?.name && (
                  <SpecRow label="Brand" value={product.brand.name} theme={theme} last={false} />
                )}
                <SpecRow label="Quality" value="Verified Fresh ✓" theme={theme} last valueColor={theme.colors.success} />
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.modalFooter, { backgroundColor: theme.colors.surface, borderTopColor: theme.colors.border }]}>
          {blocked ? (
            <View style={[styles.blockedFooterBtn, { backgroundColor: theme.colors.surfaceMuted }]}>
              <Ionicons name="time" size={18} color={theme.colors.textSecondary} />
              <AppText variant="bodyStrong" color={theme.colors.textSecondary} style={{ marginLeft: 8 }}>
                {businessClosed ? 'Store Currently Closed' : 'Out of Stock'}
              </AppText>
            </View>
          ) : cartQty > 0 && onIncrement && onDecrement ? (
            <View style={[styles.modalStepper, { backgroundColor: tint }]}>
              <Pressable onPress={onDecrement} style={styles.modalStepperBtn} hitSlop={12}>
                <Ionicons name="remove" size={22} color="#fff" />
              </Pressable>
              <AppText variant="h3" color="#fff" style={styles.modalStepperQty}>
                {cartQty} in basket
              </AppText>
              <Pressable onPress={onIncrement} style={styles.modalStepperBtn} disabled={maxedOut} hitSlop={12}>
                <Ionicons name="add" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => onAdd()}
              style={({ pressed }) => [
                styles.modalAddBtn,
                { backgroundColor: tint },
                pressed ? { opacity: 0.9 } : null,
              ]}
            >
              <Ionicons name="basket" size={20} color="#fff" />
              <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 10, fontSize: 15 }}>
                Add to Basket — Rs.{Math.round(finalPrice).toLocaleString()}
              </AppText>
            </Pressable>
          )}
        </View>

        {/* Close Button UI integrated in modal content */}
        <Pressable
          onPress={closeModal}
          style={[styles.closeBtn, { backgroundColor: theme.colors.surfaceMuted }]}
          hitSlop={12}
        >
          <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </SleekExpandModal>
    </>
  );
});

// ── Sub-components ──────────────────────────────────────────────
const TrustChip = memo(({ icon, label, tint, theme }: any) => (
  <View style={[trustStyles.chip, { backgroundColor: tint + '12', borderColor: tint + '30' }]}>
    <Ionicons name={icon} size={12} color={tint} />
    <Text style={[trustStyles.label, { color: tint }]}>{label}</Text>
  </View>
));

const SpecRow = memo(({ label, value, theme, last, valueColor }: any) => (
  <View style={[specStyles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.colors.border }]}>
    <AppText variant="captionStrong" color={theme.colors.textSecondary} style={{ width: 90 }}>{label}</AppText>
    <AppText variant="caption" color={valueColor || theme.colors.textPrimary} style={{ flex: 1 }}>{value}</AppText>
  </View>
));

const trustStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  label: { fontSize: 11, fontWeight: '600' },
});

const specStyles = StyleSheet.create({
  row: { flexDirection: 'row', paddingVertical: 9 },
});

// ── Styles ──────────────────────────────────────────────────────
const IMG_H = 120;

const styles = StyleSheet.create({
  grid: {
    borderRadius: 14,
    padding: 10,
    margin: 5,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  horizontal: {
    borderRadius: 14,
    padding: 10,
    width: 140,
    marginRight: 10,
    borderWidth: 1,
    shadowColor: '#0A0F1E',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: IMG_H,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    position: 'relative',
  },
  image: { width: '100%', height: '100%', overflow: 'hidden' },

  // Flat cleaner tag
  discountTag: {
    position: 'absolute',
    top: 6,
    left: 6,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    zIndex: 2,
  },
  discountTagText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.2,
  },

  lowStockBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderWidth: 1,
    zIndex: 2,
  },
  lowStockText: { fontSize: 8.5, fontWeight: '700' },

  blockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  blockedPill: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  blockedText: { color: '#fff', fontSize: 9, fontWeight: '800' },

  heartBtn: { position: 'absolute', top: 4, right: 4, zIndex: 4 },

  body: { gap: 2 },
  name: { fontSize: 12.5, lineHeight: 17, fontWeight: '600', minHeight: 34 },
  subline: { fontSize: 11, height: 14 },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 28,
  },
  priceCol: { flex: 1, justifyContent: 'center' },
  finalPrice: { fontSize: 13.5, fontWeight: '800', lineHeight: 16 },
  oldPrice: { fontSize: 10, textDecorationLine: 'line-through' },

  actionCol: { alignItems: 'flex-end' },
  addPill: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 11.5, fontWeight: '800' },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    height: 28,
    paddingHorizontal: 3,
  },
  stepperBtn: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  stepperQty: {
    minWidth: 14, textAlign: 'center', fontSize: 11.5,
    fontWeight: '800', color: '#fff', marginHorizontal: 2,
  },

  /* Modal */
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: {
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.9,
    paddingBottom: 24,
  },
  dragArea: { width: '100%', height: 28, alignItems: 'center', justifyContent: 'center' },
  handle: { width: 40, height: 5, borderRadius: 3 },
  closeBtn: {
    position: 'absolute', top: 10, right: 14,
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  modalContent: { paddingHorizontal: 20, paddingBottom: 120 },
  modalImageWrap: {
    width: '100%', aspectRatio: 1,
    borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    padding: 0, marginBottom: 16, position: 'relative', overflow: 'hidden'
  },
  modalImage: { width: '100%', height: '100%' },
  modalInfo: { marginTop: 4 },
  modalName: { fontSize: 21, lineHeight: 28, fontWeight: '800' },
  modalPriceRow: {
    flexDirection: 'row', alignItems: 'baseline', gap: 10,
    marginTop: 10, marginBottom: 14,
  },
  modalPrice: { fontSize: 26, fontWeight: '900' },
  modalOldPrice: { fontSize: 15 },
  trustRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 18 },
  modalDivider: { height: 1, marginBottom: 16 },
  modalSection: { marginBottom: 4 },
  modalDesc: { fontSize: 13.5, lineHeight: 20 },
  specTable: { borderRadius: 12, borderWidth: 1, padding: 12 },

  modalFooter: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1,
    paddingHorizontal: 20, paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 8,
  },
  blockedFooterBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26,
  },
  modalAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 52, borderRadius: 26,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10, elevation: 4,
  },
  modalStepper: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    height: 52, borderRadius: 26, paddingHorizontal: 8,
    shadowColor: '#FF5A1F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10, elevation: 4,
  },
  modalStepperBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center', justifyContent: 'center',
  },
  modalStepperQty: { fontSize: 14, fontWeight: '800' },
});

export default ProductCard;
