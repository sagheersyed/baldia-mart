import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import { ordersApi } from '../api/api';

// Shared machine IP logic (ideally would be in a config file)
const BASE_IP = '192.168.100.142';
const SOCKET_URL = `http://${BASE_IP}:3000`;

const STATUS_STEPS = [
  { key: 'pending',           label: 'Order Placed',    icon: '📝', description: 'We have received your order' },
  { key: 'confirmed',         label: 'Confirmed',       icon: '✅', description: 'The store has confirmed your order' },
  { key: 'preparing',         label: 'Preparing',       icon: '👨‍🍳', description: 'Your food is being prepared' },
  { key: 'out_for_delivery',  label: 'Out for Delivery',icon: '🚴', description: 'Our rider is on the way' },
  { key: 'delivered',         label: 'Delivered',       icon: '📦', description: 'Enjoy your meal!' },
];

export default function OrderTrackingScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Step 1: Fetch initial status from API
    const fetchInitialStatus = async () => {
      try {
        const res = await ordersApi.getById(orderId);
        setStatus(res.data.status || 'pending');
      } catch (e) {
        console.error('Failed to fetch order status:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchInitialStatus();

    // Step 2: Subscribe to real-time socket updates
    const socket = io(SOCKET_URL);
    socket.on('connect', () => {
      socket.emit('joinOrder', orderId);
    });
    socket.on('orderStatusUpdated', (data) => {
      if (data.orderId === orderId) {
        setStatus(data.status);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const getCurrentStepIndex = () => {
    if (status === 'cancelled') return -1;
    return STATUS_STEPS.findIndex(step => step.key === status);
  };

  const currentStepIndex = getCurrentStepIndex();

  const handleReorder = () => {
    Alert.alert(
      'Reorder',
      'Would you like to place the same order again?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Reorder',
          onPress: async () => {
            try {
              await ordersApi.reorderOrder(orderId);
              Alert.alert('Success! 🎉', 'Your order has been placed again as pending.', [
                { text: 'OK', onPress: () => navigation.navigate('MyOrders') }
              ]);
            } catch (error: any) {
              const msg = error.response?.data?.message || 'Failed to reorder. Please try again.';
              Alert.alert('Error', msg);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backButton}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Track Order</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#FF4500" />
          <Text style={{ marginTop: 12, color: '#999', fontSize: 14 }}>Loading order status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Main')} style={styles.backButton}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Track Order</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {status === 'cancelled' ? (
          <View style={styles.cancelledBanner}>
            <Text style={styles.cancelledIcon}>🛑</Text>
            <Text style={styles.cancelledTitle}>Order Cancelled by You</Text>
            <Text style={styles.cancelledSubtitle}>
              You cancelled this order. If this was a mistake, you can reorder below.
            </Text>
            <TouchableOpacity style={styles.reorderBtn} onPress={handleReorder}>
              <Text style={styles.reorderBtnText}>🔄  Reorder</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.statusCard}>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderIdValue}>#{orderId.slice(-8).toUpperCase()}</Text>
            <View style={styles.mainStatusContainer}>
              <Text style={styles.mainStatusText}>
                {STATUS_STEPS[currentStepIndex]?.label || 'Processing...'}
              </Text>
              <Text style={styles.mainStatusDesc}>
                {STATUS_STEPS[currentStepIndex]?.description}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.timelineContainer}>
          {STATUS_STEPS.map((step, index) => {
            const isCompleted = index < currentStepIndex;
            const isCurrent = index === currentStepIndex;
            const isLast = index === STATUS_STEPS.length - 1;
            const isPassed = status !== 'cancelled' && (isCompleted || isCurrent);

            return (
              <View key={step.key} style={styles.timelineItem}>
                <View style={styles.leftColumn}>
                  <View style={[
                    styles.indicator, 
                    isPassed && styles.passedIndicator,
                    isCurrent && styles.currentIndicator
                  ]}>
                    <Text style={styles.stepIcon}>{step.icon}</Text>
                  </View>
                  {!isLast && <View style={[styles.connector, isCompleted && styles.passedConnector]} />}
                </View>
                <View style={styles.rightColumn}>
                  <Text style={[
                    styles.stepLabel, 
                    isPassed && styles.passedStepLabel,
                    isCurrent && styles.currentStepLabel
                  ]}>
                    {step.label}
                  </Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <TouchableOpacity 
        style={styles.homeBtn} 
        onPress={() => navigation.navigate('Main')}
      >
        <Text style={styles.homeBtnText}>Back to Home</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FB' },
  header: {
    flexDirection: 'row', alignItems: 'center', padding: 20,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
  },
  backButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  backIcon: { fontSize: 20, color: '#333' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1A1A1A', marginLeft: 15 },
  scrollContent: { padding: 20 },
  
  cancelledBanner: {
    backgroundColor: '#FFF5F5', borderRadius: 20, padding: 30,
    alignItems: 'center', borderWidth: 1, borderColor: '#FED7D7', marginBottom: 20,
  },
  cancelledIcon: { fontSize: 40, marginBottom: 10 },
  cancelledTitle: { fontSize: 20, fontWeight: '800', color: '#C53030' },
  cancelledSubtitle: { fontSize: 14, color: '#9B2C2C', textAlign: 'center', marginTop: 8, lineHeight: 20 },
  reorderBtn: {
    marginTop: 20, backgroundColor: '#FF4500', paddingHorizontal: 28, paddingVertical: 12,
    borderRadius: 14, elevation: 3, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3, shadowRadius: 8,
  },
  reorderBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },

  statusCard: {
    backgroundColor: '#FF4500', borderRadius: 24, padding: 25,
    marginBottom: 30, elevation: 8, shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12,
  },
  orderIdLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  orderIdValue: { color: '#fff', fontSize: 18, fontWeight: '800', marginTop: 4 },
  mainStatusContainer: { marginTop: 25 },
  mainStatusText: { color: '#fff', fontSize: 24, fontWeight: '800' },
  mainStatusDesc: { color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 },

  timelineContainer: { paddingHorizontal: 10 },
  timelineItem: { flexDirection: 'row', marginBottom: 5 },
  leftColumn: { alignItems: 'center', width: 50 },
  indicator: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    borderWidth: 2, borderColor: '#E2E8F0', justifyContent: 'center', alignItems: 'center',
    zIndex: 2,
  },
  passedIndicator: { borderColor: '#FF4500' },
  currentIndicator: { backgroundColor: '#FF4500', borderColor: '#FF4500', elevation: 4 },
  stepIcon: { fontSize: 20 },
  connector: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginVertical: -10, zIndex: 1 },
  passedConnector: { backgroundColor: '#FF4500' },
  
  rightColumn: { flex: 1, paddingLeft: 15, paddingBottom: 35, paddingTop: 6 },
  stepLabel: { fontSize: 16, fontWeight: '600', color: '#A0AEC0' },
  passedStepLabel: { color: '#2D3748' },
  currentStepLabel: { color: '#FF4500', fontWeight: '800' },
  stepDescription: { fontSize: 13, color: '#718096', marginTop: 4 },

  homeBtn: {
    margin: 20, backgroundColor: '#1A1A1A', height: 55, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center',
  },
  homeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
