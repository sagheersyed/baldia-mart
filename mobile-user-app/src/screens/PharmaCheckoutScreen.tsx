import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, ActivityIndicator, Alert, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCartStore } from '../store/cartStore';
import { pharmaApi, addressesApi, prescriptionsApi, ordersApi } from '../api/api';
import {
  AppText, AppButton, AppIconButton, AppBadge,
} from '../components/ui';
import { theme } from '../theme/theme';

const ACCENT = theme.colors.pharma;

export default function PharmaCheckoutScreen({ navigation }: any) {
  const { pharmaCart, getPharmaCartTotal, clearPharmaCart, hasPharmaRxItems } = useCartStore();
  
  const [loading, setLoading] = useState(false);
  const [placingOrder, setIsPlacingOrder] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [approvedPrescriptionId, setApprovedPrescriptionId] = useState<string | null>(null);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isValidAddress, setIsValidAddress] = useState(true);

  const subtotal = getPharmaCartTotal();
  const total = subtotal + deliveryFee;
  const requiresRx = hasPharmaRxItems();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Addresses
      const addrRes = await addressesApi.getAll();
      setAddresses(addrRes.data || []);
      const defAddr = addrRes.data?.find((a: any) => a.isDefault) || addrRes.data?.[0];
      if (defAddr) {
        setSelectedAddressId(defAddr.id);
        fetchDeliveryFee(defAddr.id);
      }

      // 2. Fetch Approved Prescriptions if needed
      if (requiresRx) {
        const rxRes = await prescriptionsApi.getMyPrescriptions();
        const approved = rxRes.data?.find((r: any) => r.status === 'approved');
        if (approved) setApprovedPrescriptionId(approved.id);
      }
    } catch (err) {
      console.error('Checkout init error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDeliveryFee = async (addressId: string) => {
    try {
      const res = await ordersApi.getDeliveryFee(addressId, undefined, 'pharma');
      if (res.data.isValid) {
        setDeliveryFee(Number(res.data.deliveryFee) || 0);
        setIsValidAddress(true);
      } else {
        setDeliveryFee(0);
        setIsValidAddress(false);
      }
    } catch {
      setDeliveryFee(0);
    }
  };

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    fetchDeliveryFee(id);
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert('Address Required', 'Please select a delivery address.');
      return;
    }

    if (requiresRx && !approvedPrescriptionId) {
      Alert.alert(
        'Prescription Required', 
        'Your cart contains items that require an approved prescription. Please wait for pharmacist approval or upload a new one.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'View Prescriptions', onPress: () => navigation.navigate('PrescriptionUpload') }
        ]
      );
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderData = {
        addressId: selectedAddressId,
        paymentMethod,
        prescriptionId: approvedPrescriptionId || undefined,
        items: pharmaCart.map(item => ({
          medicineId: item.id,
          quantity: item.quantity,
        })),
        notes: 'Fast delivery requested',
      };

      const res = await pharmaApi.placeOrder(orderData);
      if (res.status === 201 || res.status === 200) {
        clearPharmaCart();
        Alert.alert('Order Success!', 'Your medicine order has been placed successfully.', [
          { text: 'Great', onPress: () => navigation.navigate('Home') }
        ]);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to place order. Please try again.';
      Alert.alert('Order Failed', msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="h2">Checkout</AppText>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {/* Address Selection */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <AppText variant="title">Delivery Address</AppText>
            <Pressable onPress={() => navigation.navigate('SavedAddresses')}>
              <AppText variant="body" color={ACCENT}>Change</AppText>
            </Pressable>
          </View>
          {selectedAddressId ? (
            <View style={styles.addressCard}>
              <Ionicons name="location" size={20} color={ACCENT} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <AppText variant="bodyStrong">
                  {addresses.find(a => a.id === selectedAddressId)?.addressType || 'Home'}
                </AppText>
                <AppText variant="caption" color={theme.colors.textSecondary}>
                  {addresses.find(a => a.id === selectedAddressId)?.completeAddress}
                </AppText>
              </View>
            </View>
          ) : (
            <AppButton 
              label="Add Delivery Address" 
              variant="outline" 
              onPress={() => navigation.navigate('SavedAddresses')} 
            />
          )}
        </View>

        {/* Prescription Verification */}
        {requiresRx && (
          <View style={styles.section}>
            <AppText variant="title">Prescription Status</AppText>
            {approvedPrescriptionId ? (
              <View style={[styles.statusBox, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
                <Ionicons name="checkmark-circle" size={20} color="#059669" />
                <AppText variant="body" color="#065F46" style={{ marginLeft: 8 }}>
                  Verified prescription attached.
                </AppText>
              </View>
            ) : (
              <View style={[styles.statusBox, { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <Ionicons name="time" size={20} color="#D97706" />
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <AppText variant="bodyStrong" color="#92400E">Verification Pending</AppText>
                  <AppText variant="caption" color="#B45309">
                    Waiting for pharmacist to approve your prescription.
                  </AppText>
                </View>
                <AppButton 
                  label="Refresh" 
                  size="sm" 
                  variant="outline" 
                  onPress={fetchInitialData} 
                  tint="#B45309"
                />
              </View>
            )}
          </View>
        )}

        {/* Payment Method */}
        <View style={styles.section}>
          <AppText variant="title" style={{ marginBottom: 12 }}>Payment Method</AppText>
          <Pressable 
            style={[styles.payOption, paymentMethod === 'cod' && styles.payOptionActive]}
            onPress={() => setPaymentMethod('cod')}
          >
            <Ionicons name="cash-outline" size={22} color={paymentMethod === 'cod' ? ACCENT : theme.colors.textMuted} />
            <AppText variant="bodyStrong" style={{ flex: 1, marginLeft: 12 }}>Cash on Delivery</AppText>
            {paymentMethod === 'cod' && <Ionicons name="checkmark-circle" size={20} color={ACCENT} />}
          </Pressable>
        </View>

        {/* Order Summary */}
        <View style={styles.summary}>
          <AppText variant="title" style={{ marginBottom: 12 }}>Order Summary</AppText>
          <View style={styles.sumRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Subtotal</AppText>
            <AppText variant="bodyStrong">Rs. {subtotal.toLocaleString()}</AppText>
          </View>
          <View style={styles.sumRow}>
            <AppText variant="body" color={theme.colors.textSecondary}>Delivery Fee</AppText>
            <AppText variant="bodyStrong">Rs. {deliveryFee.toLocaleString()}</AppText>
          </View>
          <View style={styles.divider} />
          <View style={styles.sumRow}>
            <AppText variant="h3">Total</AppText>
            <AppText variant="h2" color={ACCENT}>Rs. {total.toLocaleString()}</AppText>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <AppButton
          label={placingOrder ? "Placing Order..." : "Confirm & Place Order"}
          variant="primary"
          tint={ACCENT}
          size="lg"
          fullWidth
          disabled={placingOrder || (requiresRx && !approvedPrescriptionId)}
          onPress={handlePlaceOrder}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
    backgroundColor: theme.colors.surface,
  },
  section: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sectionHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.md,
    marginTop: 12,
    borderWidth: 1,
  },
  payOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginBottom: 10,
  },
  payOptionActive: {
    borderColor: ACCENT,
    backgroundColor: theme.colors.pharmaLight,
  },
  summary: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 12 },
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
