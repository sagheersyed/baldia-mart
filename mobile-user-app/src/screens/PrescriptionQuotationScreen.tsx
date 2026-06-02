import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { quotationsApi, addressesApi, normalizeUrl } from '../api/api';
import { AppText, AppIconButton, EmptyState, SkeletonBlock, AppBadge } from '../components/ui';
import { theme } from '../theme/theme';

const formatDate = (d: string) => {
  const date = new Date(d);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()} ${date.getHours() % 12 || 12}:${String(date.getMinutes()).padStart(2,'0')} ${date.getHours() >= 12 ? 'PM' : 'AM'}`;
};

export default function PrescriptionQuotationScreen({ route, navigation }: any) {
  const { prescriptionId, prescriptionImageUrl } = route.params;
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any>(null);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [quotesRes, addrRes] = await Promise.all([
        quotationsApi.getByPrescription(prescriptionId),
        addressesApi.getAll(),
      ]);
      const quotes = Array.isArray(quotesRes.data) ? quotesRes.data : [];
      setQuotations(quotes);

      const addrs = Array.isArray(addrRes.data) ? addrRes.data : [];
      setAddresses(addrs);

      const defaultAddr = addrs.find((a: any) => a.isDefault) || addrs[0];
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);

      // Auto-select the latest pending quotation
      const pending = quotes.find((q: any) => q.status === 'pending');
      if (pending) setSelectedQuote(pending);
      else if (quotes.length > 0) setSelectedQuote(quotes[0]);
    } catch (e) {
      console.error('Error fetching quotations:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [prescriptionId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleAccept = async () => {
    if (!selectedQuote || !selectedAddressId) {
      Alert.alert('Select Address', 'Please select a delivery address before accepting.');
      return;
    }
    setAccepting(true);
    try {
      await quotationsApi.accept(selectedQuote.id, {
        addressId: selectedAddressId,
        paymentMethod: 'cod',
      });
      Alert.alert(
        '✅ Order Placed!',
        'Your prescription order has been confirmed. You can track it in Order History.',
        [{ text: 'View Orders', onPress: () => navigation.navigate('Orders') },
         { text: 'Close', onPress: () => navigation.goBack() }]
      );
      fetchData();
    } catch (e: any) {
      Alert.alert('Error', e?.response?.data?.message || 'Failed to accept quotation.');
    } finally {
      setAccepting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedQuote) return;
    Alert.alert('Reject Quotation?', 'Are you sure you want to reject this quotation?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject', style: 'destructive', onPress: async () => {
          setRejecting(true);
          try {
            await quotationsApi.reject(selectedQuote.id);
            Alert.alert('Rejected', 'The quotation has been rejected.');
            fetchData();
          } catch (e: any) {
            Alert.alert('Error', e?.response?.data?.message || 'Failed to reject quotation.');
          } finally {
            setRejecting(false);
          }
        }
      }
    ]);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <AppBadge label="Pending" variant="warning" />;
      case 'accepted': return <AppBadge label="Accepted" variant="success" />;
      case 'rejected': return <AppBadge label="Rejected" variant="danger" />;
      case 'expired': return <AppBadge label="Expired" variant="neutral" />;
      default: return <AppBadge label={status} variant="neutral" />;
    }
  };

  const isExpired = (q: any) => q.status === 'pending' && new Date() > new Date(q.expiresAt);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </AppIconButton>
          <AppText variant="title" style={{ marginLeft: 16 }}>Quotation</AppText>
        </View>
        <View style={{ padding: 16, gap: 12 }}>
          {[1, 2, 3].map(i => <SkeletonBlock key={i} height={80} radius={theme.radius.md} />)}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <AppText variant="title" style={{ flex: 1, marginLeft: 16 }}>Prescription Quotation</AppText>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.pharma} colors={[theme.colors.pharma]} />}
      >
        {/* Prescription Preview */}
        {prescriptionImageUrl && (
          <View style={styles.rxPreview}>
            <Image source={{ uri: normalizeUrl(prescriptionImageUrl) || '' }} style={styles.rxThumb} contentFit="cover" />
            <View style={{ flex: 1 }}>
              <AppText variant="bodyStrong">Your Prescription</AppText>
              <AppText variant="caption" color={theme.colors.textMuted}>ID: {prescriptionId.slice(0, 8)}...</AppText>
            </View>
          </View>
        )}

        {quotations.length === 0 ? (
          <EmptyState
            icon="receipt-outline"
            title="No Quotation Yet"
            subtitle="Your pharmacist is reviewing your prescription. You'll receive a quotation soon."
          />
        ) : (
          <>
            {/* Quotation Selector (if multiple) */}
            {quotations.length > 1 && (
              <View style={styles.tabBar}>
                {quotations.map((q, i) => (
                  <Pressable
                    key={q.id}
                    onPress={() => setSelectedQuote(q)}
                    style={[styles.tab, selectedQuote?.id === q.id && styles.activeTab]}
                  >
                    <AppText variant="caption" color={selectedQuote?.id === q.id ? theme.colors.pharma : theme.colors.textMuted}>
                      Quote #{i + 1}
                    </AppText>
                  </Pressable>
                ))}
              </View>
            )}

            {selectedQuote && (
              <>
                {/* Status & Expiry */}
                <View style={styles.statusRow}>
                  {getStatusBadge(isExpired(selectedQuote) ? 'expired' : selectedQuote.status)}
                  <AppText variant="caption" color={theme.colors.textMuted}>
                    {isExpired(selectedQuote)
                      ? 'This quotation has expired'
                      : `Expires: ${formatDate(selectedQuote.expiresAt)}`}
                  </AppText>
                </View>

                {/* Items List */}
                <View style={styles.card}>
                  <AppText variant="bodyStrong" style={{ marginBottom: 12 }}>
                    <Ionicons name="medkit" size={16} color={theme.colors.pharma} /> Prescribed Medicines
                  </AppText>

                  {selectedQuote.items?.map((item: any, idx: number) => (
                    <View key={idx} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body">{item.name}</AppText>
                        <AppText variant="caption" color={theme.colors.textMuted}>
                          {item.brand} · {item.strength} · Qty: {item.quantity}
                        </AppText>
                        {item.isSubstituted && (
                          <View style={styles.substituteBadge}>
                            <Ionicons name="swap-horizontal" size={12} color={theme.colors.warning} />
                            <AppText variant="caption" color={theme.colors.warning}> Generic Substitute</AppText>
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <AppText variant="bodyStrong">Rs. {(Number(item.mrp) * item.quantity).toFixed(0)}</AppText>
                        {Number(item.discount) > 0 && (
                          <AppText variant="caption" color={theme.colors.success}>
                            -Rs. {(Number(item.discount) * item.quantity).toFixed(0)}
                          </AppText>
                        )}
                      </View>
                    </View>
                  ))}
                </View>

                {/* Price Breakdown */}
                <View style={styles.card}>
                  <AppText variant="bodyStrong" style={{ marginBottom: 12 }}>
                    <Ionicons name="calculator" size={16} color={theme.colors.pharma} /> Price Breakdown
                  </AppText>

                  <View style={styles.priceRow}>
                    <AppText variant="body" color={theme.colors.textMuted}>Subtotal</AppText>
                    <AppText variant="body">Rs. {Number(selectedQuote.subtotal).toFixed(0)}</AppText>
                  </View>
                  {Number(selectedQuote.discountTotal) > 0 && (
                    <View style={styles.priceRow}>
                      <AppText variant="body" color={theme.colors.success}>Discount</AppText>
                      <AppText variant="body" color={theme.colors.success}>-Rs. {Number(selectedQuote.discountTotal).toFixed(0)}</AppText>
                    </View>
                  )}
                  {Number(selectedQuote.taxTotal) > 0 && (
                    <View style={styles.priceRow}>
                      <AppText variant="body" color={theme.colors.textMuted}>Tax</AppText>
                      <AppText variant="body">Rs. {Number(selectedQuote.taxTotal).toFixed(0)}</AppText>
                    </View>
                  )}
                  <View style={styles.priceRow}>
                    <AppText variant="body" color={theme.colors.textMuted}>Delivery</AppText>
                    <AppText variant="body">Rs. {Number(selectedQuote.deliveryCharges).toFixed(0)}</AppText>
                  </View>
                  <View style={[styles.priceRow, styles.totalRow]}>
                    <AppText variant="h3">Total</AppText>
                    <AppText variant="h3" color={theme.colors.pharma}>Rs. {Number(selectedQuote.finalAmount).toFixed(0)}</AppText>
                  </View>
                </View>

                {/* Address Selector (only for pending quotes) */}
                {selectedQuote.status === 'pending' && !isExpired(selectedQuote) && (
                  <View style={styles.card}>
                    <AppText variant="bodyStrong" style={{ marginBottom: 12 }}>
                      <Ionicons name="location" size={16} color={theme.colors.pharma} /> Delivery Address
                    </AppText>

                    {addresses.length === 0 ? (
                      <Pressable
                        style={styles.addAddressBtn}
                        onPress={() => navigation.navigate('SavedAddresses')}
                      >
                        <Ionicons name="add-circle-outline" size={20} color={theme.colors.pharma} />
                        <AppText variant="body" color={theme.colors.pharma}> Add Delivery Address</AppText>
                      </Pressable>
                    ) : (
                      addresses.map((addr: any) => (
                        <Pressable
                          key={addr.id}
                          style={[styles.addressCard, selectedAddressId === addr.id && styles.addressActive]}
                          onPress={() => setSelectedAddressId(addr.id)}
                        >
                          <Ionicons
                            name={selectedAddressId === addr.id ? 'radio-button-on' : 'radio-button-off'}
                            size={20}
                            color={selectedAddressId === addr.id ? theme.colors.pharma : theme.colors.textMuted}
                          />
                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <AppText variant="bodyStrong">{addr.label || 'Home'}</AppText>
                            <AppText
                              variant="caption"
                              color={selectedAddressId === addr.id ? theme.colors.pharmaDark : theme.colors.textSecondary}
                              numberOfLines={2}
                            >
                              {addr.streetAddress}{addr.landmark ? `, Near ${addr.landmark}` : ''}{addr.city ? `, ${addr.city}` : ''}
                            </AppText>
                          </View>
                        </Pressable>
                      ))
                    )}
                  </View>
                )}

                {/* Action Buttons */}
                {selectedQuote.status === 'pending' && !isExpired(selectedQuote) && (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={[styles.actionBtn, styles.rejectBtn]}
                      onPress={handleReject}
                      disabled={rejecting}
                    >
                      {rejecting
                        ? <ActivityIndicator size="small" color={theme.colors.danger} />
                        : <>
                            <Ionicons name="close-circle" size={20} color={theme.colors.danger} />
                            <AppText variant="bodyStrong" color={theme.colors.danger}> Reject</AppText>
                          </>
                      }
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, styles.acceptBtn]}
                      onPress={handleAccept}
                      disabled={accepting}
                    >
                      {accepting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <>
                            <Ionicons name="checkmark-circle" size={20} color="#fff" />
                            <AppText variant="bodyStrong" color="#fff"> Accept & Order</AppText>
                          </>
                      }
                    </Pressable>
                  </View>
                )}

                {/* Accepted confirmation */}
                {selectedQuote.status === 'accepted' && (
                  <View style={styles.acceptedBanner}>
                    <Ionicons name="checkmark-done-circle" size={24} color={theme.colors.success} />
                    <AppText variant="bodyStrong" color={theme.colors.success} style={{ marginLeft: 8 }}>
                      Quotation accepted — your order is being prepared!
                    </AppText>
                  </View>
                )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  scrollContent: { padding: theme.spacing.lg, paddingBottom: 60, gap: theme.spacing.md },
  rxPreview: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.divider,
  },
  rxThumb: { width: 50, height: 50, borderRadius: theme.radius.sm, backgroundColor: theme.colors.surfaceMuted },
  tabBar: { flexDirection: 'row', gap: 8 },
  tab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: theme.colors.divider, backgroundColor: theme.colors.surface,
  },
  activeTab: { borderColor: theme.colors.pharma, backgroundColor: theme.colors.pharmaLight },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: theme.colors.surface, padding: theme.spacing.md,
    borderRadius: theme.radius.lg, borderWidth: 1, borderColor: theme.colors.divider,
  },
  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: theme.spacing.lg, borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  substituteBadge: {
    flexDirection: 'row', alignItems: 'center', marginTop: 4,
    backgroundColor: '#FFF8E1', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4,
  },
  priceRow: {
    flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
  },
  totalRow: {
    borderTopWidth: 1, borderTopColor: theme.colors.divider, marginTop: 8, paddingTop: 12,
  },
  addAddressBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    padding: 14, borderWidth: 1, borderColor: theme.colors.pharmaBorder,
    borderRadius: theme.radius.md, borderStyle: 'dashed',
  },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.divider,
    marginBottom: 8,
  },
  addressActive: { borderColor: theme.colors.pharma, backgroundColor: theme.colors.pharmaLight },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16, borderRadius: theme.radius.lg,
  },
  rejectBtn: {
    backgroundColor: theme.colors.dangerLight, borderWidth: 1, borderColor: theme.colors.danger,
  },
  acceptBtn: { backgroundColor: theme.colors.pharma },
  acceptedBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#ECFDF5', padding: theme.spacing.md,
    borderRadius: theme.radius.lg, borderWidth: 1, borderColor: '#A7F3D0',
  },
});
