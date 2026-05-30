import React, { useState, useMemo } from 'react';
import {
  View, StyleSheet, Pressable, ScrollView, Alert, ActivityIndicator,
  Modal, TextInput, FlatList, Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { isBusinessOpen } from '../utils/helpers';
import { useOrderTracking } from '../hooks/useOrderTracking';
import { useSettings } from '../context/SettingsContext';
import { generateReceiptPDF, printReceipt } from '../utils/receiptGenerator';
import { normalizeUrl } from '../api/api';
import {
  AppText, AppButton, AppIconButton, EmptyState, AppBadge,
} from '../components/ui';
import { theme } from '../theme/theme';

const STEP_ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  pending: 'document-text-outline',
  confirmed: 'checkmark-circle-outline',
  preparing: 'restaurant-outline',
  out_for_delivery: 'bicycle-outline',
  delivered: 'gift-outline',
  pending_review: 'document-text-outline',
  quoted: 'cash-outline',
  approved: 'checkmark-circle-outline',
  sourcing: 'cube-outline',
};

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const { settings } = useSettings();
  const chatEnabled = settings?.feature_chat_enabled === true;

  const {
    order, status, loading, rider, localItems, timeline,
    showRating, setShowRating, ratingStep, businessesToRate, currentBusinessIndex,
    rating, setRating, comment, setComment,
    businessRating, setBusinessRating, businessComment, setBusinessComment,
    submittingReview,
    showAddProduct, setShowAddProduct, filteredProducts, searchQuery, setSearchQuery, addingProductId,
    steps, currentStepIndex,
    fetchOrderDetails: _fetchOrderDetails, hasChanges,
    handleReorder: _handleReorder, handleUpdateQuantityLocal, handleConfirmBatchUpdates, handleRemoveItem: _handleRemoveItem,
    handleAddNewProductToOrder, handleDismissRating, handleSubmitReview, handleApproveQuotation,
    handleCancelRashanRequest,
  } = useOrderTracking(orderId, navigation);

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [itemsCollapsed, setItemsCollapsed] = useState(false);

  const isRashan = order?.orderType === 'rashan';
  const isFood = order?.orderType === 'food';
  const isPharma = order?.orderType === 'pharma';
  const isDelivered = status === 'delivered';
  const isCancelled = status === 'cancelled';

  const accent = isPharma ? theme.colors.pharma : isFood ? theme.colors.food : theme.colors.primary;
  const accentLight = isPharma ? theme.colors.pharmaLight : isFood ? theme.colors.foodLight : theme.colors.primaryLight;

  const eta = order?.estimatedDeliveryTime || (isFood ? '30-45 min' : isPharma ? '20-40 min' : '15-30 min');
  const progressPct = useMemo(
    () => Math.max(5, ((currentStepIndex + 1) / Math.max(1, steps.length)) * 100),
    [currentStepIndex, steps.length]
  );

  const handleReorder = () => {
    Alert.alert('Reorder', 'Would you like to place the same order again?', [
      { text: 'No', style: 'cancel' },
      { text: 'Yes, reorder', onPress: _handleReorder },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.navigate('Main')}>
            <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
          </AppIconButton>
          <AppText variant="h2">Track order</AppText>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={accent} />
          <AppText variant="caption" style={{ marginTop: 12 }}>Loading order…</AppText>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.navigate('Main')}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">Track order</AppText>
          <AppText variant="caption">#{String(orderId).slice(0, 8).toUpperCase()}</AppText>
        </View>
        {!isCancelled && !isDelivered && chatEnabled && rider ? (
          <AppIconButton
            size={36}
            bg={accentLight}
            onPress={() => navigation.navigate('OrderChat', { orderId, riderName: rider.name })}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={18} color={accent} />
          </AppIconButton>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {isCancelled ? (
          <View style={styles.cancelledBanner}>
            <View style={[styles.iconCircle, { backgroundColor: theme.colors.dangerLight, marginBottom: theme.spacing.md }]}>
              <Ionicons name="close-circle" size={36} color={theme.colors.danger} />
            </View>
            <AppText variant="h2" align="center" color={theme.colors.danger}>Order cancelled</AppText>
            <AppText variant="caption" align="center" style={{ marginTop: 6 }}>
              {order?.notes || 'This order was cancelled. You can try reordering or contact support.'}
            </AppText>
            {!order?.notes?.includes('missing') ? (
              <AppButton
                label="Reorder now"
                variant="primary"
                tint={accent}
                onPress={handleReorder}
                style={{ marginTop: theme.spacing.lg }}
                leadingIcon={<Ionicons name="refresh" size={16} color="#fff" />}
              />
            ) : null}
          </View>
        ) : (
          /* Status hero card */
          <View style={[styles.statusCard, { borderColor: accentLight }, isPharma && styles.pharmaStatusCard]}>
            <View style={styles.statusHeadRow}>
              <View style={[styles.typeBadge, { backgroundColor: accentLight }]}>
                <Ionicons
                  name={isRashan ? 'cube-outline' : isFood ? 'restaurant-outline' : isPharma ? 'medical-outline' : 'storefront-outline'}
                  size={12}
                  color={accent}
                />
                <AppText variant="badge" color={accent}>
                  {isRashan ? 'RASHAN BULK' : isFood ? 'FOOD' : isPharma ? 'PHARMACY' : 'MART'}
                </AppText>
              </View>
              {!isDelivered ? (
                <View style={styles.etaPill}>
                  <Ionicons name="time-outline" size={12} color={theme.colors.info} />
                  <AppText variant="badge" color={theme.colors.info}>ETA {eta}</AppText>
                </View>
              ) : null}
            </View>

            {isPharma && (
              <View style={styles.pharmaReassurance}>
                <Ionicons name="shield-checkmark" size={16} color="#059669" />
                <AppText variant="caption" color="#047857" style={{ marginLeft: 6 }}>
                  Verified Pharmacist Handling
                </AppText>
              </View>
            )}

            <AppText variant="h1" style={{ marginTop: theme.spacing.md }}>
              {steps[currentStepIndex]?.label || 'Processing…'}
            </AppText>
            <AppText variant="caption" style={{ marginTop: 4 }}>
              {steps[currentStepIndex]?.description}
            </AppText>

            {/* Progress bar */}
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${progressPct}%`, backgroundColor: accent }]} />
            </View>

            {isDelivered ? (
              <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                <AppButton
                  label="Share receipt"
                  variant="outline"
                  tint={accent}
                  textColor={accent}
                  size="sm"
                  fullWidth
                  onPress={() => generateReceiptPDF(order)}
                  leadingIcon={<Ionicons name="share-outline" size={14} color={accent} />}
                  style={{ flex: 1 }}
                />
                <AppButton
                  label="View / print"
                  variant="primary"
                  size="sm"
                  fullWidth
                  onPress={() => printReceipt(order)}
                  leadingIcon={<Ionicons name="receipt-outline" size={14} color="#fff" />}
                  style={{ flex: 1 }}
                />
              </View>
            ) : null}

            {isRashan && order.rashanStatus === 'quoted' ? (
              <View style={[styles.quotationBox, { backgroundColor: theme.colors.infoLight, borderColor: theme.colors.infoBorder }]}>
                <AppText variant="bodyStrong" color={theme.colors.info}>Quotation received</AppText>
                <View style={{ marginVertical: theme.spacing.sm, gap: 6 }}>
                  <View style={styles.sumRow}>
                    <AppText variant="caption">Products (wholesale)</AppText>
                    <AppText variant="captionStrong">Rs. {Number(order.subtotal || 0).toLocaleString()}</AppText>
                  </View>
                  <View style={styles.sumRow}>
                    <AppText variant="caption">Sourcing & logistics</AppText>
                    <AppText variant="captionStrong">Rs. {Number(order.deliveryFee || 0).toLocaleString()}</AppText>
                  </View>
                  <View style={[styles.sumRow, { borderTopWidth: 1, borderTopColor: theme.colors.infoBorder, paddingTop: 6 }]}>
                    <AppText variant="bodyStrong" color={theme.colors.info}>Final quotation</AppText>
                    <AppText variant="h3" color={theme.colors.textHeader}>
                      Rs. {Number(order.total).toLocaleString()}
                    </AppText>
                  </View>
                </View>
                <AppButton
                  label="Approve & start sourcing"
                  variant="primary"
                  tint={theme.colors.success}
                  fullWidth
                  onPress={handleApproveQuotation}
                  leadingIcon={<Ionicons name="checkmark-circle" size={16} color="#fff" />}
                />
              </View>
            ) : null}

            {isRashan && ['pending_review', 'quoted'].includes(order.rashanStatus) ? (
              <AppButton
                label="Cancel request"
                variant="outline"
                tint={theme.colors.danger}
                textColor={theme.colors.danger}
                fullWidth
                onPress={handleCancelRashanRequest}
                style={{ marginTop: theme.spacing.md }}
                leadingIcon={<Ionicons name="close-circle-outline" size={16} color={theme.colors.danger} />}
              />
            ) : null}

            {isRashan && order.rashanStatus === 'rejected' ? (
              <View style={[styles.quotationBox, { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.dangerBorder }]}>
                <AppText variant="bodyStrong" color={theme.colors.danger}>Request rejected</AppText>
                <AppText variant="caption" color={theme.colors.danger} style={{ marginTop: 4 }}>
                  {order.adminRejectionReason || 'No reason provided.'}
                </AppText>
              </View>
            ) : null}
          </View>
        )}

        {/* Multi-vendor sub-orders */}
        {order?.subOrders && order.subOrders.length > 1 && isFood ? (
          <View style={styles.card}>
            <View style={styles.cardHead}>
              <View style={{ flex: 1 }}>
                <AppText variant="title">Batch order</AppText>
                <AppText variant="caption">{order.subOrders.length} restaurants</AppText>
              </View>
              <Ionicons name="git-branch-outline" size={18} color={theme.colors.textSecondary} />
            </View>
            <View style={{ gap: theme.spacing.sm }}>
              {order.subOrders.map((sub: any, idx: number) => {
                const map: any = {
                  pending: { bg: theme.colors.surfaceMuted, text: theme.colors.textSecondary },
                  confirmed: { bg: theme.colors.infoLight, text: theme.colors.info },
                  preparing: { bg: '#FFF5F5', text: theme.colors.danger },
                  ready: { bg: theme.colors.successLight, text: theme.colors.success },
                  picked_up: { bg: '#FAF5FF', text: '#805AD5' },
                  delivered: { bg: theme.colors.successLight, text: theme.colors.success },
                };
                const c = map[sub.status] || map.pending;
                return (
                  <View key={sub.id || idx} style={styles.subRow}>
                    <View style={[styles.iconCircle, { backgroundColor: accentLight, width: 36, height: 36, borderRadius: 18 }]}>
                      <Ionicons name="restaurant-outline" size={16} color={accent} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <AppText variant="bodyStrong" numberOfLines={1}>
                        {sub.restaurant?.name || sub.vendor?.name || 'Restaurant'}
                      </AppText>
                      <AppText variant="caption" numberOfLines={1}>
                        {sub.restaurant?.location || sub.vendor?.location || 'Baldia'}
                      </AppText>
                    </View>
                    <View style={[styles.subStatus, { backgroundColor: c.bg }]}>
                      <AppText variant="badge" color={c.text}>
                        {String(sub.status).toUpperCase()}
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* Rider card */}
        {rider ? (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View style={[styles.iconCircle, { backgroundColor: accentLight }]}>
                {rider.avatar ? (
                  <Image source={{ uri: normalizeUrl(rider.avatar) || undefined }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                ) : (
                  <AppText variant="h3" color={accent}>{rider.name?.[0] || 'R'}</AppText>
                )}
              </View>
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong">{rider.name || 'Your rider'}</AppText>
                <AppText variant="caption">Assigned to your delivery</AppText>
              </View>
              {!isDelivered && !isCancelled && chatEnabled ? (
                <AppIconButton
                  size={40}
                  bg={accentLight}
                  onPress={() => navigation.navigate('OrderChat', { orderId, riderName: rider.name })}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={18} color={accent} />
                </AppIconButton>
              ) : null}
              {rider.phoneNumber ? (
                <AppIconButton
                  size={40}
                  bg={theme.colors.successLight}
                  onPress={() => Linking.openURL(`tel:${rider.phoneNumber}`)}
                >
                  <Ionicons name="call" size={18} color={theme.colors.success} />
                </AppIconButton>
              ) : null}
            </View>
          </View>
        ) : null}

        {/* Rashan-specific details */}
        {order && isRashan ? (
          <View style={styles.card}>
            <AppText variant="title" style={{ marginBottom: theme.spacing.md }}>Bulk rashan details</AppText>

            {order.bulkListPhotoUrls && order.bulkListPhotoUrls.length > 0 ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText variant="overline" style={{ marginBottom: 6 }}>Grocery list photos</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
                  {order.bulkListPhotoUrls.map((url: string, index: number) => (
                    <Pressable key={index} onPress={() => setSelectedImageUrl(url)} style={[styles.photoWrap, { width: 160 }]}>
                      <Image source={{ uri: normalizeUrl(url) || undefined }} style={[styles.photo, { width: 160, height: 160 }]} contentFit="cover" />
                      <View style={styles.expandHint}>
                        <Ionicons name="expand-outline" size={12} color="#fff" />
                        <AppText variant="badge" color="#fff">Expand</AppText>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : order.bulkListPhotoUrl ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText variant="overline" style={{ marginBottom: 6 }}>Grocery list photo</AppText>
                <Pressable onPress={() => setSelectedImageUrl(order.bulkListPhotoUrl)} style={styles.photoWrap}>
                  <Image source={{ uri: normalizeUrl(order.bulkListPhotoUrl) || undefined }} style={styles.photo} contentFit="cover" />
                  <View style={styles.expandHint}>
                    <Ionicons name="expand-outline" size={12} color="#fff" />
                    <AppText variant="badge" color="#fff">Tap to expand</AppText>
                  </View>
                </Pressable>
              </View>
            ) : null}

            {order.bulkListText ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText variant="overline" style={{ marginBottom: 6 }}>Items</AppText>
                <View style={styles.textListPanel}>
                  <AppText variant="body">{order.bulkListText}</AppText>
                </View>
              </View>
            ) : null}

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <AppText variant="caption">Weight</AppText>
                <AppText variant="bodyStrong">{order.bulkWeightTier?.toUpperCase() || '—'}</AppText>
              </View>
              <View style={styles.metaItem}>
                <AppText variant="caption">Floor</AppText>
                <AppText variant="bodyStrong">{order.bulkFloor || '—'}</AppText>
              </View>
              <View style={styles.metaItem}>
                <AppText variant="caption">Placement</AppText>
                <AppText variant="bodyStrong">{order.bulkPlacement?.toUpperCase() || '—'}</AppText>
              </View>
            </View>

            <View style={styles.divider} />
            <AppText variant="overline">Delivery address</AppText>
            <AppText variant="bodyStrong" style={{ marginTop: 4 }}>{order.bulkStreetAddress}, {order.bulkCity}</AppText>
            {order.bulkLandmark ? <AppText variant="caption">Near {order.bulkLandmark}</AppText> : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <Ionicons name="call-outline" size={14} color={accent} />
              <AppText variant="captionStrong" color={accent}>{order.bulkMobileNumber}</AppText>
            </View>

            {order.total > 0 ? (
              <>
                <View style={styles.divider} />
                <View style={styles.sumRow}>
                  <AppText variant="caption">Products subtotal</AppText>
                  <AppText variant="captionStrong">Rs. {Number(order.subtotal || 0).toLocaleString()}</AppText>
                </View>
                <View style={styles.sumRow}>
                  <AppText variant="caption">Sourcing & delivery</AppText>
                  <AppText variant="captionStrong">Rs. {Number(order.deliveryFee || 0).toLocaleString()}</AppText>
                </View>
                <View style={[styles.sumRow, { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.divider }]}>
                  <AppText variant="title">Grand total</AppText>
                  <AppText variant="h3" color={accent}>Rs. {Number(order.total).toLocaleString()}</AppText>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Prescription-specific details */}
        {order && isPharma && order.prescription ? (
          <View style={styles.card}>
            <AppText variant="title" style={{ marginBottom: theme.spacing.md }}>Prescription details</AppText>

            {order.prescription.imageUrl ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText variant="overline" style={{ marginBottom: 6 }}>Prescription photo</AppText>
                <Pressable onPress={() => setSelectedImageUrl(order.prescription.imageUrl)} style={styles.photoWrap}>
                  <Image source={{ uri: normalizeUrl(order.prescription.imageUrl) || undefined }} style={styles.photo} contentFit="cover" />
                  <View style={styles.expandHint}>
                    <Ionicons name="expand-outline" size={12} color="#fff" />
                    <AppText variant="badge" color="#fff">Tap to expand</AppText>
                  </View>
                </Pressable>
              </View>
            ) : null}

            {order.prescription.additionalImageUrls && order.prescription.additionalImageUrls.length > 0 ? (
              <View style={{ marginBottom: theme.spacing.md }}>
                <AppText variant="overline" style={{ marginBottom: 6 }}>Additional pages</AppText>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: theme.spacing.sm }}>
                  {order.prescription.additionalImageUrls.map((url: string, index: number) => (
                    <Pressable key={index} onPress={() => setSelectedImageUrl(url)} style={[styles.photoWrap, { width: 160 }]}>
                      <Image source={{ uri: normalizeUrl(url) || undefined }} style={[styles.photo, { width: 160, height: 160 }]} contentFit="cover" />
                      <View style={styles.expandHint}>
                        <Ionicons name="expand-outline" size={12} color="#fff" />
                        <AppText variant="badge" color="#fff">Expand</AppText>
                      </View>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}

            <View style={styles.metaGrid}>
              <View style={styles.metaItem}>
                <AppText variant="caption">Patient Name</AppText>
                <AppText variant="bodyStrong">{order.prescription.patientName || 'Anonymous'}</AppText>
              </View>
              <View style={styles.metaItem}>
                <AppText variant="caption">Doctor</AppText>
                <AppText variant="bodyStrong">{order.prescription.doctorName ? `Dr. ${order.prescription.doctorName}` : '—'}</AppText>
              </View>
              <View style={styles.metaItem}>
                <AppText variant="caption">Status</AppText>
                <AppText variant="bodyStrong" color={theme.colors.success}>{String(order.prescription.status || 'approved').toUpperCase()}</AppText>
              </View>
            </View>

            {order.prescription.reviewerNotes ? (
              <>
                <View style={styles.divider} />
                <AppText variant="overline" style={{ marginBottom: 4 }}>Pharmacist Notes</AppText>
                <View style={[styles.textListPanel, { backgroundColor: theme.colors.pharmaLight, borderColor: theme.colors.pharmaBorder }]}>
                  <AppText variant="body" color={theme.colors.pharmaDark}>{order.prescription.reviewerNotes}</AppText>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Order items (collapsible) */}
        {order && order.items && order.items.length > 0 && !isRashan ? (
          <View style={styles.card}>
            <Pressable
              style={styles.cardHead}
              onPress={() => setItemsCollapsed(!itemsCollapsed)}
            >
              <View style={{ flex: 1 }}>
                <AppText variant="title">Order summary</AppText>
                <AppText variant="caption">
                  {order.items.length} item{order.items.length === 1 ? '' : 's'} • Rs. {Number(order.total).toLocaleString()}
                </AppText>
              </View>
              <Ionicons
                name={itemsCollapsed ? 'chevron-down' : 'chevron-up'}
                size={18}
                color={theme.colors.textSecondary}
              />
            </Pressable>

            {!itemsCollapsed ? (
              <>
                {/* Group items by sub-order for Pharma Split Deliveries */}
                {isPharma && order.subOrders && order.subOrders.length > 1 ? (
                  order.subOrders.map((sub: any, index: number) => {
                    const subItems = localItems.filter((i: any) => i.subOrderId === sub.id && i.status !== 'missing');
                    if (subItems.length === 0) return null;
                    
                    return (
                      <View key={sub.id} style={{ marginBottom: 16 }}>
                        <View style={styles.subOrderHeader}>
                          <Ionicons name="cube-outline" size={14} color={theme.colors.textMuted} />
                          <AppText variant="captionStrong" style={{ marginLeft: 6 }}>
                            Package {index + 1} of {order.subOrders.length}
                          </AppText>
                        </View>
                        {subItems.map((it: any) => (
                          <View key={it.id} style={styles.itemRow}>
                            <View style={{ flex: 1 }}>
                              <AppText variant="body" numberOfLines={1}>{it.productName || it.medicine?.name}</AppText>
                              <AppText variant="caption">Rs. {it.priceAtTime} × {it.quantity}</AppText>
                              {isDelivered && (
                                <Pressable 
                                  onPress={() => navigation.navigate('MedicineReviews', { medicineId: it.medicineId, medicineName: it.productName || it.medicine?.name })}
                                  style={{ marginTop: 4, flexDirection: 'row', alignItems: 'center' }}
                                >
                                  <Ionicons name="star-outline" size={12} color={accent} />
                                  <AppText variant="captionStrong" color={accent} style={{ marginLeft: 4 }}>Read reviews</AppText>
                                </Pressable>
                              )}
                            </View>
                            <AppText variant="bodyStrong">×{it.quantity}</AppText>
                          </View>
                        ))}
                      </View>
                    );
                  })
                ) : (
                  localItems.filter((i: any) => i.status !== 'missing').map((it: any) => (
                    <View key={it.id} style={styles.itemRow}>
                      <View style={{ flex: 1 }}>
                        <AppText variant="body" numberOfLines={1}>
                          {it.productName || it.menuItem?.name || it.product?.name || it.medicine?.name || 'Item'}
                        </AppText>
                        <AppText variant="caption">
                          Rs. {it.priceAtTime} × {it.quantity}
                        </AppText>
                      </View>
                      {(status === 'pending' || status === 'confirmed') && order.orderType === 'mart' ? (
                        <View style={styles.qtyControls}>
                          <Pressable style={styles.qtyBtn} onPress={() => handleUpdateQuantityLocal(it.id, it.quantity - 1)}>
                            <Ionicons name="remove" size={14} color={accent} />
                          </Pressable>
                          <AppText variant="bodyStrong" style={{ minWidth: 22, textAlign: 'center' }}>{it.quantity}</AppText>
                          <Pressable style={styles.qtyBtn} onPress={() => handleUpdateQuantityLocal(it.id, it.quantity + 1)}>
                            <Ionicons name="add" size={14} color={accent} />
                          </Pressable>
                        </View>
                      ) : (
                        <AppText variant="bodyStrong">×{it.quantity}</AppText>
                      )}
                    </View>
                  ))
                )}

                {order.items.filter((i: any) => i.status === 'missing').length > 0 ? (
                  <View style={{ marginTop: theme.spacing.md }}>
                    <View style={[styles.missingHeader, { backgroundColor: theme.colors.dangerLight }]}>
                      <Ionicons name="alert-circle" size={14} color={theme.colors.danger} />
                      <AppText variant="captionStrong" color={theme.colors.danger}>
                        Missing items (not charged)
                      </AppText>
                    </View>
                    {order.items.filter((i: any) => i.status === 'missing').map((it: any) => (
                      <View key={it.id} style={[styles.itemRow, { opacity: 0.6 }]}>
                        <View style={{ flex: 1 }}>
                          <AppText variant="body" style={{ textDecorationLine: 'line-through' }} numberOfLines={1}>
                            {it.productName || it.menuItem?.name || it.product?.name || it.medicine?.name || 'Item'}
                          </AppText>
                          <AppText variant="caption">Marked as missing by rider</AppText>
                        </View>
                        <AppBadge label="MISSING" variant="danger" />
                      </View>
                    ))}
                  </View>
                ) : null}

                {(status === 'pending' || status === 'confirmed') && order?.orderType !== 'food' ? (
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
                    {hasChanges() ? (
                      <AppButton
                        label="Confirm changes"
                        variant="primary"
                        tint={accent}
                        size="sm"
                        fullWidth
                        onPress={handleConfirmBatchUpdates}
                        style={{ flex: 1 }}
                      />
                    ) : null}
                    <AppButton
                      label={isPharma ? "+ Add medicine" : "+ Add product"}
                      variant="outline"
                      tint={accent}
                      textColor={accent}
                      size="sm"
                      fullWidth
                      onPress={() => setShowAddProduct(true)}
                      style={{ flex: 1 }}
                    />
                  </View>
                ) : null}

                <View style={styles.divider} />
                <View style={styles.sumRow}>
                  <AppText variant="title">Total</AppText>
                  <AppText variant="h3" color={accent}>Rs. {Number(order.total).toLocaleString()}</AppText>
                </View>
              </>
            ) : null}
          </View>
        ) : null}

        {/* Timeline */}
        <View style={styles.card}>
          <AppText variant="title" style={{ marginBottom: theme.spacing.md }}>Order journey</AppText>
          <View>
            {steps.map((step, index) => {
              const historyItem = timeline.find(h => h.status === step.key);
              const isCompleted = !!historyItem;
              const isCurrent = index === currentStepIndex;
              const isLast = index === steps.length - 1;
              const isPassed = isCompleted || isCurrent;
              return (
                <View key={step.key} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[
                      styles.timelineDot,
                      isPassed ? { borderColor: accent, backgroundColor: isCurrent ? accent : theme.colors.surface } : null,
                    ]}>
                      <Ionicons
                        name={
                          isPharma && step.key === 'pending'
                            ? 'search-outline'
                            : isPharma && step.key === 'preparing'
                            ? 'medical-outline'
                            : STEP_ICON_MAP[step.key] || 'ellipse-outline'
                        }
                        size={14}
                        color={isCurrent ? '#fff' : isPassed ? accent : theme.colors.textMuted}
                      />
                    </View>
                    {!isLast ? (
                      <View style={[styles.timelineConnector, isCompleted ? { backgroundColor: accent } : null]} />
                    ) : null}
                  </View>
                  <View style={styles.timelineRight}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <AppText
                        variant={isCurrent ? 'bodyStrong' : 'body'}
                        color={isCurrent ? accent : isPassed ? theme.colors.textPrimary : theme.colors.textMuted}
                      >
                        {step.label}
                      </AppText>
                      {historyItem ? (
                        <AppText variant="caption">
                          {new Date(historyItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </AppText>
                      ) : null}
                    </View>
                    <AppText variant="caption">{step.description}</AppText>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Rating modal */}
        <Modal visible={showRating} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.ratingSheet}>
              <View style={styles.sheetHandle} />
              {ratingStep === 1 ? (
                <>
                  <AppText variant="h2" align="center">Rate your rider</AppText>
                  <AppText variant="caption" align="center" style={{ marginTop: 6 }}>
                    How was your delivery experience with {rider?.name || 'your rider'}?
                  </AppText>
                </>
              ) : (
                <>
                  <AppText variant="h2" align="center">
                    Rate {businessesToRate[currentBusinessIndex]?.name || (isFood ? 'restaurant' : 'products')}
                  </AppText>
                  <AppText variant="caption" align="center" style={{ marginTop: 6 }}>
                    Step {currentBusinessIndex + 1} of {businessesToRate.length} • How was the quality?
                  </AppText>
                </>
              )}

              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => {
                  const filled = ratingStep === 1 ? rating >= s : businessRating >= s;
                  return (
                    <Pressable
                      key={s}
                      onPress={() => ratingStep === 1 ? setRating(s) : setBusinessRating(s)}
                      hitSlop={6}
                    >
                      <Ionicons name={filled ? 'star' : 'star-outline'} size={36} color={filled ? '#FFB800' : theme.colors.borderStrong} />
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.commentInput}
                placeholder={ratingStep === 1
                  ? 'Share your delivery experience…'
                  : `Tell us about the ${isFood ? 'food' : 'products'}…`}
                placeholderTextColor={theme.colors.textMuted}
                multiline
                value={ratingStep === 1 ? comment : businessComment}
                onChangeText={ratingStep === 1 ? setComment : setBusinessComment}
              />

              <AppButton
                label={submittingReview
                  ? 'Submitting…'
                  : (ratingStep === 1
                    ? (businessesToRate.length > 0 ? 'Next: rate business' : 'Finish')
                    : (currentBusinessIndex < businessesToRate.length - 1 ? 'Next business' : 'Submit feedback'))}
                variant="primary"
                tint={accent}
                fullWidth
                size="lg"
                loading={submittingReview}
                disabled={submittingReview}
                onPress={handleSubmitReview}
                style={{ marginTop: theme.spacing.md }}
              />
              <AppButton
                label="Maybe later"
                variant="ghost"
                fullWidth
                size="sm"
                onPress={handleDismissRating}
                style={{ marginTop: 4 }}
              />
            </View>
          </View>
        </Modal>

        {/* Add Product Modal */}
        <Modal visible={showAddProduct} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowAddProduct(false)} />
            <View style={[styles.bottomSheet, { height: '82%' }]}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <AppText variant="h2">Add {isPharma ? 'medicines' : isFood ? 'dishes' : 'items'} to order</AppText>
                <AppIconButton size={32} bg={theme.colors.surfaceMuted} onPress={() => setShowAddProduct(false)}>
                  <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
                </AppIconButton>
              </View>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={16} color={theme.colors.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder={isPharma ? 'Search medicines…' : isFood ? 'Search dishes…' : 'Search products…'}
                  placeholderTextColor={theme.colors.textMuted}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <FlatList
                data={filteredProducts}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: theme.spacing.xl }}
                ListEmptyComponent={() => (
                  <EmptyState icon="search-outline" title="No items found" subtitle="Try another search query." />
                )}
                renderItem={({ item }) => {
                  const price = Number(item.price) - Number(item.discount || 0);
                  const closed = !isBusinessOpen(item.openingTime, item.closingTime);
                  const out = item.stockQuantity < 1;
                  return (
                    <View style={styles.addRow}>
                      <View style={styles.addImg}>
                        {item.imageUrl ? (
                          <Image source={{ uri: normalizeUrl(item.imageUrl) || undefined }} style={styles.fill} contentFit="cover" />
                        ) : (
                          <Ionicons name="image-outline" size={20} color={theme.colors.textMuted} />
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <AppText variant="bodyStrong" numberOfLines={1}>{item.name}</AppText>
                        <AppText variant="captionStrong" color={accent}>
                          Rs. {Number(item.price || item.mrp || 0).toFixed(0)}
                        </AppText>
                      </View>
                      <AppButton
                        label={out ? 'Out' : closed ? 'Closed' : '+ Add'}
                        variant="primary"
                        tint={accent}
                        size="sm"
                        loading={addingProductId === item.id}
                        disabled={out || closed || addingProductId === item.id}
                        onPress={() => handleAddNewProductToOrder(item.id)}
                      />
                    </View>
                  );
                }}
              />
            </View>
          </View>
        </Modal>

        {/* Full screen image viewer */}
        <Modal visible={!!selectedImageUrl} transparent animationType="fade">
          <View style={styles.fullImageOverlay}>
            <AppIconButton
              size={40}
              bg="rgba(255,255,255,0.18)"
              onPress={() => setSelectedImageUrl(null)}
              style={styles.fullImageClose}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </AppIconButton>
            {selectedImageUrl ? (
              <Image source={{ uri: normalizeUrl(selectedImageUrl) || undefined }} style={styles.fullImage} contentFit="contain" />
            ) : null}
          </View>
        </Modal>
      </ScrollView>

      {/* Sticky bottom CTA */}
      <View style={styles.footer}>
        {isDelivered ? (
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            {!(order?.isRated && (businessesToRate.length === 0 || order?.isBusinessRated)) ? (
              <AppButton
                label="Leave review"
                variant="primary"
                tint={accent}
                fullWidth
                size="lg"
                onPress={() => setShowRating(true)}
                leadingIcon={<Ionicons name="star" size={16} color="#fff" />}
                style={{ flex: 1 }}
              />
            ) : null}
            <AppButton
              label="Reorder"
              variant="outline"
              tint={accent}
              textColor={accent}
              size="lg"
              onPress={handleReorder}
              leadingIcon={<Ionicons name="refresh" size={16} color={accent} />}
              style={{ flex: 1 }}
            />
          </View>
        ) : (isCancelled) ? (
          <AppButton
            label="Reorder"
            variant="primary"
            tint={accent}
            fullWidth
            size="lg"
            onPress={handleReorder}
            leadingIcon={<Ionicons name="refresh" size={16} color="#fff" />}
          />
        ) : (
          <AppButton
            label="Back to home"
            variant="secondary"
            fullWidth
            size="lg"
            onPress={() => navigation.navigate('Main')}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fill: { width: '100%', height: '100%' },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  iconCircle: {
    width: 48, height: 48, borderRadius: 24,
    alignItems: 'center', justifyContent: 'center',
  },

  // Status hero
  statusCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
    marginBottom: theme.spacing.lg,
  },
  pharmaStatusCard: {
    borderColor: theme.colors.pharmaLight,
    backgroundColor: '#F0F9FF', // Subtle medical blue-white
  },
  pharmaReassurance: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(5, 150, 105, 0.1)',
  },
  statusHeadRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, justifyContent: 'space-between' },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: theme.radius.sm,
  },
  etaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    backgroundColor: theme.colors.infoLight,
    borderRadius: theme.radius.pill,
  },
  progressBg: {
    height: 8,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 4,
    overflow: 'hidden',
    marginTop: theme.spacing.md,
  },
  progressFill: { height: '100%', borderRadius: 4 },

  // Cancelled banner
  cancelledBanner: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    alignItems: 'center',
    borderWidth: 1, borderColor: theme.colors.dangerBorder,
    marginBottom: theme.spacing.lg,
  },

  // Generic card
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    borderWidth: 1, borderColor: theme.colors.divider,
    marginBottom: theme.spacing.md,
    ...theme.shadows.sm,
  },
  cardHead: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  divider: { height: 1, backgroundColor: theme.colors.divider, marginVertical: theme.spacing.md },

  // Sub-orders
  subRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  subStatus: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: theme.radius.sm },

  // Items
  subOrderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.sm,
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  qtyControls: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    padding: 3,
  },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    ...theme.shadows.sm,
  },
  missingHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: theme.radius.sm,
    marginBottom: 6,
    alignSelf: 'flex-start',
  },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  // Rashan-specific
  photoWrap: { position: 'relative', borderRadius: theme.radius.md, overflow: 'hidden' },
  photo: { width: '100%', height: 220 },
  expandHint: {
    position: 'absolute', bottom: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  textListPanel: {
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.divider,
  },
  metaGrid: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.sm },
  metaItem: {
    flex: 1, alignItems: 'center', gap: 2,
    backgroundColor: theme.colors.surfaceMuted,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
  },

  // Quotation
  quotationBox: {
    marginTop: theme.spacing.md,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
  },

  // Timeline
  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', width: 40 },
  timelineDot: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 2, borderColor: theme.colors.borderStrong,
    backgroundColor: theme.colors.surface,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 2,
  },
  timelineConnector: {
    width: 2, flex: 1,
    backgroundColor: theme.colors.borderStrong,
    marginVertical: -2,
    minHeight: 20,
  },
  timelineRight: { flex: 1, paddingLeft: theme.spacing.md, paddingBottom: theme.spacing.lg, paddingTop: 4 },

  // Footer
  footer: {
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderTopColor: theme.colors.divider,
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    justifyContent: 'flex-end',
  },
  ratingSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.xl,
    paddingBottom: theme.spacing.xxl,
    alignItems: 'center',
  },
  bottomSheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    paddingBottom: theme.spacing.xxl,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  starsRow: {
    flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xs,
    marginVertical: theme.spacing.lg,
  },
  commentInput: {
    width: '100%',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    color: theme.colors.textPrimary,
    fontSize: 14,
    height: 96,
    textAlignVertical: 'top',
  },

  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    height: 44,
    marginBottom: theme.spacing.md,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.textPrimary },

  addRow: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  addImg: {
    width: 48, height: 48,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },

  fullImageOverlay: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' },
  fullImage: { width: '100%', height: '85%' },
  fullImageClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
});
