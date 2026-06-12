import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput,
  Pressable, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useCmsStore } from '../../store/cmsStore';
import { cmsApi } from '../../api/api';
import { AppText } from '../../components/ui';
import { theme } from '../../theme/theme';

const STATUS_INFO: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; title: string; desc: string }> = {
  published:    { icon: 'checkmark-circle', color: '#16A34A', title: 'Auto Approved!',      desc: 'Changes are now live on the store.' },
  submitted:    { icon: 'time',             color: '#3B82F6', title: 'Submitted',            desc: 'Your request is in the moderation queue.' },
  under_review: { icon: 'eye',              color: '#F59E0B', title: 'Under Admin Review',   desc: 'An admin will review this shortly.' },
  draft:        { icon: 'document-outline', color: '#94A3B8', title: 'Saved as Draft',       desc: 'Submit it when ready.' },
};

export default function EditProductScreen({ route, navigation }: any) {
  const { item, isRestaurant, isPharmacy } = route.params as { item: any; isRestaurant: boolean; isPharmacy?: boolean };
  const { activeTenant } = useCmsStore();
  const tenantId = activeTenant?.tenantId ?? '';

  const name     = item.product?.name ?? item.medicine?.name ?? item.name ?? 'Product';
  
  // Robust price resolution: prioritize selling price (inventory) over mrp (medicine) over base price
  const oldPrice = Number(
    item.sellingPrice ?? 
    item.selling_price ?? 
    item.price ?? 
    item.priceOverride ?? 
    item.medicine?.mrp ?? 
    item.medicine?.sellingPrice ?? 
    item.product?.price ?? 
    0
  );

  // Robust stock resolution: check all variations of stock qty fields
  const oldStock = Number(
    item.stockQuantity ?? 
    item.stock_quantity ?? 
    item.stockQty ?? 
    item.stock_qty ?? 
    item.stock ?? 
    item.product?.stockQuantity ?? 
    item.medicine?.stockQuantity ?? 
    0
  );

  const [price, setPrice]   = useState(String(oldPrice));
  const [stock, setStock]   = useState(String(oldStock));
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<any>(null);

  const color = isRestaurant ? '#EA580C' : isPharmacy ? '#7C3AED' : '#16A34A';

  const pricePct = oldPrice > 0
    ? Math.abs(((Number(price) - oldPrice) / oldPrice) * 100).toFixed(1)
    : '0';
  const priceChanged = Number(price) !== oldPrice;
  const stockChanged = Number(stock) !== oldStock;
  const isHighRisk   = priceChanged && Number(pricePct) > 10;

  const handleSave = async () => {
    if (!priceChanged && !stockChanged) {
      Alert.alert('No changes', 'Please modify at least price or stock.');
      return;
    }
    if (Number(price) <= 0) {
      Alert.alert('Invalid price', 'Price must be greater than 0.');
      return;
    }

    setSaving(true);
    setResult(null);

    try {
      let lastResult: any = null;

      if (priceChanged) {
        const res = isRestaurant
          ? await cmsApi.requestMenuPriceUpdate(tenantId, item.id, Number(price))
          : isPharmacy
          ? await cmsApi.requestPharmacyPriceUpdate(tenantId, item.id, Number(price))
          : await cmsApi.requestPriceUpdate(tenantId, item.id, Number(price), oldPrice);
        lastResult = res.data;
      }

      if (stockChanged && !isRestaurant) {
        const res = isPharmacy
          ? await cmsApi.updatePharmacyStock(tenantId, item.id, Number(stock))
          : await cmsApi.updateStock(tenantId, item.id, Number(stock), oldStock);
        lastResult = lastResult ?? res.data;
      }

      setResult(lastResult);
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Failed to submit request. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    const info = STATUS_INFO[result.status] ?? STATUS_INFO.submitted;
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.successContainer}>
          <LinearGradient
            colors={[info.color + '20', info.color + '05']}
            style={styles.successCard}
          >
            <Ionicons name={info.icon} size={56} color={info.color} />
            <AppText variant="h2" style={{ marginTop: 16, textAlign: 'center' }}>{info.title}</AppText>
            <AppText variant="body" color={theme.colors.textMuted} align="center" style={{ marginTop: 8 }}>
              {info.desc}
            </AppText>

            <View style={styles.resultDetails}>
              <DetailRow label="Request ID" value={result.id?.slice(0, 8) + '...'} />
              <DetailRow label="Status" value={result.status?.replace('_', ' ').toUpperCase()} color={info.color} />
              {priceChanged && (
                <DetailRow
                  label="Price"
                  value={`Rs. ${oldPrice.toLocaleString()} → Rs. ${Number(price).toLocaleString()}`}
                />
              )}
              {stockChanged && (
                <DetailRow label="Stock" value={`${oldStock} → ${Number(stock)}`} />
              )}
            </View>

            <View style={styles.successActions}>
              <Pressable
                style={[styles.btn, { backgroundColor: info.color }]}
                onPress={() => navigation.navigate('ChangeRequestQueue')}
              >
                <AppText variant="bodyStrong" color="#fff">View All Requests</AppText>
              </Pressable>
              <Pressable
                style={[styles.btn, { backgroundColor: theme.colors.surfaceMuted }]}
                onPress={() => navigation.goBack()}
              >
                <AppText variant="bodyStrong">Back to Catalog</AppText>
              </Pressable>
            </View>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={{ flex: 1 }}>
            <AppText variant="h3">Edit Product</AppText>
            <AppText variant="caption" color={theme.colors.textMuted} numberOfLines={1}>{name}</AppText>
          </View>
        </View>

        <View style={styles.content}>
          {/* Risk indicator */}
          {priceChanged && (
            <View style={[styles.riskBanner, { backgroundColor: isHighRisk ? '#FEF3C7' : '#DCFCE7' }]}>
              <Ionicons
                name={isHighRisk ? 'warning-outline' : 'checkmark-circle-outline'}
                size={18}
                color={isHighRisk ? '#D97706' : '#16A34A'}
              />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color={isHighRisk ? '#D97706' : '#16A34A'}>
                  {isHighRisk ? 'Requires Admin Approval' : 'Auto Approvable'}
                </AppText>
                <AppText variant="caption" color={isHighRisk ? '#92400E' : '#166534'}>
                  {isHighRisk
                    ? `Price change is ${pricePct}% — changes >10% need admin review`
                    : `Price change is ${pricePct}% — will be applied automatically`}
                </AppText>
              </View>
            </View>
          )}

          {/* Price field */}
          <View style={styles.fieldGroup}>
            <AppText variant="overline" style={styles.fieldLabel}>PRICE (PKR)</AppText>
            <View style={[styles.inputRow, priceChanged ? { borderColor: color } : {}]}>
              <AppText variant="body" color={theme.colors.textMuted}>Rs.</AppText>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={theme.colors.textMuted}
              />
              {priceChanged && (
                <View style={[styles.changeBadge, { backgroundColor: isHighRisk ? '#FEF3C7' : '#DCFCE7' }]}>
                  <AppText variant="badge" color={isHighRisk ? '#D97706' : '#16A34A'}>
                    {Number(price) > oldPrice ? '+' : ''}{pricePct}%
                  </AppText>
                </View>
              )}
            </View>
            <AppText variant="caption" color={theme.colors.textMuted}>Current: Rs. {oldPrice.toLocaleString()}</AppText>
          </View>

          {/* Stock field (not for restaurants) */}
          {!isRestaurant && (
            <View style={styles.fieldGroup}>
              <AppText variant="overline" style={styles.fieldLabel}>STOCK QUANTITY</AppText>
              <View style={[styles.inputRow, stockChanged ? { borderColor: '#3B82F6' } : {}]}>
                <Ionicons name="cube-outline" size={18} color={theme.colors.textMuted} />
                <TextInput
                  style={styles.input}
                  value={stock}
                  onChangeText={setStock}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor={theme.colors.textMuted}
                />
                {stockChanged && (
                  <View style={[styles.changeBadge, { backgroundColor: '#DBEAFE' }]}>
                    <AppText variant="badge" color="#1D4ED8">Auto ✓</AppText>
                  </View>
                )}
              </View>
              <AppText variant="caption" color={theme.colors.textMuted}>Current: {oldStock} units · Stock changes are always auto-approved</AppText>
            </View>
          )}

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={16} color="#3B82F6" />
            <AppText variant="caption" color="#1D4ED8" style={{ flex: 1 }}>
              Changes are submitted as a Change Request. Low-risk updates are auto-applied. High-risk changes go to admin for review.
            </AppText>
          </View>
        </View>
      </ScrollView>

      {/* Save button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.saveBtn, { backgroundColor: saving ? color + '80' : color }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <AppText variant="bodyStrong" color="#fff">
                {isHighRisk ? 'Submit for Approval' : 'Submit Change'}
              </AppText>
          }
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={styles.detailRow}>
      <AppText variant="caption" color={theme.colors.textMuted}>{label}</AppText>
      <AppText variant="bodyStrong" color={color}>{value}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  backBtn: { padding: 4 },

  content: { padding: theme.spacing.lg, gap: theme.spacing.lg },

  riskBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    padding: 12, borderRadius: theme.radius.lg,
  },

  fieldGroup: { gap: 6 },
  fieldLabel: { marginBottom: 2 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5, borderColor: theme.colors.divider,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  input: {
    flex: 1, fontSize: 18, fontFamily: 'Poppins_600SemiBold',
    color: theme.colors.text,
  },
  changeBadge: {
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6,
  },

  infoBox: {
    flexDirection: 'row', gap: 8, alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12, borderRadius: theme.radius.lg,
  },

  footer: {
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },
  saveBtn: {
    height: 52, borderRadius: theme.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },

  // Success state
  successContainer: { flex: 1, padding: theme.spacing.lg, justifyContent: 'center' },
  successCard: {
    borderRadius: theme.radius.xxl, padding: 28,
    alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  resultDetails: {
    width: '100%', marginTop: 20, gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg, padding: 16,
  },
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  successActions: { width: '100%', marginTop: 24, gap: 10 },
  btn: {
    height: 48, borderRadius: theme.radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
});
