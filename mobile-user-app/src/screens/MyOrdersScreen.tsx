import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, ActivityIndicator,
  RefreshControl, Alert, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useCart } from '../context/CartContext';
import { authApi, connectSocket, ordersApi, socket } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { generateReceiptPDF, printReceipt } from '../utils/receiptGenerator';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState, SkeletonBlock,
} from '../components/ui';
import { theme } from '../theme/theme';

type TabKey = 'active' | 'past' | 'rashan';

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
                  : theme.colors.primaryLight,
            }]}>
              <Ionicons
                name={isRashan ? 'cube-outline' : isFood ? 'restaurant-outline' : 'storefront-outline'}
                size={10}
                color={isRashan ? theme.colors.rashan : isFood ? theme.colors.food : theme.colors.primary}
              />
              <AppText variant="badge" color={isRashan ? theme.colors.rashan : isFood ? theme.colors.food : theme.colors.primary}>
                {isRashan ? 'RASHAN' : isFood ? 'FOOD' : 'MART'}
              </AppText>
            </View>
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
          <AppText variant="h3" color={theme.colors.primary}>
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
          leadingIcon={<Ionicons name={isDelivered ? 'star-outline' : 'navigate-outline'} size={14} color="#fff" />}
        />
        {!isDelivered && chatEnabled ? (
          <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => onChat(order)}>
            <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.colors.textPrimary} />
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
            <AppIconButton size={36} bg={theme.colors.primaryLight} onPress={() => onReorder(order)}>
              <Ionicons name="refresh-outline" size={16} color={theme.colors.primary} />
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

export default function MyOrdersScreen({ navigation }: any) {
  const { setActiveOrdersCount } = useCart();
  const { settings } = useSettings();
  const chatEnabled = settings?.feature_chat_enabled === true;

  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const fetchOrders = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1 && !refreshing) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);

      const res = await ordersApi.getHistory(pageNum, 15);
      const resData = res.data || {};
      const newOrders = Array.isArray(resData)
        ? resData
        : (resData.data || resData.orders || resData.items || []);

      setHasMore(newOrders.length === 15);

      setOrders(prev => {
        if (!shouldAppend) return newOrders;
        const existingIds = new Set(prev.map((o: any) => o.id));
        const uniqueNew = newOrders.filter((o: any) => !existingIds.has(o.id));
        return [...prev, ...uniqueNew];
      });
    } catch {
      // noop
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [refreshing]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchOrders(1, false);
    }, [fetchOrders])
  );

  useEffect(() => {
    const activeCount = orders.filter((o: any) => ACTIVE_STATUSES.has(o.status)).length;
    setActiveOrdersCount(activeCount);
  }, [orders, setActiveOrdersCount]);

  useEffect(() => {
    let isMounted = true;
    let joinRoom: (() => void) | null = null;
    const onStatusUpdate = () => {
      if (!isMounted) return;
      setPage(1);
      fetchOrders(1, false);
    };
    const setupSocket = async () => {
      try {
        const userRes = await authApi.getMe();
        const user = userRes.data;
        if (!isMounted) return;
        connectSocket();
        joinRoom = () => { if (user?.id) socket.emit('joinUserRoom', user.id); };
        if (socket.connected) joinRoom();
        socket.on('connect', joinRoom);
        socket.off('orderStatusUpdated', onStatusUpdate);
        socket.on('orderStatusUpdated', onStatusUpdate);
      } catch {
        // noop
      }
    };
    void setupSocket();
    return () => {
      isMounted = false;
      if (joinRoom) socket.off('connect', joinRoom);
      socket.off('orderStatusUpdated', onStatusUpdate);
    };
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setPage(1);
    fetchOrders(1, false);
  }, [fetchOrders]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchOrders(nextPage, true);
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
            setLoading(true);
            await ordersApi.cancelOrder(orderId);
            Alert.alert('Cancelled', 'Order cancelled successfully');
            fetchOrders(1, false);
          } catch (err: any) {
            const msg = err.response?.data?.message || 'Failed to cancel order. Please try again.';
            Alert.alert('Error', msg);
            setLoading(false);
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
    navigation.navigate('OrderChat', { orderId: order.id, riderName: order.rider?.name });
  }, [navigation]);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (activeTab === 'active') return ACTIVE_STATUSES.has(o.status) && o.orderType !== 'rashan';
      if (activeTab === 'past') return PAST_STATUSES.has(o.status) && o.orderType !== 'rashan';
      return o.orderType === 'rashan';
    });
  }, [orders, activeTab]);

  const counts = useMemo(() => ({
    active: orders.filter(o => ACTIVE_STATUSES.has(o.status) && o.orderType !== 'rashan').length,
    past: orders.filter(o => PAST_STATUSES.has(o.status) && o.orderType !== 'rashan').length,
    rashan: orders.filter(o => o.orderType === 'rashan').length,
  }), [orders]);

  const tabs: { key: TabKey; label: string; count: number; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'active', label: 'Active', count: counts.active, icon: 'navigate-outline' },
    { key: 'past', label: 'Past', count: counts.past, icon: 'time-outline' },
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
      <View style={styles.tabsRow}>
        {tabs.map(t => {
          const active = activeTab === t.key;
          return (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[styles.tabBtn, active ? styles.tabBtnActive : null]}
            >
              <Ionicons
                name={t.icon}
                size={14}
                color={active ? theme.colors.primary : theme.colors.textSecondary}
              />
              <AppText
                variant="captionStrong"
                color={active ? theme.colors.primary : theme.colors.textSecondary}
              >
                {t.label}
              </AppText>
              {t.count > 0 ? (
                <View style={[styles.tabCount, active ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceMuted }]}>
                  <AppText variant="badge" color={active ? '#fff' : theme.colors.textSecondary}>
                    {t.count}
                  </AppText>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

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
          icon={activeTab === 'rashan' ? 'cube-outline' : activeTab === 'active' ? 'bicycle-outline' : 'archive-outline'}
          title={activeTab === 'active' ? 'No active orders' : activeTab === 'past' ? 'No past orders yet' : 'No rashan requests'}
          subtitle={activeTab === 'active'
            ? 'You\'ll see live order tracking here.'
            : activeTab === 'past'
              ? 'Once you place an order, it will appear here.'
              : 'Place a bulk rashan request to see it here.'}
          actionLabel={activeTab === 'rashan' ? 'Start Rashan' : 'Start shopping'}
          onAction={() => navigation.navigate(activeTab === 'rashan' ? 'RashanOrder' : 'Main')}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore
            ? <ActivityIndicator size="small" color={theme.colors.primary} style={{ margin: 12 }} />
            : null}
          renderItem={renderItem}
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
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 10, borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5, borderColor: 'transparent',
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
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
});
