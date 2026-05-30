import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Alert, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pharmaApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import { useCartStore } from '../store/cartStore';

import { useFavourites } from '../hooks/useFavourites';

const ACCENT = theme.colors.pharma;

export default function MedicineDetailScreen({ route, navigation }: any) {
  const { medicineId } = route.params;
  
  // ── Hooks ─────────────────────────────────────────────
  const { getCartCount, addToCart, setActiveMode } = useCartStore();
  const { isFavourite, toggleFavourite } = useFavourites();
  const cartCount = getCartCount('pharma');

  const [medicine, setMedicine] = useState<any>(null);
  const [addedToCart, setAddedToCart] = useState(false);
  const [availability, setAvailability] = useState<any>(null);
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = React.useRef<ScrollView>(null);
  const [subSectionY, setSubSectionY] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [medRes, subRes, availRes] = await Promise.all([
          pharmaApi.getMedicine(medicineId),
          pharmaApi.getSubstitutes(medicineId).catch(() => ({ data: [] })),
          pharmaApi.getAvailability(medicineId).catch(() => ({ data: { available: false } })),
        ]);
        setMedicine(medRes.data);
        setSubstitutes(Array.isArray(subRes.data) ? subRes.data : []);
        setAvailability(availRes.data);
      } catch (e) {
        console.warn('[MedicineDetail] error', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [medicineId]);

  const isFav = isFavourite(medicineId, 'products');

  const handleToggleFav = () => {
    if (!medicine) return;
    toggleFavourite({
      id: medicine.id,
      name: medicine.name,
      imageUrl: medicine.imageUrl,
      price: Number(medicine.mrp || 0),
      discount: Number(medicine.discount || 0),
      category: medicine.category,
      brand: medicine.brand,
      maxQuantityPerOrder: medicine.maxQuantityPerOrder,
      isPharma: true,
    }, 'products');
  };

  if (loading || !medicine) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
        </View>
      </SafeAreaView>
    );
  }

  const img = normalizeUrl(medicine.imageUrl);
  const mrp = Number(medicine.mrp || 0);
  const discount = Number(medicine.discount || 0);
  const hasDiscount = discount > 0;
  const sellingPrice = hasDiscount ? mrp - discount : mrp;
  
  const rxRequired = medicine.requiresPrescription === true || medicine.requiresPrescription === 'true' || medicine.requiresPrescription === 1 || medicine.requiresPrescription === '1';

  const handleAddToCart = () => {
    const item = {
      id: medicine.id,
      name: medicine.name,
      mrp,
      sellingPrice,
      requiresPrescription: rxRequired,
      imageUrl: medicine.imageUrl,
      dosageForm: medicine.dosageForm,
      strength: medicine.strength,
      packSize: medicine.packSize,
      categoryId: medicine.categoryId,
      maxQuantityPerOrder: medicine.maxQuantityPerOrder,
      quantity: 1,
    };

    addToCart(item, 'pharma');

    if (rxRequired) {
      Alert.alert(
        'Added to Cart',
        'This medicine requires a valid prescription. You can upload it in your cart before checkout.',
        [
          { text: 'Continue Shopping', style: 'cancel' },
          { text: 'View Cart', onPress: () => {
            setActiveMode('pharma');
            navigation.navigate('Cart');
          }},
        ]
      );
    } else {
      setAddedToCart(true);
      setTimeout(() => setAddedToCart(false), 2000);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.textPrimary} />
        </Pressable>
        <AppText variant="title" numberOfLines={1} style={{ flex: 1, marginHorizontal: 12 }}>
          Medicine Details
        </AppText>
        <Pressable onPress={handleToggleFav} hitSlop={12} style={{ marginRight: 4 }}>
          <Ionicons 
            name={isFav ? "heart" : "heart-outline"} 
            size={24} 
            color={isFav ? "#EF4444" : theme.colors.textPrimary} 
          />
        </Pressable>
      </View>

      <ScrollView 
        ref={scrollRef}
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Image ───────────────────────────────────────── */}
        <View style={styles.imgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.img} resizeMode="contain" />
          ) : (
            <View style={[styles.img, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="medkit-outline" size={64} color={ACCENT} />
            </View>
          )}
          {rxRequired && (
            <View style={styles.rxBadgeLg}>
              <Ionicons name="document-text" size={14} color="#fff" />
              <AppText variant="badge" color="#fff" style={{ fontSize: 10, marginLeft: 4 }}>
                Prescription Required
              </AppText>
            </View>
          )}
          {medicine.isEmergency && (
            <View style={[styles.rxBadgeLg, { backgroundColor: '#EF4444', left: 16, right: undefined }]}>
              <Ionicons name="flash" size={14} color="#fff" />
              <AppText variant="badge" color="#fff" style={{ fontSize: 10, marginLeft: 4 }}>
                Emergency
              </AppText>
            </View>
          )}
        </View>

        {/* ── Info ────────────────────────────────────────── */}
        <View style={styles.infoBlock}>
          <AppText variant="caption" color={theme.colors.textMuted} style={{ marginBottom: 2 }}>
            {medicine.brand?.name || 'Pharma'}
          </AppText>
          <AppText variant="h2">{medicine.name}</AppText>
          {medicine.dosageForm && (
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
              {medicine.dosageForm}{medicine.strength ? ` · ${medicine.strength}` : ''}
            </AppText>
          )}
          {medicine.genericName && (
            <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 4 }}>
              Generic: {medicine.genericName}
            </AppText>
          )}

          {/* Price */}
          <View style={styles.priceRow}>
            <AppText variant="display" color={ACCENT}>Rs. {sellingPrice.toFixed(0)}</AppText>
            {hasDiscount && (
              <View style={{ marginLeft: 12 }}>
                <AppText variant="pricePrev" style={{ fontSize: 16 }}>Rs. {mrp.toFixed(0)}</AppText>
                <View style={styles.discBadge}>
                  <AppText variant="badge" color="#fff" style={{ fontSize: 10 }}>
                    {medicine.discountPercent || Math.round((discount / mrp) * 100)}% OFF
                  </AppText>
                </View>
              </View>
            )}
          </View>

          {medicine.packSize && (
            <AppText variant="caption" color={theme.colors.textMuted} style={{ marginTop: 4 }}>
              Pack: {medicine.packSize}
            </AppText>
          )}

          {/* Availability Info */}
          <View style={styles.availabilityBox}>
            {availability?.available ? (
              <>
                <View style={[styles.dot, { backgroundColor: theme.colors.success }]} />
                <AppText variant="captionStrong" color={theme.colors.success}>
                  Available near you
                </AppText>
              </>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={[styles.dot, { backgroundColor: theme.colors.danger }]} />
                  <AppText variant="captionStrong" color={theme.colors.danger}>
                    Out of stock near you
                  </AppText>
                </View>
                {substitutes.length > 0 && (
                  <Pressable 
                    style={styles.altHintBtn}
                    onPress={() => scrollRef.current?.scrollTo({ y: subSectionY, animated: true })}
                  >
                    <Ionicons name="swap-horizontal" size={14} color={ACCENT} />
                    <AppText variant="captionStrong" color={ACCENT} style={{ marginLeft: 6 }}>
                      {substitutes.length} approved alternatives found
                    </AppText>
                    <Ionicons name="chevron-down" size={12} color={ACCENT} style={{ marginLeft: 4 }} />
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Details Table ───────────────────────────────── */}
        <View style={styles.detailsBlock}>
          <AppText variant="title" style={{ marginBottom: 12 }}>Details</AppText>
          {medicine.composition && (
            <DetailRow label="Composition" value={medicine.composition} />
          )}
          {medicine.dosageForm && <DetailRow label="Form" value={medicine.dosageForm} />}
          {medicine.strength && <DetailRow label="Strength" value={medicine.strength} />}
          {medicine.packSize && <DetailRow label="Pack Size" value={medicine.packSize} />}
          <DetailRow label="Type" value={medicine.isOtc ? 'Over-the-Counter' : 'Prescription Only'} />
          {medicine.isColdChain && <DetailRow label="Storage" value="Cold Chain — Temperature Sensitive" />}
        </View>

        {/* ── Description ────────────────────────────────── */}
        {medicine.description && (
          <View style={styles.detailsBlock}>
            <AppText variant="title" style={{ marginBottom: 8 }}>Description</AppText>
            <AppText variant="body" color={theme.colors.textSecondary}>
              {medicine.description}
            </AppText>
          </View>
        )}

        {/* ── Return Policy (Phase 17) ─────────────────────── */}
        <View style={styles.detailsBlock}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Ionicons name="refresh-circle-outline" size={20} color={theme.colors.success} />
            <AppText variant="title" style={{ marginLeft: 6 }}>Return Policy</AppText>
          </View>
          <AppText variant="caption" color={theme.colors.textSecondary}>
            • 7-day return for unopened and intact packaging.{"\n"}
            • No returns for opened or used medicines.{"\n"}
            • Refund will be credited to your Baldia Wallet.
          </AppText>
        </View>

        {/* ── Substitutions ──────────────────────────────── */}
        {substitutes.length > 0 && (
          <View 
            style={styles.detailsBlock}
            onLayout={(e) => setSubSectionY(e.nativeEvent.layout.y)}
          >
            <AppText variant="title" style={{ marginBottom: 12 }}>
              Generic Alternatives
            </AppText>
            <View style={styles.altDisclaimer}>
              <Ionicons name="shield-checkmark-outline" size={14} color={theme.colors.success} />
              <AppText variant="caption" color={theme.colors.textSecondary} style={{ flex: 1, marginLeft: 6 }}>
                These generic alternatives contain the same active ingredients and are approved for substitution.
              </AppText>
            </View>
            {substitutes.map((sub: any) => (
              <Pressable
                key={sub.id}
                style={styles.subCard}
                onPress={() => navigation.push('MedicineDetail', { medicineId: sub.substituteMedicineId || sub.substituteMedicine?.id })}
              >
                <Ionicons name="swap-horizontal" size={20} color={ACCENT} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <AppText variant="bodyStrong">
                    {sub.substituteMedicine?.name || 'Alternative'}
                  </AppText>
                  {sub.substitutionReason && (
                    <AppText variant="caption" color={theme.colors.textMuted}>
                      {sub.substitutionReason}
                    </AppText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {addedToCart && (
        <View style={{ position: 'absolute', top: 80, left: 20, right: 20, backgroundColor: '#10B981', padding: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', zIndex: 999, shadowColor: '#000', shadowOffset: {width:0,height:4}, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8 }}>
          <Ionicons name="checkmark-circle" size={22} color="#fff" />
          <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>Added to cart!</AppText>
        </View>
      )}

      {cartCount > 0 && (
        <Pressable
          style={styles.floatingCart}
          onPress={() => {
            setActiveMode('pharma');
            navigation.navigate('Cart');
          }}
        >
          <View style={styles.cartIconBadge}>
            <Ionicons name="cart" size={24} color="#fff" />
            <View style={styles.badge}>
              <AppText variant="badge" color={ACCENT}>
                {cartCount}
              </AppText>
            </View>
          </View>
          <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 12 }}>
            View pharma cart
          </AppText>
        </Pressable>
      )}

      {/* ── Bottom Bar ────────────────────────────────────── */}
      <View style={styles.bottomBar}>
        <View style={{ flex: 1 }}>
          <AppText variant="caption" color={theme.colors.textSecondary}>Price</AppText>
          <AppText variant="h3" color={ACCENT}>Rs. {sellingPrice.toFixed(0)}</AppText>
        </View>

        {/* Recurring Toggle */}
        <Pressable 
          style={styles.recurringBtn} 
          onPress={() => navigation.navigate('PharmaSubscribe', { medicineId })}
        >
          <Ionicons name="repeat" size={20} color={ACCENT} />
          <AppText variant="captionStrong" color={ACCENT} style={{ marginLeft: 6 }}>Subscribe</AppText>
        </Pressable>

        <Pressable 
          style={[styles.addBtn, !availability?.available ? { backgroundColor: theme.colors.surfaceMuted, borderWidth: 1, borderColor: theme.colors.border } : null]} 
          onPress={() => {
            if (!availability?.available && substitutes.length > 0) {
              scrollRef.current?.scrollTo({ y: subSectionY, animated: true });
            } else {
              handleAddToCart();
            }
          }}
        >
          <Ionicons 
            name={availability?.available ? "cart-outline" : "swap-horizontal"} 
            size={20} 
            color={availability?.available ? "#fff" : theme.colors.textSecondary} 
          />
          <AppText 
            variant="bodyStrong" 
            color={availability?.available ? "#fff" : theme.colors.textSecondary} 
            style={{ marginLeft: 8 }}
          >
            {availability?.available 
              ? (rxRequired ? 'Upload Rx & Order' : 'Add to Cart')
              : (substitutes.length > 0 ? 'View Alternatives' : 'Out of Stock')}
          </AppText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color={theme.colors.textSecondary} style={{ width: 100 }}>{label}</AppText>
      <AppText variant="body" style={{ flex: 1 }}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  imgWrap: {
    width: '100%',
    height: 260,
    backgroundColor: theme.colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  img: { width: '100%', height: '100%' },
  rxBadgeLg: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  infoBlock: {
    padding: 16,
    backgroundColor: theme.colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  discBadge: {
    backgroundColor: '#EF4444',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 2,
  },
  detailsBlock: {
    padding: 16,
    backgroundColor: theme.colors.surface,
    marginTop: 8,
  },
  availabilityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 10,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  detailRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  subCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: theme.colors.pharmaLight,
    borderRadius: theme.radius.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    ...theme.shadows.lg,
  },
  recurringBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.pharmaBorder,
    marginRight: 10,
    backgroundColor: theme.colors.pharmaLight,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ACCENT,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: theme.radius.lg,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: ACCENT,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
  },
  cartIconBadge: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  altHintBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  altDisclaimer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.successLight,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
});
