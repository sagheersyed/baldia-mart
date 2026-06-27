import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Alert, ActivityIndicator, ScrollView, Pressable,
  TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { useCart } from '../context/CartContext';
import { ordersApi, addressesApi, pharmaApi, prescriptionsApi, financeApi } from '../api/api';
import AddressPickerModal from '../components/AddressPickerModal';
import {
  AppText, AppButton, AppIconButton, AppBadge,
} from '../components/ui';
import { theme } from '../theme/theme';

type Mode = 'mart' | 'food' | 'pharma';
type PaymentMethod = 'cod' | 'jazzcash' | 'easypaisa';

const PAYMENT_OPTIONS: {
  id: PaymentMethod;
  title: string;
  desc: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  badge?: string;
}[] = [
    { id: 'cod', title: 'Cash on Delivery', desc: 'Pay when your order arrives', icon: 'cash-outline', color: theme.colors.success },
    { id: 'jazzcash', title: 'JazzCash', desc: 'Pay via JazzCash mobile wallet', icon: 'phone-portrait-outline', color: '#E31837', badge: 'JazzCash' },
    { id: 'easypaisa', title: 'EasyPaisa', desc: 'Pay via EasyPaisa mobile wallet', icon: 'wallet-outline', color: '#4CAF50', badge: 'EasyPaisa' },
  ];

export default function CheckoutScreen({ navigation, route }: any) {
  const mode: Mode = route.params?.mode || 'mart';
  const { martCart, foodCart, pharmaCart, getCartTotal, clearCart, hasPharmaRxItems } = useCart();
  const cart = mode === 'mart' ? martCart : mode === 'food' ? foodCart : pharmaCart;

  const accent = mode === 'food' ? theme.colors.food : mode === 'pharma' ? theme.colors.pharma : theme.colors.primary;

  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [isValidatingVoucher, setIsValidatingVoucher] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [approvedPrescriptionId, setApprovedPrescriptionId] = useState<string | null>(null);
  const [loadingRx, setLoadingRx] = useState(false);

  const [useWalletBalance, setUseWalletBalance] = useState(false);
  const [walletBalance, setWalletBalance] = useState(0);
  const [isFetchingWallet, setIsFetchingWallet] = useState(false);

  const requiresRx = mode === 'pharma' && hasPharmaRxItems();

  // Modals state
  const [showAddressListModal, setShowAddressListModal] = useState(false);
  const [showAddressPickerModal, setShowAddressPickerModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState<any>(null);

  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(true);
  const [zoneMessage, setZoneMessage] = useState<string | null>(null);
  const [checkoutItems, setCheckoutItems] = useState<any[]>(cart);

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await addressesApi.getAll();
      setAddresses(res.data);
      if (res.data.length > 0) {
        const currentId = selectedAddress?.id;
        const found = res.data.find((a: any) => a.id === currentId)
          || res.data.find((a: any) => a.isDefault) || res.data[0];
        setSelectedAddress(found);
      }
    } catch (e) {
      // noop
    } finally {
      setIsLoadingAddresses(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPrescription = useCallback(async () => {
    if (!requiresRx) return;
    setLoadingRx(true);
    try {
      const rxRes = await prescriptionsApi.getMyPrescriptions();
      const approved = rxRes.data?.find((r: any) => r.status === 'approved');
      if (approved) setApprovedPrescriptionId(approved.id);
    } catch (err) {
      console.error('Fetch Rx error:', err);
    } finally {
      setLoadingRx(false);
    }
  }, [requiresRx]);

  const fetchWallet = useCallback(async () => {
    setIsFetchingWallet(true);
    try {
      const res = await financeApi.getUserSummary();
      setWalletBalance(Number(res.data.netBalance) || 0);
    } catch {
      // noop
    } finally {
      setIsFetchingWallet(false);
    }
  }, []);

  useEffect(() => {
    fetchAddresses();
    fetchPrescription();
    fetchWallet();
  }, [fetchAddresses, fetchPrescription, fetchWallet]);

  const fetchDeliveryFee = useCallback(async (addressId: string, restaurantId?: string, orderType?: string) => {
    setIsLoadingFee(true);
    try {
      const res = await ordersApi.getDeliveryFee(addressId, restaurantId, orderType);
      if (res.data.isValid === true) {
        setDeliveryFee(Number(res.data.deliveryFee) || 0);
        setIsAddressValid(true);
        setZoneMessage(null);
      } else {
        setDeliveryFee(0);
        setIsAddressValid(false);
        setZoneMessage(res.data.message || 'We do not deliver to this location yet.');
      }
    } catch {
      setDeliveryFee(0);
      setIsAddressValid(true);
      setZoneMessage(null);
    } finally {
      setIsLoadingFee(false);
    }
  }, []);

  useEffect(() => {
    if (selectedAddress?.id) {
      const restaurantId = mode === 'food' ? (cart[0] as any)?.restaurantId : undefined;
      fetchDeliveryFee(selectedAddress.id, restaurantId, mode);
    }
  }, [selectedAddress, cart, mode, fetchDeliveryFee]);

  const handleUpdateAddress = async (addrData: any) => {
    try {
      if (editingAddressData?.id) {
        await addressesApi.update(editingAddressData.id, addrData);
      } else {
        await addressesApi.create({ ...addrData, isDefault: addresses.length === 0 });
      }
      await fetchAddresses();
      setShowAddressPickerModal(false);
    } catch {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleOpenEdit = (addr?: any) => {
    setEditingAddressData(addr || null);
    setShowAddressListModal(false);
    setTimeout(() => setShowAddressPickerModal(true), 250);
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setShowAddressListModal(false);
  };

  const subtotal = checkoutItems.reduce((sum: number, item: any) => sum + ((item.sellingPrice || item.price || 0) * item.quantity), 0);
  const uniqueRestaurants = mode === 'food'
    ? Array.from(new Set(checkoutItems.map((item: any) => item.restaurantId).filter(Boolean)))
    : [];
  const multiStopCount = uniqueRestaurants.length > 1 ? uniqueRestaurants.length - 1 : 0;
  const multiStopSurcharge = multiStopCount * 50;

  const handleValidateVoucher = async () => {
    if (!voucherCode) return;
    setIsValidatingVoucher(true);
    try {
      const vendorIds = mode === 'food' ? uniqueRestaurants as string[] : [];
      const res = await (require('../api/api').couponsApi).validate(voucherCode, subtotal, vendorIds);
      if (res.data && res.data.success) {
        setAppliedCoupon(res.data.coupon);
        setCouponDiscount(res.data.discount_amount);
        Alert.alert('Success', `Voucher applied! Discount: Rs. ${res.data.discount_amount}`);
      } else {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        Alert.alert('Invalid Voucher', res.data.error_message || 'This code is not valid.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to validate voucher.';
      Alert.alert('Error', msg);
    } finally {
      setIsValidatingVoucher(false);
    }
  };

  const appliedWalletAmount = useWalletBalance ? Math.min(walletBalance, (subtotal - couponDiscount) + deliveryFee + multiStopSurcharge) : 0;
  const total = (subtotal - couponDiscount) + deliveryFee + multiStopSurcharge - appliedWalletAmount;
  const totalItems = cart.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const handlePlaceOrder = () => {
    if (cart.length === 0) {
      Alert.alert('Cart empty', 'Your cart is empty');
      return;
    }
    if (!selectedAddress) {
      Alert.alert('No address', 'Please select a delivery address');
      return;
    }
    if (!isAddressValid && mode !== 'pharma') {
      Alert.alert('Out of zone', 'Your address is outside our delivery zone. Please choose another address.');
      return;
    }

    if (requiresRx && !approvedPrescriptionId) {
      const rxItems = cart.filter((i: any) => (i as any).requiresPrescription);
      const nonRxItems = cart.filter((i: any) => !(i as any).requiresPrescription);

      if (nonRxItems.length > 0) {
        Alert.alert(
          'Prescription Required',
          `Your cart contains ${rxItems.length} item(s) that require an approved prescription. Would you like to proceed with only the ${nonRxItems.length} non-prescription item(s)?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Order Non-Rx Items', 
              onPress: () => {
                // Filter cart to only include non-Rx items for this checkout session
                // We'll pass a flag to proceedToCheckout to only use nonRxItems
                setCheckoutItems(nonRxItems);
                setShowConfirmModal(true);
              }
            },
            { text: 'View Prescriptions', onPress: () => navigation.navigate('PrescriptionUpload') }
          ]
        );
      } else {
        Alert.alert(
          'Prescription Required',
          'Your cart contains items that require an approved prescription. Please wait for pharmacist approval.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'View Prescriptions', onPress: () => navigation.navigate('PrescriptionUpload') }
          ]
        );
      }
      return;
    }
    
    setCheckoutItems(cart);
    setShowConfirmModal(true);
  };

  const proceedToCheckout = async () => {
    setShowConfirmModal(false);
    setIsPlacingOrder(true);
    try {
      if (mode === 'pharma') {
        const orderData = {
          addressId: selectedAddress.id,
          paymentMethod: selectedPayment,
          prescriptionId: approvedPrescriptionId || undefined,
          items: checkoutItems.map((item: any) => ({
            medicineId: item.id,
            quantity: item.quantity,
          })),
          notes: deliveryNotes,
          walletAmount: appliedWalletAmount > 0 ? appliedWalletAmount : undefined,
        };
        const res = await pharmaApi.placeOrder(orderData);
        if (res.data && res.data.id) {
          // If we only ordered some items, only remove those from cart
          if (checkoutItems.length < cart.length) {
            checkoutItems.forEach(item => (require('../store/cartStore').useCartStore.getState().removeFromCart)(item.id, 'pharma'));
          } else {
            clearCart('pharma');
          }
          if (selectedPayment === 'jazzcash' || selectedPayment === 'easypaisa') {
            navigation.replace('PaymentWebView', {
              orderId: res.data.id,
              provider: selectedPayment,
              amount: total,
            });
          } else {
            navigation.replace('OrderTracking', { orderId: res.data.id });
          }
        }
        return;
      }

      const restaurantId = mode === 'food' ? (cart[0] as any)?.restaurantId : undefined;
      const orderData = {
        addressId: selectedAddress.id,
        paymentMethod: selectedPayment,
        orderType: mode,
        restaurantId,
        notes: deliveryNotes,
        promoCode: voucherCode || undefined,
        items: cart.map(item => ({
          [mode === 'food' ? 'menuItemId' : 'productId']: item.id,
          quantity: item.quantity,
        })),
        walletAmount: appliedWalletAmount > 0 ? appliedWalletAmount : undefined,
      };
      const res = await ordersApi.checkout(orderData);
      if (res.data && res.data.id) {
        clearCart(mode);
        if (selectedPayment === 'jazzcash' || selectedPayment === 'easypaisa') {
          navigation.replace('PaymentWebView', {
            orderId: res.data.id,
            provider: selectedPayment,
            amount: total,
          });
        } else {
          navigation.replace('OrderTracking', { orderId: res.data.id });
        }
      }
    } catch (error: any) {
      const msg = error.response?.data?.message || 'Failed to place order. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </AppIconButton>
          <View style={{ flex: 1 }}>
            <AppText variant="h2">Checkout</AppText>
            <AppText variant="caption">{totalItems} item{totalItems === 1 ? '' : 's'} • {mode === 'mart' ? 'Mart' : mode === 'food' ? 'Food' : 'Pharma'}</AppText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 140 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Delivery address card */}
          <AppText variant="overline" style={styles.sectionLabel}>Deliver to</AppText>
          {isLoadingAddresses ? (
            <ActivityIndicator color={accent} style={{ marginVertical: 20 }} />
          ) : selectedAddress ? (
            <Pressable style={styles.addressCard} onPress={() => setShowAddressListModal(true)}>
              <View style={[styles.iconCircle, { backgroundColor: accent + '18' }]}>
                <Ionicons name="location" size={20} color={accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <AppText variant="bodyStrong">{selectedAddress.label || 'Address'}</AppText>
                  {selectedAddress.isDefault ? <AppBadge label="Default" variant="secondary" tint={accent} /> : null}
                </View>
                <AppText variant="caption" numberOfLines={2}>{selectedAddress.streetAddress}</AppText>
              </View>
              <View style={[styles.changeBtn, { backgroundColor: accent + '15' }]}>
                <AppText variant="captionStrong" color={accent}>Change</AppText>
              </View>
            </Pressable>
          ) : (
            <Pressable style={styles.addressCard} onPress={() => handleOpenEdit()}>
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceMuted }]}>
                <Ionicons name="add-circle-outline" size={22} color={theme.colors.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">Add a delivery address</AppText>
                <AppText variant="caption">We'll use this to confirm your zone</AppText>
              </View>
              <View style={[styles.changeBtn, { backgroundColor: accent + '15' }]}>
                <AppText variant="captionStrong" color={accent}>Add</AppText>
              </View>
            </Pressable>
          )}

          {/* Delivery instructions */}
          <AppText variant="overline" style={styles.sectionLabel}>Delivery instructions</AppText>
          <View style={styles.notesBox}>
            <Ionicons name="document-text-outline" size={18} color={theme.colors.textSecondary} />
            <TextInput
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              placeholder="e.g. Leave at door, call on arrival…"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.notesInput}
              multiline
              maxLength={200}
            />
          </View>

          {/* Prescription Status for Pharma */}
          {requiresRx && (
            <>
              <AppText variant="overline" style={styles.sectionLabel}>Prescription status</AppText>
              <View style={[styles.statusBox, approvedPrescriptionId ? styles.statusBoxSuccess : styles.statusBoxWarning]}>
                <Ionicons
                  name={approvedPrescriptionId ? 'checkmark-circle' : 'time'}
                  size={20}
                  color={approvedPrescriptionId ? theme.colors.success : theme.colors.warning}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <AppText variant="bodyStrong">
                    {approvedPrescriptionId ? 'Verified prescription attached' : 'Verification Pending'}
                  </AppText>
                  <AppText variant="caption">
                    {approvedPrescriptionId
                      ? 'Your prescription has been approved by our pharmacist.'
                      : 'Waiting for pharmacist approval. You can only place order after approval.'}
                  </AppText>
                </View>
                {!approvedPrescriptionId && (
                  <AppIconButton
                    size={32}
                    bg={theme.colors.surface}
                    onPress={fetchPrescription}
                    disabled={loadingRx}
                  >
                    {loadingRx ? (
                      <ActivityIndicator size="small" color={accent} />
                    ) : (
                      <Ionicons name="refresh" size={16} color={theme.colors.textPrimary} />
                    )}
                  </AppIconButton>
                )}
              </View>
            </>
          )}

          {/* Wallet Balance */}
          {walletBalance > 0 && (
            <>
              <AppText variant="overline" style={styles.sectionLabel}>Wallet balance</AppText>
              <Pressable 
                style={[styles.walletCard, useWalletBalance ? { borderColor: accent, backgroundColor: accent + '10' } : null]}
                onPress={() => setUseWalletBalance(!useWalletBalance)}
              >
                <View style={[styles.iconCircle, { backgroundColor: theme.colors.success + '18' }]}>
                  <Ionicons name="wallet" size={20} color={theme.colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">Use Wallet Credits</AppText>
                  <AppText variant="caption">Available: Rs. {walletBalance.toLocaleString()}</AppText>
                </View>
                <View style={[styles.switch, useWalletBalance ? { backgroundColor: accent } : null]}>
                  <View style={[styles.switchHandle, useWalletBalance ? { alignSelf: 'flex-end' } : null]} />
                </View>
              </Pressable>
            </>
          )}

          {/* Payment */}
          <AppText variant="overline" style={styles.sectionLabel}>Payment method</AppText>
          {PAYMENT_OPTIONS.map(opt => {
            const active = selectedPayment === opt.id;
            return (
              <Pressable
                key={opt.id}
                onPress={() => setSelectedPayment(opt.id)}
                style={[
                  styles.paymentCard,
                  active ? { borderColor: opt.color, backgroundColor: opt.color + '10' } : null,
                ]}
              >
                <View style={[styles.iconCircle, { backgroundColor: opt.color + '18' }]}>
                  <Ionicons name={opt.icon} size={20} color={opt.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong">{opt.title}</AppText>
                  <AppText variant="caption">{opt.desc}</AppText>
                </View>
                {opt.badge ? (
                  <View style={[styles.providerPill, { backgroundColor: opt.color }]}>
                    <AppText variant="badge" color="#fff">{opt.badge}</AppText>
                  </View>
                ) : null}
                <View style={[styles.radio, active ? { borderColor: opt.color, borderWidth: 6 } : null]} />
              </Pressable>
            );
          })}

          {/* Voucher / promo */}
          <AppText variant="overline" style={styles.sectionLabel}>Voucher</AppText>
          <View style={styles.voucherContainer}>
            <View style={[styles.voucherBox, { flex: 1 }]}>
              <Ionicons name="pricetag-outline" size={18} color={theme.colors.textSecondary} />
              <TextInput
                value={voucherCode}
                onChangeText={(txt) => {
                  setVoucherCode(txt);
                  if (appliedCoupon && txt !== appliedCoupon.code) {
                    setAppliedCoupon(null);
                    setCouponDiscount(0);
                  }
                }}
                placeholder="Enter promo code"
                placeholderTextColor={theme.colors.textMuted}
                style={styles.voucherInput}
                autoCapitalize="characters"
                editable={!isValidatingVoucher}
              />
              {voucherCode ? (
                <Pressable onPress={() => { setVoucherCode(''); setAppliedCoupon(null); setCouponDiscount(0); }} hitSlop={8}>
                  <Ionicons name="close-circle" size={18} color={theme.colors.textMuted} />
                </Pressable>
              ) : null}
            </View>
            <AppButton
              label={appliedCoupon ? "Applied" : "Apply"}
              variant={appliedCoupon ? "secondary" : "primary"}
              tint={appliedCoupon ? theme.colors.success : accent}
              size="sm"
              loading={isValidatingVoucher}
              onPress={handleValidateVoucher}
              disabled={!voucherCode || !!appliedCoupon || isValidatingVoucher}
              style={{ minWidth: 80, height: 48, borderRadius: theme.radius.md }}
            />
          </View>
          {appliedCoupon && (
            <View style={styles.couponSuccess}>
              <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
              <AppText variant="captionStrong" color={theme.colors.success}>
                Voucher applied! You saved Rs. {Math.round(couponDiscount)}
              </AppText>
            </View>
          )}

          {/* Order summary */}
          <AppText variant="overline" style={styles.sectionLabel}>Order summary</AppText>
          <View style={styles.summary}>
            {/* Items preview (collapsed list) */}
            {cart.slice(0, 3).map((it: any) => (
              <View key={it.id} style={styles.itemPreview}>
                <View style={styles.itemPreviewImg}>
                  {it.imageUrl ? (
                    <Image source={{ uri: it.imageUrl }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" />
                  ) : (
                    <View style={[styles.fill, { alignItems: 'center', justifyContent: 'center' }]}>
                      <Ionicons name="image-outline" size={18} color={theme.colors.textMuted} />
                    </View>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="bodyStrong" numberOfLines={1}>{it.name}</AppText>
                  <AppText variant="caption">x{it.quantity} • Rs. {Math.round(Number(mode === 'pharma' ? it.sellingPrice : it.price) || 0)}</AppText>
                </View>
                <AppText variant="bodyStrong">
                  Rs. {Math.round((Number(mode === 'pharma' ? it.sellingPrice : it.price) || 0) * it.quantity)}
                </AppText>
              </View>
            ))}
            {cart.length > 3 ? (
              <AppText variant="caption" color={theme.colors.textSecondary}>
                +{cart.length - 3} more item{cart.length - 3 === 1 ? '' : 's'}
              </AppText>
            ) : null}

            <View style={styles.summaryDivider} />

            <View style={styles.sumRow}>
              <AppText variant="body" color={theme.colors.textSecondary}>Subtotal</AppText>
              <AppText variant="bodyStrong">Rs. {Math.round(subtotal)}</AppText>
            </View>
            {couponDiscount > 0 && (
              <View style={styles.sumRow}>
                <AppText variant="body" color={theme.colors.success}>Voucher Discount</AppText>
                <AppText variant="bodyStrong" color={theme.colors.success}>- Rs. {Math.round(couponDiscount)}</AppText>
              </View>
            )}
            <View style={styles.sumRow}>
              <AppText variant="body" color={theme.colors.textSecondary}>Delivery fee</AppText>
              {isLoadingFee ? (
                <ActivityIndicator size="small" color={accent} />
              ) : !isAddressValid ? (
                <AppText variant="bodyStrong" color={theme.colors.danger}>Unavailable</AppText>
              ) : (
                <AppText variant="bodyStrong">Rs. {Math.round(deliveryFee)}</AppText>
              )}
            </View>
            {multiStopSurcharge > 0 ? (
              <View style={styles.sumRow}>
                <AppText variant="body" color={theme.colors.warning}>
                  Batch routing ({multiStopCount} extra stop{multiStopCount > 1 ? 's' : ''})
                </AppText>
                <AppText variant="bodyStrong" color={theme.colors.warning}>
                  Rs. {multiStopSurcharge}
                </AppText>
              </View>
            ) : null}
            {appliedWalletAmount > 0 && (
              <View style={styles.sumRow}>
                <AppText variant="body" color={theme.colors.success}>Wallet Adjustment</AppText>
                <AppText variant="bodyStrong" color={theme.colors.success}>- Rs. {Math.round(appliedWalletAmount)}</AppText>
              </View>
            )}
            <View style={styles.summaryDivider} />
            <View style={styles.sumRow}>
              <AppText variant="title">Grand total</AppText>
              <AppText variant="h3" color={accent}>
                {!isAddressValid ? 'N/A' : `Rs. ${Math.max(0, Math.round(total)).toLocaleString()}`}
              </AppText>
            </View>

            {!isAddressValid && zoneMessage ? (
              <View style={styles.warnRow}>
                <Ionicons name="alert-circle" size={16} color={theme.colors.danger} />
                <AppText variant="caption" color={theme.colors.danger}>{zoneMessage}</AppText>
              </View>
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <AppButton
            label={isPlacingOrder
              ? 'Processing…'
              : !isAddressValid && mode !== 'pharma'
                ? 'Out of service area'
                : mode === 'pharma'
                  ? `Confirm Medicine Order • Rs. ${total.toLocaleString()}`
                  : `Place order • Rs. ${total.toLocaleString()}`}
            variant="primary"
            tint={accent}
            size="lg"
            fullWidth
            loading={isPlacingOrder}
            disabled={isPlacingOrder || (!isAddressValid && mode !== 'pharma') || isLoadingFee || cart.length === 0}
            onPress={handlePlaceOrder}
            trailingIcon={!isPlacingOrder ? <Ionicons name="arrow-forward" size={18} color="#fff" /> : null}
          />
        </View>

        {/* Address Selection Modal */}
        {showAddressListModal && (
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAddressListModal(false)} />
            <View style={styles.bottomSheet}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <AppText variant="h2">Saved addresses</AppText>
                <AppIconButton size={32} bg={theme.colors.surfaceMuted} onPress={() => setShowAddressListModal(false)}>
                  <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
                </AppIconButton>
              </View>
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                {addresses.map((addr) => {
                  const sel = selectedAddress?.id === addr.id;
                  return (
                    <View key={addr.id} style={[styles.addrRow, sel ? { borderColor: accent, backgroundColor: accent + '14' } : null]}>
                      <Pressable style={styles.addrRowMain} onPress={() => handleSelectAddress(addr)}>
                        <View style={[styles.iconCircle, { backgroundColor: theme.colors.surface, ...theme.shadows.sm }]}>
                          <Ionicons
                            name={addr.label === 'Work' ? 'business' : 'home'}
                            size={18}
                            color={accent}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <AppText variant="bodyStrong">{addr.label || 'Address'}</AppText>
                            {addr.isDefault ? <AppBadge label="Default" variant="secondary" tint={accent} /> : null}
                          </View>
                          <AppText variant="caption" numberOfLines={2}>{addr.streetAddress}</AppText>
                        </View>
                        {sel ? (
                          <View style={[styles.tickCircle, { backgroundColor: accent }]}>
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          </View>
                        ) : null}
                      </Pressable>
                      <Pressable style={styles.editBtn} onPress={() => handleOpenEdit(addr)}>
                        <AppText variant="captionStrong" color={accent}>Edit</AppText>
                      </Pressable>
                    </View>
                  );
                })}
              </ScrollView>
              <AppButton
                label="+ Add new address"
                variant="outline"
                tint={accent}
                fullWidth
                style={{ marginTop: theme.spacing.md }}
                onPress={() => handleOpenEdit()}
              />
            </View>
          </View>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowConfirmModal(false)} />
            <View style={styles.confirmSheet}>
              <View style={[styles.iconCircle, styles.confirmIcon, { backgroundColor: accent + '18' }]}>
                <Ionicons name="location" size={28} color={accent} />
              </View>
              <AppText variant="h2" align="center">Confirm your location</AppText>
              <AppText variant="caption" align="center" style={{ marginTop: 6, marginBottom: theme.spacing.lg }}>
                Please ensure your delivery address is correct to avoid delivery delays.
              </AppText>
              <View style={styles.confirmAddrPreview}>
                <AppText variant="bodyStrong">{selectedAddress?.label || 'Delivery address'}</AppText>
                <AppText variant="caption" numberOfLines={3}>{selectedAddress?.streetAddress}</AppText>
              </View>
              <View style={{ flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg }}>
                <AppButton
                  label="Change address"
                  variant="secondary"
                  tint={accent}
                  fullWidth
                  onPress={() => setShowConfirmModal(false)}
                  style={{ flex: 1 }}
                />
                <AppButton
                  label="Confirm & place"
                  variant="primary"
                  tint={accent}
                  fullWidth
                  onPress={proceedToCheckout}
                  style={{ flex: 1.4 }}
                />
              </View>
            </View>
          </View>
        )}

        {/* Address Picker Modal */}
        <AddressPickerModal
          visible={showAddressPickerModal}
          onClose={() => setShowAddressPickerModal(false)}
          onSave={handleUpdateAddress}
          initialData={editingAddressData}
          title={editingAddressData ? 'Edit address' : 'Add new address'}
          accent={accent}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fill: { width: '100%', height: '100%' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: theme.spacing.md,
  },

  sectionLabel: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },

  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },

  // Address card
  addressCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  changeBtn: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },

  // Notes
  notesBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  notesInput: {
    flex: 1, minHeight: 44,
    color: theme.colors.textPrimary,
    fontSize: 14,
    paddingTop: 2,
  },

  // Payment
  paymentCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1.5, borderColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  providerPill: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: theme.radius.sm,
  },
  radio: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: theme.colors.border,
  },

  // Voucher
  voucherBox: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 48,
  },
  voucherContainer: { flexDirection: 'row', gap: theme.spacing.sm, alignItems: 'center' },
  voucherInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    fontSize: 14,
  },
  couponSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: theme.colors.success + '10',
    padding: 8,
    borderRadius: theme.radius.sm,
  },

  // Summary
  summary: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    gap: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  itemPreview: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    paddingVertical: 4,
  },
  itemPreviewImg: {
    width: 40, height: 40,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  summaryDivider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warnRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    marginTop: theme.spacing.sm,
  },

  // Footer
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },

  // Modals
  modalOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
    maxHeight: '85%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },

  addrRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5, borderColor: theme.colors.divider,
    marginBottom: theme.spacing.sm,
  },
  addrRowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: theme.spacing.md, gap: theme.spacing.md },
  tickCircle: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  editBtn: {
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.lg,
    borderLeftWidth: 1, borderLeftColor: theme.colors.divider,
    alignItems: 'center', justifyContent: 'center',
  },

  confirmSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  confirmIcon: { width: 72, height: 72, borderRadius: 36, marginBottom: theme.spacing.md },
  confirmAddrPreview: {
    width: '100%',
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    gap: 4,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },
  statusBoxSuccess: {
    backgroundColor: theme.colors.successLight,
    borderColor: theme.colors.success,
  },
  statusBoxWarning: {
    backgroundColor: theme.colors.warningLight,
    borderColor: theme.colors.warning,
  },
  walletCard: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.md,
    borderRadius: theme.radius.lg,
    borderWidth: 1.5, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  switch: {
    width: 44, height: 24, borderRadius: 12,
    backgroundColor: theme.colors.surfaceMuted,
    padding: 2, justifyContent: 'center',
  },
  switchHandle: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#fff',
    ...theme.shadows.sm,
  },
});
