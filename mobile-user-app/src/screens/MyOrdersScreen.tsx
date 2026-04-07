import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useCart } from '../context/CartContext';
import { ordersApi, authApi } from '../api/api';
import io from 'socket.io-client';

const BASE_IP = 'https://00ad-175-107-236-228.ngrok-free.app';
const SOCKET_URL = BASE_IP;

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending: { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending', icon: '⏳' },
  confirmed: { color: '#3B82F6', bg: '#EFF6FF', label: 'Confirmed', icon: '✅' },
  preparing: { color: '#8B5CF6', bg: '#F5F3FF', label: 'Preparing', icon: '👨‍🍳' },
  out_for_delivery: { color: '#06B6D4', bg: '#ECFEFF', label: 'Out for Delivery', icon: '🚴' },
  delivered: { color: '#10B981', bg: '#ECFDF5', label: 'Delivered', icon: '📦' },
  cancelled: { color: '#EF4444', bg: '#FEF2F2', label: 'Cancelled', icon: '❌' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function OrderCard({ order, onTrack, onCancel }: any) {
  const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG['pending'];
  const itemCount = order.items?.length || 0;
  const firstItem = order.items?.[0]?.product?.name || 'Order';

  // Cancel is only allowed in the first 2 stages: pending & confirmed
  // Once preparing begins, the mart is already working on the order
  const canCancel = order.status === 'pending' || order.status === 'confirmed';

  return (
    <View style={[styles.orderCard, order.status === 'cancelled' && styles.cancelledCard]}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>#{order.id?.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.icon} {cfg.label}</Text>
        </View>
      </View>
      <View style={styles.orderTypeRow}>
        <View style={[styles.typeBadge, { backgroundColor: order.orderType === 'food' ? '#FFF5F0' : '#F0FFF4' }]}>
          <Text style={[styles.typeText, { color: order.orderType === 'food' ? '#FF4500' : '#2F855A' }]}>
            {order.orderType === 'food' ? '🍔 Food Order' : '🛒 Mart Order'}
          </Text>
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
          <Text style={styles.trackBtnText}>
            {order.status === 'delivered'
              ? ((order.isRated && order.isBusinessRated) ? 'Order Details' : 'Rate Order')
              : 'Track Order'}
          </Text>
        </TouchableOpacity>
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => onCancel(order.id)}
          >
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export default function MyOrdersScreen({ navigation }: any) {
  const { setActiveOrdersCount } = useCart();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const filters = ['All', 'Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'];

  const fetchOrders = useCallback(async (pageNum = 1, shouldAppend = false) => {
    try {
      if (pageNum === 1 && !refreshing) setLoading(true);
      else if (pageNum > 1) setLoadingMore(true);

      const res = await ordersApi.getHistory(pageNum, 15);
      const newOrders = res.data || [];
      
      setHasMore(newOrders.length === 15);

      setOrders(prev => {
        const updated = shouldAppend ? [...prev, ...newOrders] : newOrders;
        // Update active orders count for badge based on recent/all fetched
        const activeCount = updated.filter((o: any) =>
          ['pending', 'confirmed', 'preparing', 'out_for_delivery'].includes(o.status)
        ).length;
        setActiveOrdersCount(activeCount);
        return updated;
      });
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [setActiveOrdersCount, refreshing]);

  useFocusEffect(
    useCallback(() => {
      setPage(1);
      fetchOrders(1, false);
    }, [fetchOrders])
  );

  useEffect(() => {
    let socket: any;

    const setupSocket = async () => {
      try {
        const userRes = await authApi.getMe();
        const user = userRes.data;

        socket = io(SOCKET_URL, {
          transports: ['websocket'],
          forceNew: true
        });

        socket.on('connect', () => {
          console.log('MyOrders: Connected to socket');
          if (user?.id) {
            socket.emit('joinUserRoom', user.id);
          }
        });

        socket.on('orderStatusUpdated', (data: any) => {
          console.log('MyOrders: Received order update:', data);
          setPage(1);
          fetchOrders(1, false);
        });
      } catch (e) {
        console.error('Socket setup error:', e);
      }
    };

    setupSocket();

    return () => {
      if (socket) socket.disconnect();
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

  const handleTrack = (orderId: string) => {
    navigation.navigate('OrderTracking', { orderId });
  };

  const handleCancel = (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await ordersApi.cancelOrder(orderId);
              Alert.alert('Success', 'Order cancelled successfully');
              fetchOrders();
            } catch (error: any) {
              console.error('Failed to cancel order:', error);
              const msg = error.response?.data?.message || 'Failed to cancel order. Please try again.';
              Alert.alert('Error', msg);
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  const filteredOrders = activeFilter === 'All'
    ? orders
    : orders.filter(o => {
      const mappedStatus = activeFilter.toLowerCase().replace(/ /g, '_');
      return o.status === mappedStatus;
    });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.filterWrap}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={filters}
          keyExtractor={(item) => item}
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === item && styles.filterChipActive]}
              onPress={() => setActiveFilter(item)}
              activeOpacity={0.8}
            >
              <Text style={[styles.filterTxt, activeFilter === item && styles.filterTxtActive]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {filteredOrders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📦</Text>
          <Text style={styles.emptyTitle}>No orders found</Text>
          <Text style={styles.emptySubtitle}>Try changing your filter or place a new order.</Text>
          <TouchableOpacity style={styles.shopBtn} onPress={() => navigation.navigate('Main')}>
            <Text style={styles.shopBtnText}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={loadingMore ? <ActivityIndicator size="small" color="#FF4500" style={{ margin: 10 }} /> : null}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onTrack={handleTrack}
              onCancel={handleCancel}
            />
          )}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA', paddingBottom: 35 },
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

  filterWrap: { backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  filterChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#E5E5E5' },
  filterChipActive: { backgroundColor: '#FF4500', borderColor: '#FF4500' },
  filterTxt: { fontSize: 13, fontWeight: '700', color: '#555' },
  filterTxtActive: { color: '#fff' },

  orderCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: 16,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4,
  },
  cancelledCard: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1.5,
    borderColor: '#FED7D7',
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
  orderTypeRow: { marginTop: 8, flexDirection: 'row' },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  orderAddress: { fontSize: 12, color: '#999', marginTop: 10 },
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
