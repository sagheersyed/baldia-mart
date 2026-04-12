import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ordersApi, socket } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { generateReceiptPDF, printReceipt } from '../utils/receiptGenerator';

export default function OrderDetailsScreen({ route, navigation }: any) {
  const { orderId } = route.params;
  const { settings } = useSettings();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  useEffect(() => {
    socket.connect();
    const handleUpdate = (data: any) => {
      if (data.orderId === orderId) {
        console.log('OrderDetails: Order updated, refreshing...');
        fetchOrderDetails();
      }
    };
    socket.on('orderUpdated', handleUpdate);
    return () => {
      socket.off('orderUpdated', handleUpdate);
    };
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
        <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'flex-end', gap: 10 }}>
          {order.status !== 'delivered' && order.status !== 'cancelled' && settings?.feature_chat_enabled === true && (
            <TouchableOpacity 
              onPress={() => navigation.navigate('OrderChat', { orderId: order.id, customerName: order.user?.name })} 
              style={styles.chatHeaderBtn}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={22} color="#fff" />
            </TouchableOpacity>
          )}
          {order.status === 'delivered' && (
            <TouchableOpacity onPress={() => generateReceiptPDF(order)} style={styles.receiptHeaderBtn}>
              <Ionicons name="document-text-outline" size={22} color="#FF4500" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.sectionTitle}>Pickup From</Text>
            {order.orderType === 'food' ? (
              <View style={[styles.typeBadge, { backgroundColor: '#FFF5E0' }]}>
                <Text style={{ color: '#FF8C00', fontSize: 10, fontWeight: 'bold' }}>🍽️ FOOD ORDER</Text>
              </View>
            ) : order.orderType === 'rashan' ? (
              <View style={[styles.typeBadge, { backgroundColor: '#FF4500' }]}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>📦 RASHAN BULK</Text>
              </View>
            ) : (
              <View style={[styles.typeBadge, { backgroundColor: '#E8F5E9' }]}>
                <Text style={{ color: '#2E7D32', fontSize: 10, fontWeight: 'bold' }}>🛒 MART ORDER</Text>
              </View>
            )}
          </View>
          {(() => {
            if (order.subOrders?.length > 0) {
              return order.subOrders.map((sub: any, idx: number) => {
                const entity = sub.restaurant || sub.vendor;
                if (!entity) return null;
                return (
                  <View key={sub.id || idx} style={{ marginBottom: order.subOrders.length > 1 ? 15 : 0 }}>
                    <Text style={styles.customerName}>
                      {order.orderType === 'food' ? '👨‍🍳 ' : '🏬 '}
                      {order.subOrders.length > 1 ? `[Stop ${idx + 1}] ` : ''}{entity.name}
                    </Text>
                    <Text style={styles.address}>📍 {entity.location || entity.address || 'Local area'}</Text>
                  </View>
                );
              });
            }
            if (order.restaurant) {
              return (
                <>
                  <Text style={styles.customerName}>👨‍🍳 {order.restaurant.name}</Text>
                  <Text style={styles.address}>📍 {order.restaurant.location}</Text>
                </>
              );
            }
            return (
              <>
                <Text style={styles.customerName}>{order.orderType === 'rashan' ? '📦 Wholesale Market' : '🏬 Baldia Mart'}</Text>
                <Text style={styles.address}>📍 {order.orderType === 'rashan' ? 'Bulk Sourcing Center' : 'Main Colony, Baldia Town'}</Text>
              </>
            );
          })()}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Customer & Delivery</Text>
          <Text style={styles.customerName}>👤 {order.user?.name || 'Customer'}</Text>
          <Text style={styles.address}>📍 {order?.address?.streetAddress || order?.bulkStreetAddress || 'Local Area'}</Text>
          {order.address?.landmark && <Text style={styles.landmark}>🏢 Near: {order.address.landmark}</Text>}
          {order.bulkLandmark && <Text style={styles.landmark}>🏢 Near: {order.bulkLandmark}</Text>}
          {(order.address?.city || order.bulkCity) && <Text style={styles.address}>🌆 {order.address?.city || order.bulkCity}</Text>}
          <Text style={styles.distance}>🚚 {order?.deliveryDistanceKm || '?'} km distance</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          {order.items && (
            <View>
              {Object.entries(
                order.items.filter((i: any) => i.status !== 'missing').reduce((acc: any, item: any) => {
                  const sub = order.subOrders?.find((s: any) => s.id === item.subOrderId);
                  const groupName = sub?.vendor?.name || sub?.restaurant?.name || item.product?.brand?.name || item.menuItem?.restaurant?.name || order.restaurant?.name || 'Baldia Mart';
                  if (!acc[groupName]) acc[groupName] = [];
                  acc[groupName].push(item);
                  return acc;
                }, {})
              ).map(([groupName, items]: [any, any], groupIdx) => (
                <View key={groupIdx} style={{ marginBottom: 15 }}>
                  <Text style={styles.groupHeader}>{groupName}</Text>
                  {items.map((item: any, idx: number) => {
                    const itemName = item.orderType === 'food' || item.menuItem ? item.menuItem?.name : item.product?.name;
                    return (
                      <View key={idx} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemText}>{item.quantity}x {itemName || 'Item'}</Text>
                        </View>
                        <Text style={styles.itemPrice}>Rs. {Number(item.priceAtTime || 0) * item.quantity}</Text>
                      </View>
                    );
                  })}
                </View>
              ))}

              {/* Missing Items Section (Rider Details) */}
              {order.items.some((i: any) => i.status === 'missing') && (
                <View style={{ marginTop: 10, padding: 10, backgroundColor: '#FFF5F5', borderRadius: 10 }}>
                  <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#C53030', marginBottom: 8 }}>⚠️ Reported Missing</Text>
                  {order.items.filter((i: any) => i.status === 'missing').map((item: any, idx: number) => {
                    const itemName = item.orderType === 'food' || item.menuItem ? item.menuItem?.name : item.product?.name;
                    return (
                      <View key={idx} style={[styles.itemRow, { marginBottom: 5 }]}>
                        <Text style={[styles.itemText, { color: '#666', textDecorationLine: 'line-through' }]}>
                          {item.quantity}x {itemName}
                        </Text>
                        <Text style={{ fontSize: 11, color: '#C53030', fontWeight: 'bold' }}>REMOVED</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          )}
          <View style={styles.divider} />
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total Bill (COD)</Text>
            <Text style={styles.totalVal}>Rs. {order?.total || 0}</Text>
          </View>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            {order.orderType === 'food'
              ? "Pickup food carefully. Ensure it's hot and packaged well."
              : "Please verify all products with the merchant before picking up."}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {order.status === 'delivered' ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              style={[styles.acceptBtn, { flex: 1, backgroundColor: '#FF450015', borderWidth: 1, borderColor: '#FF4500' }]}
              onPress={() => generateReceiptPDF(order)}
            >
              <Text style={[styles.acceptBtnText, { color: '#FF4500' }]}>📤 Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.acceptBtn, { flex: 1, backgroundColor: '#1A1A1A' }]}
              onPress={() => printReceipt(order)}
            >
              <Text style={[styles.acceptBtnText, { color: '#fff' }]}>🖨️ View / Print</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { backgroundColor: '#1E1E1E', padding: 20, flexDirection: 'row', alignItems: 'center' },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { flex: 1, padding: 20 },
  section: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  sectionTitle: { fontSize: 14, color: '#888', fontWeight: 'bold', marginBottom: 10, textTransform: 'uppercase' },
  customerName: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  address: { fontSize: 16, color: '#444', marginBottom: 5 },
  landmark: { fontSize: 15, color: '#FF4500', fontWeight: '700', marginBottom: 8, backgroundColor: '#FFF5F0', padding: 8, borderRadius: 8 },
  distance: { fontSize: 14, color: '#FF4500', fontWeight: 'bold' },
  groupHeader: {
    fontSize: 14, fontWeight: 'bold', color: '#B45309',
    backgroundColor: '#FFFBEB', padding: 8, borderRadius: 8,
    marginBottom: 10, marginTop: 5, borderLeftWidth: 3, borderLeftColor: '#F59E0B'
  },
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
  disabledBtn: { opacity: 0.7 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  receiptHeaderBtn: { backgroundColor: '#fff', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  chatHeaderBtn: { backgroundColor: '#FF4500', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
});
