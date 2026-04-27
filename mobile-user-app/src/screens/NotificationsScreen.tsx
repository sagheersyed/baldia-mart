import React, { useState, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, ListRenderItem,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { ordersApi } from '../api/api';
import {
  AppText, AppIconButton, EmptyState, SkeletonBlock,
} from '../components/ui';
import { theme } from '../theme/theme';

const STATUS_CONFIG: Record<string, {
  icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; title: string;
}> = {
  pending:          { icon: 'document-text-outline', color: theme.colors.warning, bg: theme.colors.warningLight, title: 'Order placed' },
  confirmed:        { icon: 'checkmark-circle-outline', color: theme.colors.info, bg: theme.colors.infoLight, title: 'Order confirmed' },
  preparing:        { icon: 'restaurant-outline', color: '#8B5CF6', bg: '#F5F3FF', title: 'Preparing your order' },
  out_for_delivery: { icon: 'bicycle-outline', color: '#06B6D4', bg: '#ECFEFF', title: 'Out for delivery' },
  delivered:        { icon: 'gift-outline', color: theme.colors.success, bg: theme.colors.successLight, title: 'Order delivered' },
  cancelled:        { icon: 'close-circle-outline', color: theme.colors.danger, bg: theme.colors.dangerLight, title: 'Order cancelled' },
};

const STATUS_MESSAGES: Record<string, string> = {
  pending:          'Your order has been placed and is awaiting confirmation.',
  confirmed:        'Great news! Your order has been confirmed by the store.',
  preparing:        'The store is preparing your order.',
  out_for_delivery: 'Your order is out for delivery! Hang tight.',
  delivered:        'Your order has been delivered. Enjoy!',
  cancelled:        'Your order was cancelled.',
};

type Row =
  | { kind: 'header'; title: string; count: number }
  | { kind: 'notif'; order: any; isUnread: boolean };

function NotificationCard({ order, isUnread, onPress }: { order: any; isUnread: boolean; onPress: () => void }) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
  const msg = STATUS_MESSAGES[order.status] || `Order status updated to: ${order.status}`;
  const time = new Date(order.updatedAt || order.createdAt).toLocaleString('en-PK', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <View style={[styles.card, isUnread ? styles.cardUnread : null]}>
      <View style={[styles.iconBubble, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        {isUnread ? <View style={styles.unreadDot} /> : null}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
            {cfg.title}
          </AppText>
          <AppText variant="caption">{time}</AppText>
        </View>
        <AppText variant="caption" color={theme.colors.textPrimary}>
          {msg}
        </AppText>
        <View style={styles.meta}>
          <Ionicons name="cube-outline" size={11} color={theme.colors.textMuted} />
          <AppText variant="caption">
            Order #{String(order.id).slice(-8).toUpperCase()}
          </AppText>
          {order.total ? (
            <>
              <View style={styles.dot} />
              <AppText variant="captionStrong" color={theme.colors.primary}>
                Rs. {Math.round(Number(order.total))}
              </AppText>
            </>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await ordersApi.getHistory();
      const resData = res.data || {};
      const orderData = Array.isArray(resData) ? resData : (resData.data || []);
      setOrders(orderData);
    } catch {
      // noop
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { fetchNotifications(); }, [fetchNotifications]));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

  const data = useMemo<Row[]>(() => {
    if (orders.length === 0) return [];
    const today = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const fresh = orders.filter(o => {
      const t = new Date(o.updatedAt || o.createdAt).getTime();
      return today - t < oneDay;
    });
    const older = orders.filter(o => !fresh.includes(o));
    const rows: Row[] = [];
    if (fresh.length) {
      rows.push({ kind: 'header', title: 'Today', count: fresh.length });
      fresh.forEach(o => rows.push({ kind: 'notif', order: o, isUnread: true }));
    }
    if (older.length) {
      rows.push({ kind: 'header', title: 'Earlier', count: older.length });
      older.forEach(o => rows.push({ kind: 'notif', order: o, isUnread: false }));
    }
    return rows;
  }, [orders]);

  const renderRow: ListRenderItem<Row> = ({ item }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.sectionHead}>
          <AppText variant="overline">{item.title}</AppText>
          <AppText variant="caption">{item.count}</AppText>
        </View>
      );
    }
    return (
      <NotificationCard
        order={item.order}
        isUnread={item.isUnread}
        onPress={() => navigation.navigate('OrderTracking', { orderId: item.order.id })}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">Notifications</AppText>
          <AppText variant="caption">{orders.length} {orders.length === 1 ? 'update' : 'updates'}</AppText>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: theme.spacing.lg, gap: theme.spacing.md }}>
          {[0, 1, 2, 3].map(i => (
            <View key={i} style={[styles.card, { gap: 4 }]}>
              <SkeletonBlock width={42} height={42} radius={21} />
              <View style={{ flex: 1, gap: 6 }}>
                <SkeletonBlock width={'60%'} height={14} />
                <SkeletonBlock width={'90%'} height={12} />
                <SkeletonBlock width={'30%'} height={10} />
              </View>
            </View>
          ))}
        </View>
      ) : orders.length === 0 ? (
        <EmptyState
          icon="notifications-outline"
          title="No notifications yet"
          subtitle="Your order updates and alerts will appear here."
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) =>
            item.kind === 'header' ? `head-${item.title}-${index}` : `${item.order.id}-${index}`}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} colors={[theme.colors.primary]} />}
          renderItem={renderRow}
          ItemSeparatorComponent={({ leadingItem }: any) => leadingItem?.kind === 'header'
            ? <View style={{ height: 6 }} />
            : <View style={{ height: theme.spacing.sm }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  sectionHead: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: theme.spacing.md, paddingBottom: theme.spacing.sm,
  },

  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1, borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  cardUnread: { borderColor: theme.colors.primaryBorder, backgroundColor: theme.colors.primaryLight },

  iconBubble: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  unreadDot: {
    position: 'absolute', top: -2, right: -2,
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: theme.colors.primary,
    borderWidth: 2, borderColor: theme.colors.surface,
  },

  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  dot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.colors.textMuted },
});
