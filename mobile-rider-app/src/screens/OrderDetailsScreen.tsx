import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi } from '../api/api';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      const res = await ordersApi.getById(orderId);
      setOrder(res.data);
    } catch (e) {
      console.error('Fetch order error:', e);
      Alert.alert('Error', 'Could not load order details.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await ordersApi.acceptOrder(orderId);
      navigation.replace('Navigation', { orderId });
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to accept order');
      navigation.goBack();
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Address</Text>
          <Text style={styles.customerName}>{order.user?.name || 'Customer'}</Text>
          <Text style={styles.address}>📍 {order.address?.streetAddress || 'Local Area'}</Text>
          <Text style={styles.distance}>🚚 {order.deliveryDistanceKm} km distance</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items?.map((item: any, idx: number) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemText}>{item.quantity}x {item.product?.name || 'Product'}</Text>
              <Text style={styles.itemPrice}>Rs. {item.priceAtTime * item.quantity}</Text>
            </View>
          ))}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Bill (COD)</Text>
            <Text style={styles.totalVal}>Rs. {order.total}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>Please verify all products with the merchant before picking up.</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.acceptBtn, accepting && styles.disabledBtn]}
          onPress={handleAccept}
          disabled={accepting}
        >
          {accepting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.acceptBtnText}>Accept Order & Navigate</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#1E1E1E', padding: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { marginRight: 15 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  sectionTitle: { fontSize: 14, color: '#888', fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  customerName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  address: { fontSize: 16, color: '#444', marginBottom: 5 },
  distance: { fontSize: 14, color: '#FF4500', fontWeight: 'bold' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  itemText: { fontSize: 15, color: '#333' },
  itemPrice: { fontSize: 15, color: '#666' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalVal: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
  infoBox: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#f0f0f0', borderRadius: 10 },
  infoText: { flex: 1, marginLeft: 10, color: '#666', fontSize: 13 },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#eee' },
  acceptBtn: { backgroundColor: '#FF4500', padding: 18, borderRadius: 15, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  disabledBtn: { opacity: 0.7 }
});
