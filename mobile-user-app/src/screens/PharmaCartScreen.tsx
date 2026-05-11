import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Pressable, Alert, ScrollView, Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore, PharmaCartItem } from '../store/cartStore';
import { addressesApi, pharmaApi } from '../api/api';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState, QuantityStepper,
} from '../components/ui';
import { prescriptionsApi } from '../api/api';
import { theme } from '../theme/theme';

const ACCENT = theme.colors.pharma;

export default function PharmaCartScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const {
    pharmaCart, updatePharmaQuantity, removeFromPharmaCart, getPharmaCartTotal,
    getPharmaCartCount, hasPharmaRxItems,
  } = useCartStore();

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [approvedRx, setApprovedRx] = useState<any>(null);

  useFocusEffect(
    useCallback(() => {
      checkPrescriptionStatus();
      fetchDeliveryFee();
    }, [pharmaCart])
  );

  const fetchDeliveryFee = async () => {
    try {
      const addrRes = await addressesApi.getAll();
      const defAddr = addrRes.data?.find((a: any) => a.isDefault) || addrRes.data?.[0];
      if (defAddr) {
        const res = await ordersApi.getDeliveryFee(defAddr.id, undefined, 'pharma');
        if (res.data.isValid) {
          setDeliveryFee(Number(res.data.deliveryFee) || 0);
          setIsValidAddress(true);
        } else {
          setDeliveryFee(0);
          setIsValidAddress(false);
        }
      }
    } catch (err) {
      console.error('Error fetching pharma delivery fee:', err);
    }
  };

  const checkPrescriptionStatus = async () => {
    try {
      const res = await prescriptionsApi.getMyPrescriptions();
      const approved = res.data?.find((rx: any) => rx.status === 'approved');
      setApprovedRx(approved || null);
    } catch (err) {
      console.error('Error checking Rx status:', err);
    }
  };

  const subtotal = getPharmaCartTotal();
  const total = subtotal + deliveryFee;
  const requiresRx = hasPharmaRxItems();

  const handleRemove = (item: PharmaCartItem) => {
    Alert.alert('Remove item', `Remove ${item.name} from cart?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFromPharmaCart(item.id) },
    ]);
  };

  const renderItem = ({ item }: { item: PharmaCartItem }) => {
    return (
      <View style={styles.itemCard}>
        <View style={styles.itemImage}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.fill} resizeMode="contain" />
          ) : (
            <View style={[styles.fill, styles.imagePlaceholder]}>
              <Ionicons name="medkit-outline" size={24} color={theme.colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.itemBody}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong" numberOfLines={1}>{item.name}</AppText>
              <AppText variant="caption" color={theme.colors.textSecondary}>
                {item.strength} {item.dosageForm}
              </AppText>
            </View>
            {item.requiresPrescription && (
              <View style={styles.rxBadge}>
                <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>Rx</AppText>
              </View>
            )}
          </View>

          <View style={styles.itemActions}>
            <QuantityStepper
              quantity={item.quantity}
              onIncrement={() => updatePharmaQuantity(item.id, item.quantity + 1)}
              onDecrement={() => updatePharmaQuantity(item.id, item.quantity - 1)}
              size="sm"
              tint={ACCENT}
            />
            <Pressable onPress={() => handleRemove(item)} hitSlop={8} style={styles.removeBtn}>
              <Ionicons name="trash-outline" size={16} color={theme.colors.danger} />
            </Pressable>
            <AppText variant="bodyStrong" color={ACCENT} style={{ marginLeft: 'auto' }}>
              Rs. {(item.sellingPrice * item.quantity).toLocaleString()}
            </AppText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2" style={{ flex: 1 }}>Pharma Cart</AppText>
        {pharmaCart.length > 0 && (
          <AppText variant="caption">{pharmaCart.length} {pharmaCart.length === 1 ? 'item' : 'items'}</AppText>
        )}
      </View>

      {pharmaCart.length === 0 ? (
        <EmptyState
          icon="medkit-outline"
          title="Your pharma cart is empty"
          subtitle="Add medicines and healthcare products to your cart."
          actionLabel="Browse Medicines"
          onAction={() => navigation.navigate('Pharma')}
        />
      ) : (
        <>
          <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
            {requiresRx && (
              <Pressable 
                style={[
                  styles.rxWarning, 
                  approvedRx ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' } : {}
                ]}
                onPress={() => navigation.navigate('PrescriptionUpload')}
              >
                <Ionicons 
                  name={approvedRx ? "checkmark-circle" : "document-text-outline"} 
                  size={20} 
                  color={approvedRx ? "#059669" : "#92400E"} 
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText variant="bodyStrong" color={approvedRx ? "#065F46" : "#92400E"}>
                    {approvedRx ? "Prescription Approved" : "Prescription Required"}
                  </AppText>
                  <AppText variant="caption" color={approvedRx ? "#047857" : "#B45309"}>
                    {approvedRx 
                      ? "Your prescription has been verified. You can proceed to checkout." 
                      : "Some items in your cart require a valid prescription. Click to upload now."}
                  </AppText>
                </View>
                {approvedRx ? (
                  <Ionicons name="checkmark-done" size={20} color="#059669" />
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Pressable 
                      onPress={checkPrescriptionStatus} 
                      style={{ padding: 8, marginRight: 4 }}
                    >
                      <Ionicons name="refresh" size={18} color="#B45309" />
                    </Pressable>
                    <Ionicons name="chevron-forward" size={16} color="#B45309" />
                  </View>
                )}
              </Pressable>
            )}

            <FlatList
              data={pharmaCart}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              scrollEnabled={false}
              contentContainerStyle={{ paddingVertical: 16 }}
            />

            <View style={styles.summary}>
              <AppText variant="overline">Order Summary</AppText>
              <View style={styles.sumRow}>
                <AppText variant="body" color={theme.colors.textSecondary}>Subtotal</AppText>
                <AppText variant="bodyStrong">Rs. {subtotal.toLocaleString()}</AppText>
              </View>
              <View style={styles.sumRow}>
                <AppText variant="body" color={theme.colors.textSecondary}>Delivery Fee</AppText>
                <AppText variant="bodyStrong">Rs. {deliveryFee.toLocaleString()}</AppText>
              </View>
              <View style={styles.sumDivider} />
              <View style={styles.sumRow}>
                <AppText variant="title">Total</AppText>
                <AppText variant="h3" color={ACCENT}>Rs. {total.toLocaleString()}</AppText>
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <AppButton
              label={requiresRx ? "Proceed to Checkout" : "Checkout Now"}
              variant="primary"
              tint={ACCENT}
              size="lg"
              fullWidth
              onPress={() => navigation.navigate('PharmaCheckout')}
              trailingIcon={<Ionicons name="arrow-forward" size={18} color="#fff" />}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fill: { width: '100%', height: '100%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: theme.radius.lg,
    padding: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 12,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  imagePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  itemBody: { flex: 1, justifyContent: 'space-between' },
  rxBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    height: 18,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  removeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: theme.colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    margin: 16,
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  summary: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: theme.radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 8,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumDivider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
});
