import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, SafeAreaView } from 'react-native';
import { connectSocket, ordersApi, socket } from '../api/api';

export default function OrderHistoryScreen({ navigation }: any) {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
    
    connectSocket();
    
    const refresh = () => fetchHistory();
    socket.on('orderStatusUpdated', refresh);
    socket.on('orderUpdated', refresh);

    return () => {
      socket.off('orderStatusUpdated', refresh);
      socket.off('orderUpdated', refresh);
    };
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await ordersApi.getHistory();
      // Adjusting to new paginated response: { data: Order[], total: number, ... }
      setOrders(res.data.data || []);
    } catch (e) {
      console.error('Fetch history error:', e);
    } finally {
      setLoading(false);
    }
  };

  const renderOrderItem = ({ item }: { item: any }) => {
    const isDelivered = item.status === 'delivered';
    const dateStr = new Date(item.updatedAt).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.orderId}>#ORD-{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.badge, isDelivered ? styles.badgeSuccess : styles.badgeError]}>
            <Text style={styles.badgeText}>{isDelivered ? 'Delivered' : 'Cancelled'}</Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.addressText} numberOfLines={1}>📍 {item.address?.streetAddress || 'Local Area'}</Text>
          <Text style={styles.itemsText}>📦 {item.items?.length || 0} Items</Text>
        </View>
        
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.footerLabel}>Order Total:</Text>
            <Text style={styles.footerValue}>Rs. {item.total || 0}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.footerLabel}>Your Earning:</Text>
            <Text style={styles.earningValue}>Rs. {item.deliveryFee || 0}</Text>
          </View>
        </View>

        <View style={styles.paymentRow}>
          <Text style={styles.paymentLabel}>Payment Method:</Text>
          <View style={[styles.payBadge, item.paymentMethod?.toLowerCase() === 'cod' ? styles.payCod : styles.payOnline]}>
            <Text style={styles.payBadgeText}>
              {item.paymentMethod?.toLowerCase() === 'cod' ? '💵 COD' : '💳 Online'}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Delivery History</Text>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#FF4500" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Delivery History</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>📭</Text>
            <Text style={styles.emptyText}>No delivery history found.</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, paddingTop: 10, backgroundColor: '#1E1E1E', flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15, padding: 5 },
  backIcon: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 15 },
  card: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeSuccess: { backgroundColor: '#E8F5E9' },
  badgeError: { backgroundColor: '#FFEBEE' },
  badgeText: { fontSize: 12, fontWeight: 'bold', color: '#1E1E1E' },
  cardBody: { marginBottom: 15 },
  dateText: { fontSize: 13, color: '#888', marginBottom: 4 },
  addressText: { fontSize: 14, color: '#333', marginBottom: 4 },
  itemsText: { fontSize: 13, color: '#666' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 12, marginBottom: 10 },
  footerLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase' },
  footerValue: { fontSize: 15, fontWeight: 'bold', color: '#333' },
  earningValue: { fontSize: 16, fontWeight: 'bold', color: '#2ecc71' },
  paymentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9f9f9', padding: 8, borderRadius: 8 },
  paymentLabel: { fontSize: 12, color: '#666' },
  payBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  payCod: { backgroundColor: '#FFF3E0' },
  payOnline: { backgroundColor: '#E1F5FE' },
  payBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#E65100' },
  emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyIcon: { fontSize: 50, marginBottom: 15 },
  emptyText: { fontSize: 16, color: '#888' }
});
