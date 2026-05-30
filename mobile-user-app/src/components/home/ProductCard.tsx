import React, { memo, useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Modal, ScrollView, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AppText from '../ui/AppText';
import FavouriteButton from '../ui/FavouriteButton';
import { isBusinessOpen } from '../../utils/helpers';
import { normalizeUrl } from '../../api/api';
import { theme } from '../../theme/theme';
import { DEFAULT_IMAGES } from '../../constants/images';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  tint = theme.colors.primary,
}: ProductCardProps) {
  const [detailVisible, setDetailVisible] = useState(false);

  const stock = product.stock ?? product.stockQuantity;
  const isOOS = stock !== undefined ? stock <= 0 : false;
  const isLowStock = stock !== undefined ? (stock > 0 && stock <= 5) : false;

  const businessClosed = useMemo(() => {
    const productOpen = isBusinessOpen(product.openingTime, product.closingTime);
    const brandOpen = !product.brand || isBusinessOpen(product.brand?.openingTime, product.brand?.closingTime);
    const categoryOpen = !product.category || isBusinessOpen(product.category?.openingTime, product.category?.closingTime);
    return !productOpen || !brandOpen || !categoryOpen;
  }, [product]);

  const blocked = isOOS || businessClosed;
  const numericPrice = Number(product.price || product.mrp || 0);
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

  const handleCardPress = () => {
    if (onPress) {
      onPress();
    } else {
      setDetailVisible(true);
    }
  };

  return (
    <>
      <Pressable
        onPress={handleCardPress}
        style={({ pressed }) => [
          containerStyle,
          pressed ? { transform: [{ scale: 0.97 }] } : null,
        ]}
      >
        <View style={styles.imageWrap}>
          <Image
            source={{ uri: normalizeUrl(product.imageUrl) || DEFAULT_IMAGES.product }}
            style={styles.image}
            contentFit="contain"
            cachePolicy="memory-disk"
            transition={200}
          />

          {/* Premium solid discount badge - top left */}
          {discountPercent > 0 && !blocked && (
            <View style={styles.discountBadge}>
              <AppText variant="badge" color="#fff" style={styles.discountText}>
                {discountPercent}% OFF
              </AppText>
            </View>
          )}

          {/* Low stock warning */}
          {isLowStock && !blocked && (
            <View style={styles.lowStockBadge}>
              <AppText variant="badge" color={theme.colors.warning} style={{ fontSize: 9, fontWeight: '800' }}>
                Only {stock} left
              </AppText>
            </View>
          )}

          {/* OOS / Closed overlay */}
          {blocked && (
            <View style={styles.blockedOverlay}>
              <View style={styles.blockedPill}>
                <Ionicons
                  name={businessClosed ? 'time-outline' : 'alert-circle-outline'}
                  size={12}
                  color="#fff"
                />
                <AppText variant="badge" color="#fff" style={{ fontSize: 9, fontWeight: '700' }}>
                  {businessClosed ? 'CLOSED' : 'OUT OF STOCK'}
                </AppText>
              </View>
            </View>
          )}

          {/* Favourite heart overlay */}
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
          {/* Product Name */}
          <AppText
            variant="body"
            color="#1E293B"
            numberOfLines={2}
            style={styles.name}
          >
            {product.name}
          </AppText>

          {/* Elegant clean weight/unit text */}
          {subline ? (
            <AppText
              variant="caption"
              color="#64748B"
              style={styles.weightText}
              numberOfLines={1}
            >
              {subline}
            </AppText>
          ) : (
            <View style={{ height: 16 }} />
          )}

          {/* Bottom row: Price + Add Button / Stepper */}
          <View style={styles.bottomRow}>
            <View style={styles.priceContainer}>
              <AppText variant="price" color="#0F172A" style={styles.finalPrice}>
                Rs. {Math.round(finalPrice).toLocaleString()}
              </AppText>
              {hasDiscount && (
                <AppText variant="pricePrev" style={styles.oldPrice}>
                  Rs. {Math.round(numericPrice).toLocaleString()}
                </AppText>
              )}
            </View>

            {/* Premium FoodPanda-style Circular Add/Stepper */}
            {!blocked && (
              <View style={styles.actionContainer}>
                {cartQty > 0 && onIncrement && onDecrement ? (
                  <View style={[styles.stepperPill, { backgroundColor: tint }]}>
                    <Pressable
                      onPress={onDecrement}
                      style={styles.stepperAction}
                      hitSlop={8}
                    >
                      <Ionicons name="remove" size={14} color="#fff" />
                    </Pressable>
                    <AppText
                      variant="captionStrong"
                      color="#fff"
                      style={styles.stepperQty}
                    >
                      {cartQty}
                    </AppText>
                    <Pressable
                      onPress={onIncrement}
                      style={styles.stepperAction}
                      disabled={maxedOut}
                      hitSlop={8}
                    >
                      <Ionicons name="add" size={14} color="#fff" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation();
                      onAdd();
                    }}
                    style={({ pressed }) => [
                      styles.circleAddBtn,
                      { backgroundColor: tint },
                      pressed ? { transform: [{ scale: 0.9 }] } : null,
                    ]}
                    hitSlop={8}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </Pressable>

      {/* Premium FoodPanda-style Product Detail Modal */}
      <Modal
        visible={detailVisible}
        animationType="slide"
        transparent
        statusBarTranslucent
        onRequestClose={() => setDetailVisible(false)}
      >
        <View style={styles.modalOverlay}>
          {/* Backdrop Touch Dismiss */}
          <Pressable
            style={StyleSheet.absoluteFillObject}
            onPress={() => setDetailVisible(false)}
          />

          {/* Bottom Sheet Modal View Container */}
          <View style={styles.modalSheet}>
            {/* Header Handle */}
            <View style={styles.modalHandle} />

            {/* Circular Close Button */}
            <Pressable
              onPress={() => setDetailVisible(false)}
              style={styles.modalCloseBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color="#334155" />
            </Pressable>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScrollContent}
            >
              {/* Product Large Image Container */}
              <View style={styles.modalImageWrap}>
                <Image
                  source={{ uri: normalizeUrl(product.imageUrl) || DEFAULT_IMAGES.product }}
                  style={styles.modalImage}
                  contentFit="contain"
                  cachePolicy="memory-disk"
                />

                {/* Discount Badge */}
                {discountPercent > 0 && !blocked && (
                  <View style={styles.modalDiscountBadge}>
                    <AppText variant="badge" color="#fff" style={{ fontSize: 11, fontWeight: '900' }}>
                      {discountPercent}% OFF
                    </AppText>
                  </View>
                )}
              </View>

              {/* Product Info Block */}
              <View style={styles.modalInfoBlock}>
                {/* Brand Name */}
                {product.brand?.name && (
                  <AppText variant="overline" color={tint} style={{ marginBottom: 4 }}>
                    {product.brand.name}
                  </AppText>
                )}

                {/* Product Name */}
                <AppText variant="h2" color="#0F172A" style={styles.modalName}>
                  {product.name}
                </AppText>

                {/* Weight / Unit */}
                {subline && (
                  <AppText variant="body" color="#64748B" style={styles.modalWeight}>
                    {subline}
                  </AppText>
                )}

                {/* Price Display */}
                <View style={styles.modalPriceRow}>
                  <AppText variant="display" color="#0F172A" style={{ fontSize: 24, fontWeight: '900' }}>
                    Rs. {Math.round(finalPrice).toLocaleString()}
                  </AppText>
                  {hasDiscount && (
                    <AppText variant="pricePrev" style={styles.modalOldPrice}>
                      Rs. {Math.round(numericPrice).toLocaleString()}
                    </AppText>
                  )}
                </View>

                {/* Delivery Guarantee Flag */}
                <View style={styles.guaranteeRow}>
                  <View style={[styles.guaranteeIconCircle, { backgroundColor: tint + '15' }]}>
                    <Ionicons name="bicycle" size={16} color={tint} />
                  </View>
                  <View>
                    <AppText variant="bodyStrong" color="#1E293B" style={{ fontSize: 13 }}>
                      Express Delivery in 20-35 mins
                    </AppText>
                    <AppText variant="caption" color="#64748B">
                      Guaranteed fresh and safe arrival to your door
                    </AppText>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.modalDivider} />

                {/* Description Section */}
                <View style={styles.modalSection}>
                  <AppText variant="title" color="#0F172A" style={{ marginBottom: 8, fontSize: 16 }}>
                    Product Details
                  </AppText>
                  <AppText variant="body" color="#475569" style={styles.modalDescText}>
                    {product.description ||
                      `Premium quality selected product. Carefully sourced and packed to meet the highest safety and hygiene standards. Enjoy fresh and authentic taste with BaldiaMart's 100% satisfaction guarantee.`
                    }
                  </AppText>
                </View>

                {/* Details Table */}
                <View style={[styles.modalSection, { marginTop: 16 }]}>
                  <AppText variant="title" color="#0F172A" style={{ marginBottom: 12, fontSize: 16 }}>
                    Specifications
                  </AppText>
                  <View style={styles.specTable}>
                    <View style={styles.specRow}>
                      <AppText variant="captionStrong" color="#64748B" style={{ width: 100 }}>Category</AppText>
                      <AppText variant="caption" color="#334155" style={{ flex: 1 }}>
                        {product.category?.name || 'Groceries'}
                      </AppText>
                    </View>
                    {product.brand?.name && (
                      <View style={styles.specRow}>
                        <AppText variant="captionStrong" color="#64748B" style={{ width: 100 }}>Brand</AppText>
                        <AppText variant="caption" color="#334155" style={{ flex: 1 }}>{product.brand.name}</AppText>
                      </View>
                    )}
                    <View style={[styles.specRow, { borderBottomWidth: 0 }]}>
                      <AppText variant="captionStrong" color="#64748B" style={{ width: 100 }}>Quality</AppText>
                      <AppText variant="caption" color="#10B981" style={{ flex: 1, fontWeight: '700' }}>Verified Fresh</AppText>
                    </View>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Sticky Action Footer */}
            <View style={styles.modalFooter}>
              {blocked ? (
                <View style={styles.modalBlockedBtn}>
                  <Ionicons name="time" size={18} color="#fff" />
                  <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>
                    {businessClosed ? 'Store Currently Closed' : 'Out of Stock'}
                  </AppText>
                </View>
              ) : cartQty > 0 && onIncrement && onDecrement ? (
                <View style={[styles.modalStepperContainer, { backgroundColor: tint }]}>
                  <Pressable
                    onPress={onDecrement}
                    style={styles.modalStepperBtn}
                    hitSlop={12}
                  >
                    <Ionicons name="remove" size={20} color="#fff" />
                  </Pressable>
                  <AppText variant="h3" color="#fff" style={styles.modalStepperQty}>
                    {cartQty} item{cartQty === 1 ? '' : 's'} in basket
                  </AppText>
                  <Pressable
                    onPress={onIncrement}
                    style={styles.modalStepperBtn}
                    disabled={maxedOut}
                    hitSlop={12}
                  >
                    <Ionicons name="add" size={20} color="#fff" />
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => {
                    onAdd();
                  }}
                  style={({ pressed }) => [
                    styles.modalAddBtn,
                    { backgroundColor: tint },
                    pressed ? { opacity: 0.9 } : null,
                  ]}
                >
                  <Ionicons name="basket" size={20} color="#fff" />
                  <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 10, fontSize: 15 }}>
                    Add to Basket — Rs. {Math.round(finalPrice).toLocaleString()}
                  </AppText>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
});

const CARD_PADDING = 12;
const IMG_HEIGHT = 120;

const styles = StyleSheet.create({
  grid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: CARD_PADDING,
    margin: 6,
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  horizontal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: CARD_PADDING,
    width: 146,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: IMG_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F8F9FA',
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 6,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#E21B70', // Hot foodpanda pink for high-conversion discount appeal
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 1,
  },
  discountText: {
    fontSize: 9.5,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  lowStockBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#FFFBEB',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FDE68A',
    zIndex: 2,
  },
  blockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  blockedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 4,
  },

  body: {
    gap: 4,
  },
  name: {
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '600',
    minHeight: 34, // keep constant height for alignment in grids
  },
  weightText: {
    fontSize: 11,
    fontWeight: '500',
    height: 16,
  },

  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    height: 32,
  },
  priceContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  finalPrice: {
    fontSize: 14.5,
    fontWeight: '800',
    lineHeight: 18,
  },
  oldPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    marginTop: 1,
  },

  actionContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  circleAddBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 15,
    height: 30,
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  stepperAction: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperQty: {
    minWidth: 16,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '800',
    marginHorizontal: 3,
  },

  /* Product Details Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_HEIGHT * 0.88,
    paddingBottom: 24,
  },
  modalHandle: {
    width: 38,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 15,
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  modalScrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 110, // space for sticky footer
  },
  modalImageWrap: {
    width: '100%',
    height: 240,
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 16,
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  modalDiscountBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: '#E21B70',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  modalInfoBlock: {
    marginTop: 4,
  },
  modalName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
    color: '#0F172A',
  },
  modalWeight: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 4,
  },
  modalPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 12,
    marginBottom: 18,
  },
  modalOldPrice: {
    fontSize: 15,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  guaranteeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  guaranteeIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 16,
  },
  modalSection: {
    marginBottom: 4,
  },
  modalDescText: {
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  specTable: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
  },
  specRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderColor: '#F1F5F9',
    paddingHorizontal: 20,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  modalAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalStepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: 24,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  modalStepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStepperQty: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  modalBlockedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderRadius: 24,
    backgroundColor: '#94A3B8',
  },
});

export default ProductCard;
