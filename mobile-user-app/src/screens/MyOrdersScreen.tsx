import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Alert, ListRenderItem, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useCart } from '../context/CartContext';
import { authApi, connectSocket, ordersApi, socket } from '../api/api';
import { useCartStore } from '../store/cartStore';
import { useSettings } from '../context/SettingsContext';
import { useOrdersStore } from '../store/ordersStore';
import { generateReceiptPDF, printReceipt } from '../utils/receiptGenerator';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState, SkeletonBlock,
} from '../components/ui';
import { theme } from '../theme/theme';

type TabKey = 'active' | 'past' | 'pharma' | 'rashan';

const STATUS_CONFIG: Record<string, {
  color: string; bg: string; label: string; icon: keyof typeof Ionicons.glyphMap;
}> = {
  pending:           { color: theme.colors.warning, bg: theme.colors.warningLight, label: 'Pending',          icon: 'time-outline' },
  confirmed:         { color: theme.colors.info,    bg: theme.colors.infoLight,    label: 'Confirmed',        icon: 'checkmark-circle-outline' },
  preparing:         { color: '#8B5CF6',            bg: '#F5F3FF',                 label: 'Preparing',        icon: 'restaurant-outline' },
  out_for_delivery:  { color: '#06B6D4',            bg: '#ECFEFF',                 label: 'Out for delivery', icon: 'bicycle-outline' },
  delivered:         { color: theme.colors.success, bg: theme.colors.successLight, label: 'Delivered',        icon: 'cube-outline' },
  cancelled:         { color: theme.colors.danger,  bg: theme.colors.dangerLight,  label: 'Cancelled',        icon: 'close-circle-outline' },
};

const ACTIVE_STATUSES = new Set(['pending', 'confirmed', 'preparing', 'out_for_delivery']);
const PAST_STATUSES = new Set(['delivered', 'cancelled']);

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onTrack, onCancel, onReorder, onChat, onShare, onPrint, chatEnabled }: any) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending'];
  const items = order.items || [];
  const visibleItems = items.filter((i: any) => i.status !== 'missing');
  const missingCount = items.length - visibleItems.length;
  const canCancel = order.status === 'pending' || order.status === 'confirmed';
  const isRashan = order.orderType === 'rashan';
  const isFood = order.orderType === 'food';
  const isDelivered = order.status === 'delivered';
  const eta = order.estimatedDeliveryTime || (isFood ? '30-45 min' : '15-30 min');

  return (
    <View style={[styles.orderCard, order.status === 'cancelled' && styles.cancelledCard]}>
      {/* Top row: ID + status + type */}
      <View style={styles.cardHead}>
        <View style={{ flex: 1 }}>
          <View style={styles.headRow}>
            <AppText variant="captionStrong" color={theme.colors.textSecondary}>
              #{order.id?.slice(0, 8).toUpperCase()}
            </AppText>
            <View style={[styles.typeChip, {
              backgroundColor: isRashan ? theme.colors.rashanLight
                : isFood ? theme.colors.foodLight
                  : order.orderType === 'pharma' ? theme.colors.pharmaLight
                    : theme.colors.primaryLight,
            }]}>
              <Ionicons
                name={isRashan ? 'cube-outline' : isFood ? 'restaurant-outline' : order.orderType === 'pharma' ? 'medical-outline' : 'storefront-outline'}
                size={10}
                color={isRashan ? theme.colors.rashan : isFood ? theme.colors.food : order.orderType === 'pharma' ? theme.colors.pharma : theme.colors.primary}
              />
              <AppText variant="badge" color={isRashan ? theme.colors.rashan : isFood ? theme.colors.food : order.orderType === 'pharma' ? theme.colors.pharma : theme.colors.primary}>
                {isRashan ? 'RASHAN' : isFood ? 'FOOD' : order.orderType === 'pharma' ? 'PHARMA' : 'MART'}
              </AppText>
            </View>
            {order.prescriptionId ? (
              <View style={[styles.typeChip, {
                backgroundColor: theme.colors.infoLight,
              }]}>
                <Ionicons name="document-text-outline" size={10} color={theme.colors.info} />
                <AppText variant="badge" color={theme.colors.info}>
                  Rx ORDER
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant="caption" style={{ marginTop: 2 }}>
            {formatDate(order.createdAt)}
          </AppText>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={12} color={cfg.color} />
          <AppText variant="badge" color={cfg.color}>{cfg.label}</AppText>
        </View>
      </View>

      {/* ETA + items preview */}
      <View style={styles.cardBody}>
        {!isDelivered && order.status !== 'cancelled' ? (
          <View style={styles.etaRow}>
            <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
            <AppText variant="caption" color={theme.colors.textSecondary}>ETA</AppText>
            <AppText variant="captionStrong" color={theme.colors.textPrimary}>{eta}</AppText>
          </View>
        ) : null}

        {!isRashan ? (
          <View style={{ marginTop: 6 }}>
            {visibleItems.slice(0, 2).map((item: any, idx: number) => (
              <AppText key={item.id || idx} variant="body" numberOfLines={1}>
                {item.quantity}× {item.product?.name || item.menuItem?.name || 'Item'}
              </AppText>
            ))}
            {visibleItems.length > 2 ? (
              <AppText variant="caption">+{visibleItems.length - 2} more item{visibleItems.length - 2 === 1 ? '' : 's'}</AppText>
            ) : null}
            {missingCount > 0 ? (
              <View style={styles.missingPill}>
                <Ionicons name="alert-circle" size={12} color={theme.colors.danger} />
                <AppText variant="badge" color={theme.colors.danger}>
                  {missingCount} missing item{missingCount === 1 ? '' : 's'}
                </AppText>
              </View>
            ) : null}
          </View>
        ) : (
          <AppText variant="body" numberOfLines={1}>
            Bulk Rashan ({order.bulkWeightTier?.toUpperCase() || 'CUSTOM'})
          </AppText>
        )}

        <View style={styles.totalRow}>
          {order.address ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, flex: 1 }}>
              <Ionicons name="location-outline" size={12} color={theme.colors.textMuted} />
              <AppText variant="caption" numberOfLines={1} style={{ flex: 1 }}>
                {order.address.streetAddress}
              </AppText>
            </View>
          ) : <View style={{ flex: 1 }} />}
          <AppText variant="h3" color={order.orderType === 'pharma' ? theme.colors.pharma : (isRashan ? theme.colors.rashan : theme.colors.primary)}>
            Rs. {Math.round(Number(order.total) || 0)}
          </AppText>
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <AppButton
          label={isDelivered
            ? ((order.isRated && order.isBusinessRated) ? 'Order details' : 'Rate order')
            : 'Track order'}
          variant="primary"
          size="sm"
          fullWidth
          onPress={() => onTrack(order.id)}
          style={{ flex: 1 }}
          tint={order.orderType === 'pharma' ? theme.colors.pharma : (isRashan ? theme.colors.rashan : undefined)}
          leadingIcon={<Ionicons name={isDelivered ? 'star-outline' : 'navigate-outline'} size={14} color="#fff" />}
        />
        {!isDelivered && chatEnabled ? (
          <AppIconButton 
            size={36} 
            bg={theme.colors.surfaceMuted} 
            onPress={() => onChat(order)}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={order.orderType === 'pharma' ? theme.colors.pharma : (isRashan ? theme.colors.rashan : theme.colors.textPrimary)} />
          </AppIconButton>
        ) : null}
        {isDelivered ? (
          <>
            <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => onShare(order)}>
              <Ionicons name="share-outline" size={16} color={theme.colors.textPrimary} />
            </AppIconButton>
            <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => onPrint(order)}>
              <Ionicons name="receipt-outline" size={16} color={theme.colors.textPrimary} />
            </AppIconButton>
            <AppIconButton 
              size={36} 
              bg={order.orderType === 'pharma' ? theme.colors.pharmaLight : (isRashan ? theme.colors.rashanLight : theme.colors.primaryLight)} 
              onPress={() => onReorder(order)}
            >
              <Ionicons 
                name="refresh-outline" 
                size={16} 
                color={order.orderType === 'pharma' ? theme.colors.pharma : (isRashan ? theme.colors.rashan : theme.colors.primary)} 
              />
            </AppIconButton>
          </>
        ) : null}
        {canCancel ? (
          <AppButton
            label="Cancel"
            variant="outline"
            size="sm"
            tint={theme.colors.danger}
            textColor={theme.colors.danger}
            onPress={() => onCancel(order.id)}
          />
        ) : null}
      </View>
    </View>
  );
}

const MemoOrderCard = React.memo(OrderCard);

export default function MyOrdersScreen({ navigation, route }: any) {
  const { setActiveOrdersCount } = useCart();
  const { settings } = useSettings();
  const chatEnabled = settings?.feature_chat_enabled === true;

  const { orders, loading, loadingMore, ordersPage, ordersTotalPages, fetchOrders, refreshAll } = useOrdersStore();
  const [refreshing, setRefreshing] = useState(false);

  const initialTabFromParams = route?.params?.initialTab as TabKey;
  const { activeMode } = useCartStore();

  const [activeTab, setActiveTab] = useState<TabKey>(
    initialTabFromParams || (activeMode === 'pharma' ? 'pharma' : (activeMode as string) === 'rashan' ? 'rashan' : 'active')
  );

  // Map tab to module type for backend query
  const getModuleType = useCallback((tab: TabKey) => {
    if (tab === 'pharma') return 'pharma';
    if (tab === 'rashan') return 'rashan';
    return 'mart_food'; // both 'active' and 'past' tabs show mart+food
  }, []);

  // Fetch orders when tab changes or screen is focused
  useFocusEffect(
    useCallback(() => {
      fetchOrders(false, 1, getModuleType(activeTab));
    }, [fetchOrders, activeTab, getModuleType])
  );

  // Re-fetch when tab changes
  useEffect(() => {
    fetchOrders(false, 1, getModuleType(activeTab));
  }, [activeTab, fetchOrders, getModuleType]);

  useEffect(() => {
    const activeCount = orders.filter((o: any) => ACTIVE_STATUSES.has(o.status)).length;
    setActiveOrdersCount(activeCount);
  }, [orders, setActiveOrdersCount]);

  useEffect(() => {
    let isMounted = true;
    const onStatusUpdate = () => {
      if (!isMounted || !navigation.isFocused()) return;
      fetchOrders(true, 1, getModuleType(activeTab));
    };

    const setupSocket = async () => {
      try {
        connectSocket();
        socket.off('orderStatusUpdated', onStatusUpdate);
        socket.on('orderStatusUpdated', onStatusUpdate);
      } catch {
        // noop
      }
    };

    void setupSocket();
    return () => {
      isMounted = false;
      socket.off('orderStatusUpdated', onStatusUpdate);
    };
  }, [fetchOrders, navigation, activeTab, getModuleType]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchOrders(true, 1, getModuleType(activeTab));
    setRefreshing(false);
  }, [fetchOrders, activeTab, getModuleType]);

  const handleLoadMore = () => {
    if (!loading && !loadingMore && ordersPage < ordersTotalPages) {
      fetchOrders(false, ordersPage + 1, getModuleType(activeTab));
    }
  };

  const handleTrack = (orderId: string) => navigation.navigate('OrderTracking', { orderId });

  const handleCancel = (orderId: string) => {
    Alert.alert('Cancel order', 'Are you sure you want to cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, cancel',
        style: 'destructive',
        onPress: async () => {
          try {
            await ordersApi.cancelOrder(orderId);
            Alert.alert('Cancelled', 'Order cancelled successfully');
            fetchOrders(true, 1, getModuleType(activeTab));
          } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to cancel order. Please try again.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  };

  const handleReorder = useCallback(async (order: any) => {
    Alert.alert('Reorder', 'Place this order again?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          try {
            await ordersApi.reorderOrder(order.id);
            Alert.alert('Added to cart', 'Items added to your cart.');
            navigation.navigate('Cart');
          } catch (err: any) {
            const msg = err.response?.data?.message || 'Could not reorder this order.';
            Alert.alert('Error', msg);
          }
        },
      },
    ]);
  }, [navigation]);

  const handleChat = useCallback((order: any) => {
    const isPharma = order.orderType === 'pharma';
    const defaultName = isPharma ? 'Pharmacist' : 'Support';
    navigation.navigate('OrderChat', { 
      orderId: order.id, 
      riderName: order.rider?.name || defaultName,
      isSupport: !order.rider
    });
  }, [navigation]);

  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered' | 'cancelled'>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const status = o.status;

      // For active/past tabs, module filtering is done server-side (mart_food)
      // We still need to split by active vs past status client-side
      if (activeTab === 'active' && !ACTIVE_STATUSES.has(status)) return false;
      if (activeTab === 'past' && !PAST_STATUSES.has(status)) return false;

      // For pharma/rashan tabs, apply sub-status filter if set
      if (activeTab === 'pharma' || activeTab === 'rashan') {
        if (statusFilter === 'active') return ACTIVE_STATUSES.has(status);
        if (statusFilter === 'delivered') return status === 'delivered';
        if (statusFilter === 'cancelled') return status === 'cancelled';
      }

      return true;
    });
  }, [orders, activeTab, statusFilter]);

  // Reset status filter when changing module tabs
  useEffect(() => {
    setStatusFilter('all');
  }, [activeTab]);

  const { moduleCache } = useOrdersStore();

  const counts = useMemo(() => {
    // For active/past tabs, count from current mart_food cache
    const martFoodOrders = moduleCache?.mart_food?.orders || [];
    const pharmaOrders = moduleCache?.pharma?.orders || [];
    const rashanOrders = moduleCache?.rashan?.orders || [];
    return {
      active: martFoodOrders.filter((o: any) => ACTIVE_STATUSES.has(o.status)).length,
      past: martFoodOrders.filter((o: any) => PAST_STATUSES.has(o.status)).length,
      pharma: pharmaOrders.length,
      rashan: rashanOrders.length,
    };
  }, [moduleCache]);

  const tabs: { key: TabKey; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'active', label: 'Active', count: counts.active, icon: 'navigate-outline' },
    { key: 'past', label: 'Past', count: counts.past, icon: 'time-outline' },
    { key: 'pharma', label: 'Pharma', count: counts.pharma, icon: 'medical-outline' },
    { key: 'rashan', label: 'Rashan', count: counts.rashan, icon: 'cube-outline' },
  ];

  const renderItem: ListRenderItem<any> = useCallback(({ item }) => (
    <MemoOrderCard
      order={item}
      onTrack={handleTrack}
      onCancel={handleCancel}
      onReorder={handleReorder}
      onChat={handleChat}
      onShare={generateReceiptPDF}
      onPrint={printReceipt}
      chatEnabled={chatEnabled}
    />
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [handleReorder, handleChat, chatEnabled]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">My orders</AppText>
          <AppText variant="caption">Track and manage every order</AppText>
        </View>
      </View>

      {/* Tabs */}
      <View style={{ backgroundColor: theme.colors.surface }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {tabs.map(t => {
            const active = activeTab === t.key;
            const activeColor = t.key === 'pharma' ? theme.colors.pharma 
              : t.key === 'rashan' ? theme.colors.rashan 
              : theme.colors.primary;
            const activeBg = t.key === 'pharma' ? theme.colors.pharmaLight 
              : t.key === 'rashan' ? theme.colors.rashanLight 
              : theme.colors.primaryLight;
            const activeBorder = t.key === 'pharma' ? theme.colors.pharmaBorder 
              : t.key === 'rashan' ? theme.colors.primaryBorder // rashan uses primary border usually
              : theme.colors.primaryBorder;

            return (
              <Pressable
                key={t.key}
                onPress={() => setActiveTab(t.key)}
                style={[
                  styles.tabBtn, 
                  active ? { backgroundColor: activeBg, borderColor: activeBorder } : null
                ]}
              >
                <Ionicons
                  name={t.icon}
                  size={14}
                  color={active ? activeColor : theme.colors.textSecondary}
                />
                <AppText
                  variant="captionStrong"
                  color={active ? activeColor : theme.colors.textSecondary}
                >
                  {t.label}
                </AppText>
                {t.count > 0 ? (
                  <View style={[styles.tabCount, active ? { backgroundColor: activeColor } : { backgroundColor: theme.colors.surfaceMuted }]}>
                    <AppText variant="badge" color={active ? '#fff' : theme.colors.textSecondary}>
                      {t.count}
                    </AppText>
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {(activeTab === 'pharma' || activeTab === 'rashan') && (
        <View style={styles.filterBar}>
          {(['all', 'active', 'delivered', 'cancelled'] as const).map(f => {
            const active = statusFilter === f;
            const activeColor = activeTab === 'pharma' ? theme.colors.pharma : theme.colors.rashan;
            return (
              <Pressable 
                key={f} 
                onPress={() => setStatusFilter(f)}
                style={[styles.filterChip, active ? { backgroundColor: activeColor } : null]}
              >
                <AppText variant="badge" color={active ? '#fff' : theme.colors.textSecondary}>
                  {f.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      )}

      {loading && !refreshing ? (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={[styles.orderCard, { padding: theme.spacing.md, gap: 8 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <SkeletonBlock width={120} height={16} />
                <SkeletonBlock width={90} height={20} radius={10} />
              </View>
              <SkeletonBlock width={'70%'} height={14} />
              <SkeletonBlock width={'50%'} height={14} />
              <SkeletonBlock width={'100%'} height={36} radius={12} />
            </View>
          ))}
        </View>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          icon={activeTab === 'rashan' ? 'cube-outline' : activeTab === 'pharma' ? 'medical-outline' : activeTab === 'active' ? 'bicycle-outline' : 'archive-outline'}
          title={
            activeTab === 'active' ? 'No active orders' : 
            activeTab === 'past' ? 'No past orders yet' : 
            activeTab === 'pharma' ? 'No pharma orders' :
            'No rashan requests'
          }
          subtitle={
            activeTab === 'active' ? "You'll see live order tracking here." : 
            activeTab === 'past' ? "Once you place an order, it will appear here." : 
            activeTab === 'pharma' ? "Your medicine orders and prescriptions will appear here." :
            "Place a bulk rashan request to see it here."
          }
          actionLabel={
            activeTab === 'rashan' ? 'Start Rashan' : 
            activeTab === 'pharma' ? 'Go to Pharmacy' :
            'Start shopping'
          }
          onAction={() => navigation.navigate(
            activeTab === 'rashan' ? 'RashanOrder' : 
            activeTab === 'pharma' ? 'Pharma' :
            'Main'
          )}
          accent={
            activeTab === 'pharma' ? theme.colors.pharma 
            : activeTab === 'rashan' ? theme.colors.rashan 
            : theme.colors.primary
          }
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={activeTab === 'pharma' ? theme.colors.pharma : theme.colors.primary} colors={[activeTab === 'pharma' ? theme.colors.pharma : theme.colors.primary]} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          renderItem={renderItem}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginVertical: 16 }} /> : null}
          ItemSeparatorComponent={() => <View style={{ height: theme.spacing.md }} />}
          initialNumToRender={6}
          maxToRenderPerBatch={6}
          windowSize={9}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background , marginBottom:110},

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  tabsRow: {
    flexDirection: 'row', gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, paddingHorizontal: 16, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5, borderColor: 'transparent',
    marginRight: 8,
  },
  tabBtnActive: {
    // Dynamically set in JSX
  },
  tabCount: {
    minWidth: 18, paddingHorizontal: 6, height: 18,
    borderRadius: 9, alignItems: 'center', justifyContent: 'center',
  },

  orderCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
    gap: theme.spacing.sm,
  },
  cancelledCard: {
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerBorder,
  },

  cardHead: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.sm },
  headRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: theme.radius.sm,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },

  cardBody: { gap: 4 },
  etaRow: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 6, paddingHorizontal: 10,
    backgroundColor: theme.colors.infoLight,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
  },
  missingPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    backgroundColor: theme.colors.dangerLight,
    borderRadius: theme.radius.sm,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: theme.spacing.xs,
  },

  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginTop: 4 },
  
  filterBar: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.divider,
  },
});
