import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { ordersApi } from '../api/api';

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:    { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending',    icon: '⏳' },
  confirmed:  { color: '#3B82F6', bg: '#EFF6FF', label: 'Confirmed',  icon: '✅' },
  preparing:  { color: '#8B5CF6', bg: '#F5F3FF', label: 'Preparing',  icon: '👨‍🍳' },
  shipped:    { color: '#06B6D4', bg: '#ECFEFF', label: 'Shipped',    icon: '🚴' },
  delivered:  { color: '#10B981', bg: '#ECFDF5', label: 'Delivered',  icon: '📦' },
  cancelled:  { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled',  icon: '❌' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onTrack }: any) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending'];
  const itemCount = order.items?.length || 0;
  const firstItem = order.items?.[0]?.product?.name || 'Order';

  return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>#{order.id?.slice(-8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
        </View>
      </View>
      <View style={styles.orderDivider} />
      <View style={styles.orderBody}>
        <Text style={styles.orderItems} numberOfLines={1}>
          {firstItem}{itemCount > 1 ? ` + ${itemCount - 1} more` : ''}
        </Text>
        <Text style={styles.orderTotal}>Rs. {(Number(order.total) || 0).toFixed(0)}</Text>
      </View>
      {order.address && (
        <Text style={styles.orderAddress} numberOfLines={1}>
          📍 {order.address.streetAddress}
        </Text>
      )}
      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.trackBtn}
          onPress={() => onTrack(order.id)}
        >
          <Text style={styles.trackBtnText}>Track Order</Text>
        </TouchableOpacity>
        {order.status === 'pending' && (
          <TouchableOpacity style={styles.cancelBtn}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MyOrdersScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await ordersApi.getHistory();
      setOrders(res.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const handleTrack = (orderId: string) => {
    navigation.navigate('OrderTracking', { orderId });
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>
      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No orders yet</Text>
          <Text style={styles.emptySubtitle}>When you place an order, it will appear here.</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Main')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
          renderItem={({ item }) => <OrderCard order={item} onTrack={handleTrack} />}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F5F5F5' },
  backIcon: { fontSize: 20, color: '#333' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },
  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  orderId: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  orderDate: { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 12, fontWeight: '700' },
  orderDivider: { height: 1, backgroundColor: '#F5F5F5', marginVertical: 12 },
  orderBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderItems: { flex: 1, fontSize: 14, color: '#555', marginRight: 8 },
  orderTotal: { fontSize: 16, fontWeight: '800', color: '#FF4500' },
  orderAddress: { fontSize: 12, color: '#999', marginTop: 6 },
  orderActions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  trackBtn: {
    flex: 1, backgroundColor: '#FF4500', paddingVertical: 10,
    borderRadius: 10, alignItems: 'center',
  },
  trackBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1.5, borderColor: '#EF4444', alignItems: 'center',
  },
  cancelBtnText: { color: '#EF4444', fontWeight: '700', fontSize: 13 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
  shopBtn: { marginTop: 24, backgroundColor: '#FF4500', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14 },
  shopBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
