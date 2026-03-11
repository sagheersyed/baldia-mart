import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Switch } from 'react-native';

export default function DashboardScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(false);

  // Mock pending orders in the 50km radius zone assigned to this rider
  const pendingOrders = [
    { id: '9004', distance: '1.2 km', earnings: '$2.50', items: 4, address: 'House 12, Street 4, Baldia' },
    { id: '9005', distance: '3.4 km', earnings: '$4.00', items: 12, address: 'Plot 45, Sector B' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.name}>Welcome, Zain</Text>
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
          <Text style={styles.statVal}>$45.50</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Deliveries</Text>
          <Text style={styles.statVal}>12</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Available Orders</Text>
        
        {isOnline ? (
          <ScrollView>
            {pendingOrders.map(order => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <Text style={styles.orderId}>#ORD-{order.id}</Text>
                  <Text style={styles.earnings}>{order.earnings}</Text>
                </View>
                <View style={styles.orderDetails}>
                  <Text style={styles.detailText}>🚚 {order.distance} away • {order.items} Items</Text>
                  <Text style={styles.addressText} numberOfLines={1}>📍 {order.address}</Text>
                </View>
                <View style={styles.actions}>
                  <TouchableOpacity 
                    style={styles.acceptBtn}
                    onPress={() => navigation.navigate('Navigation', { orderId: order.id })}
                  >
                    <Text style={styles.acceptText}>Accept & Navigate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
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
  orderId: { fontSize: 16, fontWeight: 'bold' },
  earnings: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
  orderDetails: { marginBottom: 15 },
  detailText: { color: '#555', marginBottom: 5 },
  addressText: { color: '#7f8c8d' },
  actions: { borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 15 },
  acceptBtn: { backgroundColor: '#FF4500', padding: 15, borderRadius: 10, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  offlineBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  offlineText: { textAlign: 'center', color: '#888', fontSize: 16, lineHeight: 24 }
});
