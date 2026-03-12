import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';

// Use same base URL as API
const SOCKET_URL = 'http://192.168.100.142:3000';

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const socket = io(SOCKET_URL);

    socket.on('connect', () => {
      console.log('Connected to socket');
      socket.emit('joinOrder', orderId);
    });

    socket.on('orderStatusUpdated', (data) => {
      if (data.orderId === orderId) {
        setStatus(data.status);
      }
    });

    setLoading(false);

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const getStatusColor = () => {
    switch (status) {
      case 'pending': return '#FFA500';
      case 'confirmed': return '#4169E1';
      case 'out_for_delivery': return '#9932CC';
      case 'delivered': return '#228B22';
      case 'cancelled': return '#FF0000';
      default: return '#666';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={styles.backBtn}>← Back to Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Tracking</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.statusCard}>
          <Text style={styles.orderIdText}>Order ID: {orderId}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
            <Text style={styles.statusText}>{status.replace(/_/g, ' ').toUpperCase()}</Text>
          </View>
        </View>

        <View style={styles.timeline}>
          <View style={styles.timelineItem}>
            <View style={[styles.dot, status !== 'cancelled' && styles.activeDot]} />
            <Text style={styles.timelineText}>Order Placed</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.timelineItem}>
            <View style={[styles.dot, ['confirmed', 'out_for_delivery', 'delivered'].includes(status) && styles.activeDot]} />
            <Text style={styles.timelineText}>Order Confirmed</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.timelineItem}>
            <View style={[styles.dot, ['out_for_delivery', 'delivered'].includes(status) && styles.activeDot]} />
            <Text style={styles.timelineText}>Out for Delivery</Text>
          </View>
          <View style={styles.line} />
          <View style={styles.timelineItem}>
            <View style={[styles.dot, status === 'delivered' && styles.activeDot]} />
            <Text style={styles.timelineText}>Delivered</Text>
          </View>
        </View>

        <Text style={styles.infoText}>We will notify you when your order status changes.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#eee', flexDirection: 'row', alignItems: 'center' },
  backBtn: { color: '#FF4500', fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20 },
  content: { flex: 1, padding: 20, alignItems: 'center' },
  statusCard: { width: '100%', padding: 25, backgroundColor: '#f9f9f9', borderRadius: 20, alignItems: 'center', marginBottom: 40 },
  orderIdText: { fontSize: 14, color: '#666', marginBottom: 15 },
  statusBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  statusText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  timeline: { width: '80%', paddingVertical: 20 },
  timelineItem: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ddd' },
  activeDot: { backgroundColor: '#FF4500' },
  timelineText: { marginLeft: 15, fontSize: 16, color: '#333', fontWeight: '500' },
  line: { width: 2, height: 40, backgroundColor: '#eee', marginLeft: 9 },
  infoText: { marginTop: 40, color: '#999', textAlign: 'center' }
});
