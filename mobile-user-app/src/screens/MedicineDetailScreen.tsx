import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, Image, Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { pharmaApi, normalizeUrl } from '../api/api';
import AppText from '../components/ui/AppText';
import { theme } from '../theme/theme';
import { useCartStore } from '../store/cartStore';

const ACCENT = theme.colors.pharma;

export default function MedicineDetailScreen({ route, navigation }: any) {
  const { medicineId } = route.params;
  
  // ── Hooks ─────────────────────────────────────────────
  const { getCartCount, addToCart, setActiveMode } = useCartStore();
  const cartCount = getCartCount('pharma');

  const [medicine, setMedicine] = useState<any>(null);
  const [availability, setAvailability] = useState<any>(null);
  const [substitutes, setSubstitutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  const handleAddToCart = () => {
    const item = {
      id: medicine.id,
      name: medicine.name,
      mrp,
      sellingPrice,
      requiresPrescription: !!medicine.requiresPrescription,
      imageUrl: medicine.imageUrl,
      dosageForm: medicine.dosageForm,
      strength: medicine.strength,
      packSize: medicine.packSize,
      categoryId: medicine.categoryId,
      quantity: 1,
    };

    addToCart(item, 'pharma');

    if (medicine.requiresPrescription) {
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
      Alert.alert('Success', `${medicine.name} added to cart`);
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
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* ── Image ───────────────────────────────────────── */}
        <View style={styles.imgWrap}>
          {img ? (
            <Image source={{ uri: img }} style={styles.img} resizeMode="contain" />
          ) : (
            <View style={[styles.img, { justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="medkit-outline" size={64} color={ACCENT} />
            </View>
          )}
          {medicine.requiresPrescription && (
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
          {medicine.dosageForm && (
            <AppText variant="caption" color={theme.colors.textSecondary} style={{ marginBottom: 4 }}>
              {medicine.dosageForm}{medicine.strength ? ` · ${medicine.strength}` : ''}
            </AppText>
          )}
          <AppText variant="h2">{medicine.name}</AppText>
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
                  Available at {availability.pharmacy?.name}
                </AppText>
              </>
            ) : (
              <>
                <View style={[styles.dot, { backgroundColor: theme.colors.danger }]} />
                <AppText variant="captionStrong" color={theme.colors.danger}>
                  Out of stock near you
                </AppText>
              </>
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

        {/* ── Substitutions ──────────────────────────────── */}
        {substitutes.length > 0 && (
          <View style={styles.detailsBlock}>
            <AppText variant="title" style={{ marginBottom: 12 }}>
              Generic Alternatives
            </AppText>
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
        <Pressable 
          style={[styles.addBtn, !availability?.available ? { backgroundColor: theme.colors.textMuted } : null]} 
          onPress={handleAddToCart}
          disabled={!availability?.available}
        >
          <Ionicons name="cart-outline" size={20} color="#fff" />
          <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 8 }}>
            {!availability?.available ? 'Out of Stock' : medicine.requiresPrescription ? 'Upload Rx & Order' : 'Add to Cart'}
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
});
