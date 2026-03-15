import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch, ActivityIndicator, Alert, RefreshControl, Vibration } from 'react-native';
import { socket, ordersApi, ridersApi } from '../api/api';

export default function DashboardScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [rider, setRider] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isOnline) {
      socket.connect();
      
      const onConnect = () => {
        console.log('Rider App: Connected to socket');
        if (rider) {
          socket.emit('joinRidersRoom', rider.id);
          socket.emit('joinRiderRoom', rider.id);
        }
      };

      const onNewOrder = (order: any) => {
        setPendingOrders(prev => {
          if (prev.find(o => o.id === order.id)) return prev;
          return [order, ...prev];
        });
        Alert.alert('New Order! 🔔', `A new delivery request for Rs. ${order.total} is available.`);
      };

      const onOrderAccepted = ({ orderId }: any) => {
        setPendingOrders(prev => prev.filter(o => o.id !== orderId));
      };

      const onOrderCancelled = ({ orderId }: any) => {
        // Aggressive vibration pattern: wait 100ms, vibrate 500ms, repeat 3 times
        Vibration.vibrate([100, 500, 100, 500, 100, 500]);
        Alert.alert('Order Cancelled 🛑', `Order #${orderId.slice(0, 8).toUpperCase()} has been cancelled by the customer.`);
        // Refresh everything to be safe
        fetchOrders();
      };

      socket.on('connect', onConnect);
      socket.on('newOrder', onNewOrder);
      socket.on('orderAccepted', onOrderAccepted);
      socket.on('orderCancelled', onOrderCancelled);

      // Trigger initial fetch if rider is already set
      if (rider) {
        fetchOrders();
        fetchRiderInfo();
      } else {
        fetchRiderInfo();
      }

      return () => {
        socket.off('connect', onConnect);
        socket.off('newOrder', onNewOrder);
        socket.off('orderAccepted', onOrderAccepted);
        socket.off('orderCancelled', onOrderCancelled);
        socket.disconnect();
      };
    } else {
      socket.disconnect();
    }
  }, [isOnline, rider?.id]);

  const fetchRiderInfo = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([
        ridersApi.getMe(),
        ridersApi.getStats()
      ]);
      setRider(profileRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Fetch rider info error:', e);
    }
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [pendingRes, activeRes, statsRes] = await Promise.all([
        ordersApi.getPending(),
        ordersApi.getActive(),
        ridersApi.getStats()
      ]);
      setPendingOrders(pendingRes.data);
      setActiveOrders(activeRes.data);
      setStats(statsRes.data);
    } catch (e) {
      console.error('Fetch orders error:', e);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchOrders();
    setRefreshing(false);
  };

  const handleViewOrder = (orderId: string) => {
    navigation.navigate('OrderDetails', { orderId });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>Welcome, {rider?.name || 'Rider'}</Text>
          <Text style={styles.statusText}>{isOnline ? 'Online & Ready' : 'Offline'}</Text>
        </View>
        <Switch
          value={isOnline}
          onValueChange={setIsOnline}
          trackColor={{ false: "#767577", true: "#FF4500" }}
          thumbColor={isOnline ? "#fff" : "#f4f3f4"}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Today's Earnings</Text>
          <Text style={styles.statVal}>Rs. {stats?.todayEarnings?.toFixed(0) || '0'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Deliveries</Text>
          <Text style={styles.statVal}>{stats?.todayDeliveries || 0}</Text>
        </View>
      </View>

      <View style={styles.content}>

        {isOnline ? (
          <ScrollView
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {activeOrders.length > 0 && (
              <View style={styles.activeSection}>
                <Text style={styles.sectionTitle}>Your Current Tasks</Text>
                {activeOrders.map(order => (
                  <View key={order.id} style={[styles.orderCard, styles.activeCard]}>
                    <View style={styles.orderHeader}>
                      <Text style={styles.orderId}>#ORD-{order.id.slice(0, 8).toUpperCase()}</Text>
                      <Text style={styles.activeBadge}>{order.status === 'confirmed' ? 'Assigned' : order.status.replace('_', ' ')}</Text>
                    </View>
                    <View style={styles.orderDetails}>
                      <Text style={styles.detailText}>📍 {order.address?.streetAddress || 'Local Area'}</Text>
                      <Text style={styles.detailText}>📦 {order.items?.length || 0} Items to deliver</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.continueBtn}
                      onPress={() => navigation.navigate('Navigation', { orderId: order.id })}
                    >
                      <Text style={styles.continueBtnText}>Continue Delivery</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={[styles.divider, { marginVertical: 15 }]} />
              </View>
            )}

            <Text style={styles.sectionTitle}>Available Orders</Text>

            {loading && pendingOrders.length === 0 && activeOrders.length === 0 ? (
              <ActivityIndicator size="large" color="#FF4500" style={{ marginTop: 50 }} />
            ) : pendingOrders.length > 0 ? (
              pendingOrders.filter(p => !activeOrders.find(a => a.id === p.id)).map(order => (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.orderHeader}>
                    <Text style={styles.orderId}>#ORD-{order.id.slice(0, 8).toUpperCase()}</Text>
                    <Text style={styles.earnings}>Rs. {order.total}</Text>
                  </View>
                  <View style={styles.orderDetails}>
                    <Text style={styles.detailText}>🚚 {order.deliveryDistanceKm} km away • {order.items?.length || 0} Items</Text>
                    <Text style={styles.addressText} numberOfLines={1}>📍 {order.address?.streetAddress || 'Local Area'}</Text>
                  </View>
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => handleViewOrder(order.id)}
                    >
                      <Text style={styles.acceptText}>View Details</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No other pending orders right now.</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.offlineBox}>
            <Text style={styles.offlineText}>Go online to start receiving delivery requests within the Baldia Town radius.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 20, backgroundColor: '#1E1E1E', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statusText: { color: '#aaa', marginTop: 5 },
  statsRow: { flexDirection: 'row', padding: 15, backgroundColor: '#1E1E1E' },
  statBox: { flex: 1, backgroundColor: '#2A2A2A', padding: 15, borderRadius: 12, marginHorizontal: 5 },
  statLabel: { color: '#aaa', fontSize: 12, marginBottom: 5 },
  statVal: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  content: { flex: 1, padding: 15 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' },
  orderCard: { backgroundColor: '#fff', borderRadius: 15, padding: 15, marginBottom: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  orderId: { fontSize: 14, fontWeight: 'bold', color: '#666' },
  earnings: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
  orderDetails: { marginBottom: 15 },
  detailText: { color: '#555', marginBottom: 5 },
  addressText: { color: '#7f8c8d' },
  actions: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  acceptBtn: { backgroundColor: '#FF4500', padding: 15, borderRadius: 10, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  offlineBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  offlineText: { textAlign: 'center', color: '#888', fontSize: 16, lineHeight: 24 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 14 },
  activeSection: { marginBottom: 10 },
  activeCard: { borderColor: '#FF450033', borderWidth: 1, backgroundColor: '#FFF5F0' },
  activeBadge: { backgroundColor: '#FF4500', color: '#fff', fontSize: 11, fontWeight: 'bold', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, textTransform: 'uppercase' },
  continueBtn: { height: 45, backgroundColor: '#1A1A1A', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginTop: 5 },
  continueBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#eee' }
});
