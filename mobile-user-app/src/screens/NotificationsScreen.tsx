import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  SafeAreaView, ActivityIndicator, RefreshControl
} from 'react-native';
import { ordersApi } from '../api/api';

const STATUS_ICONS: Record<string, string> = {
  pending:          '📝',
  confirmed:        '✅',
  preparing:        '👨‍🍳',
  out_for_delivery: '🚴',
  delivered:        '📦',
  cancelled:        '❌',
};

const STATUS_MESSAGES: Record<string, string> = {
  pending:          'Your order has been placed and is awaiting confirmation.',
  confirmed:        'Great news! Your order has been confirmed by the store.',
  preparing:        'The store is preparing your order.',
  out_for_delivery: 'Your order is out for delivery! Hang tight.',
  delivered:        'Your order has been delivered. Enjoy!',
  cancelled:        'Your order was cancelled.',
};

function NotificationItem({ item }: any) {
  const icon = STATUS_ICONS[item.status] || '📋';
  const message = STATUS_MESSAGES[item.status] || `Order status updated to: ${item.status}`;
  const isCancelled = item.status === 'cancelled';
  const isDelivered = item.status === 'delivered';

  return (
    <View style={[styles.item, isCancelled && styles.itemCancelled, isDelivered && styles.itemDelivered]}>
      <View style={[styles.iconBubble, isCancelled && styles.iconBubbleCancelled]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <View style={styles.itemContent}>
        <Text style={styles.itemTitle}>
          Order #{item.id.slice(-8).toUpperCase()}
        </Text>
        <Text style={styles.itemMsg}>{message}</Text>
        <Text style={styles.itemTime}>
          {new Date(item.updatedAt || item.createdAt).toLocaleString('en-PK', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
          })}
        </Text>
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
      setOrders(res.data || []);
    } catch (e) {
      console.error('Failed to load notifications', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchNotifications();
  }, [fetchNotifications]);

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
        <Text style={styles.title}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>🔔</Text>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptySubtitle}>
            Your order updates and alerts will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
          renderItem={({ item }) => <NotificationItem item={item} />}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>Order Updates</Text>
          }
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
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08, shadowRadius: 4,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: '#F5F5F5' },
  backIcon: { fontSize: 20, color: '#333' },
  title: { fontSize: 18, fontWeight: '700', color: '#1A1A1A' },

  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },

  item: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07, shadowRadius: 4,
  },
  itemCancelled: {
    backgroundColor: '#FFF8F8',
    borderWidth: 1, borderColor: '#FED7D7',
  },
  itemDelivered: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1, borderColor: '#BBF7D0',
  },
  iconBubble: {
    width: 46, height: 46, borderRadius: 23, backgroundColor: '#FFF5F0',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  iconBubbleCancelled: { backgroundColor: '#FFF5F5' },
  icon: { fontSize: 22 },
  itemContent: { flex: 1 },
  itemTitle: { fontSize: 14, fontWeight: '700', color: '#1A1A1A' },
  itemMsg: { fontSize: 13, color: '#555', marginTop: 3, lineHeight: 18 },
  itemTime: { fontSize: 11, color: '#999', marginTop: 6, fontWeight: '500' },

  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 20 },
});
