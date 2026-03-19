import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Modal, TextInput, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import io from 'socket.io-client';
import { ordersApi, productsApi } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [rider, setRider] = useState<any>(null);
  const [order, setOrder] = useState<any>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [showRating, setShowRating] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Add Products Feature state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  const fetchOrderDetails = async () => {
    try {
      const [orderRes, timelineRes] = await Promise.all([
        ordersApi.getById(orderId),
        ordersApi.getTimeline(orderId)
      ]);
      setOrder(orderRes.data);
      setLocalItems(orderRes.data.items || []);
      setTimeline(timelineRes.data);
      setStatus(orderRes.data.status || 'pending');
      if (orderRes.data.rider) {
        setRider(orderRes.data.rider);
      }

      if (orderRes.data.status === 'delivered' && !orderRes.data.isRated) {
        const dismissed = await AsyncStorage.getItem(`ratingDismissed_${orderId}`);
        if (!dismissed) {
          setShowRating(true);
        }
      }
    } catch (e) {
      console.error('Failed to fetch order details:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchProductsList = async () => {
    try {
      const res = await productsApi.getAll();
      setAllProducts(res.data);
    } catch (e) {
      console.error('Failed to fetch products for adding:', e);
    }
  };

  useEffect(() => {
    fetchOrderDetails();
    fetchProductsList();

    const socket = io(SOCKET_URL, {
      transports: ['websocket'],
      forceNew: true
    });

    socket.on('connect', () => {
      console.log('User App: Connected to socket');
      socket.emit('joinOrder', orderId);
    });

    socket.on('connect_error', (err) => {
      console.error('User App: Socket connection error:', err);
    });

    socket.on('orderStatusUpdated', async (data) => {
      console.log('User App: Received status update:', data);
      if (data.orderId === orderId) {
        setStatus(data.status);
        await fetchOrderDetails();
      }
    });

    return () => {
      console.log('User App: Disconnecting socket');
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

  const handleRemoveItem = (itemId: string, itemName: string) => {
    Alert.alert(
      'Remove Item',
      `Are you sure you want to remove ${itemName} from your order?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await ordersApi.removeItem(orderId, itemId);
              if (res.data?.deleted) {
                Alert.alert('Order Cancelled', 'All items were removed, so the order has been cancelled.', [
                  { text: 'OK', onPress: () => navigation.navigate('MyOrders') }
                ]);
              } else {
                fetchOrderDetails();
              }
            } catch (err: any) {
              // Only alert if we didn't just delete the order (which might cause a background 404 in fetch)
              const msg = err.response?.data?.message || 'Failed to remove item.';
              Alert.alert('Error', msg);
            }
          }
        }
      ]
    );
  };

  const handleUpdateQuantityLocal = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    setLocalItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    ));
  };

  const hasChanges = () => {
    if (!order || !order.items) return false;
    return JSON.stringify(localItems.map(i => ({ id: i.id, q: i.quantity }))) !== 
           JSON.stringify(order.items.map(i => ({ id: i.id, q: i.quantity })));
  };

  const handleConfirmBatchUpdates = async () => {
    try {
      setLoading(true);
      const updates = localItems.map(item => ({
        itemId: item.id,
        quantity: item.quantity
      }));
      const res = await ordersApi.updateOrderItems(orderId, updates);
      
      if (res.data?.deleted) {
        Alert.alert('Order Cancelled', 'All items were removed, so the order has been cancelled.', [
          { text: 'OK', onPress: () => navigation.navigate('MyOrders') }
        ]);
      } else {
        setOrder(res.data);
        setLocalItems(res.data.items || []);
        Alert.alert('Success', 'Order updated successfully!');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update order. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewProductToOrder = async (productId: string) => {
    try {
      setAddingProductId(productId);
      await ordersApi.addItem(orderId, productId, 1);
      Alert.alert('Success', 'Product added to your order!');
      await fetchOrderDetails();
      setShowAddProduct(false); // OPTIONAL: keep open if they want to add multiple? Closing for now.
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to add product.';
      Alert.alert('Error', msg);
    } finally {
      setAddingProductId(null);
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return allProducts;
    return allProducts.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, allProducts]);

  const handleDismissRating = async () => {
    try {
      await AsyncStorage.setItem(`ratingDismissed_${orderId}`, 'true');
      setShowRating(false);
    } catch (e) {
      console.error('Failed to dismiss rating:', e);
    }
  };

  const handleSubmitReview = async () => {
    if (!rider) return;
    setSubmittingReview(true);
    try {
      const { ridersApi } = require('../api/api');
      await ridersApi.postReview(rider.id, {
        rating,
        comment,
        orderId
      });
      // Mark as dismissed locally as well to prevent re-show before server sync if any
      await AsyncStorage.setItem(`ratingDismissed_${orderId}`, 'true');
      setShowRating(false);
      Alert.alert('Thank You!', 'Your feedback helps us improve our service.');
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to submit review.';
      Alert.alert('Error', msg);
    } finally {
      setSubmittingReview(false);
    }
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
        
        {rider && (
          <View style={styles.riderCard}>
            <View style={styles.riderInfo}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>{rider.name?.[0] || 'R'}</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.riderName}>{rider.name || 'Your Rider'}</Text>
                <Text style={styles.riderStatus}>Assign to your delivery</Text>
              </View>
              <TouchableOpacity 
                style={styles.callBtn} 
                onPress={() => {
                  const { Linking } = require('react-native');
                  Linking.openURL(`tel:${rider.phoneNumber}`);
                }}
              >
                <Text style={styles.callIcon}>📞</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {order && order.items && order.items.length > 0 && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            {localItems.map((item: any) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>
                    {item.product?.name || 'Item'}
                  </Text>
                  <Text style={styles.itemPrice}>Rs. {item.priceAtTime} x {item.quantity}</Text>
                </View>
                {status === 'pending' || status === 'confirmed' ? (
                  <View style={styles.quantityControls}>
                    <TouchableOpacity 
                      style={styles.qtyBtn}
                      onPress={() => handleUpdateQuantityLocal(item.id, item.quantity - 1)}
                    >
                      <Text style={styles.qtyBtnText}>-</Text>
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity 
                      style={styles.qtyBtn}
                      onPress={() => handleUpdateQuantityLocal(item.id, item.quantity + 1)}
                    >
                      <Text style={styles.qtyBtnText}>+</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.itemName}>{item.quantity}x</Text>
                )}
              </View>
            ))}
            
            {(status === 'pending' || status === 'confirmed') && (
              <View style={styles.summaryActionsRow}>
                {hasChanges() && (
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.confirmBtn]} 
                    onPress={handleConfirmBatchUpdates}
                  >
                    <Text style={styles.confirmBtnText}>Confirm Changes</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[styles.actionBtn, styles.addBtn, !hasChanges() && { flex: 1 }]} 
                  onPress={() => setShowAddProduct(true)}
                >
                  <Text style={styles.addBtnText}>+ Add Product</Text>
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.summaryDivider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalText}>Rs. {Number(order.total).toFixed(0)}</Text>
            </View>
          </View>
        )}

        <View style={styles.timelineContainer}>
          {STATUS_STEPS.map((step, index) => {
            const historyItem = timeline.find(h => h.status === step.key);
            const isCompleted = !!historyItem;
            const isCurrent = index === currentStepIndex;
            const isLast = index === STATUS_STEPS.length - 1;
            const isPassed = isCompleted || isCurrent;

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
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[
                      styles.stepLabel, 
                      isPassed && styles.passedStepLabel,
                      isCurrent && styles.currentStepLabel
                    ]}>
                      {step.label}
                    </Text>
                    {historyItem && (
                      <Text style={styles.timeLabel}>
                        {new Date(historyItem.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Rating Modal */}
        <Modal visible={showRating} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.ratingBox}>
              <Text style={styles.ratingTitle}>Rate your Rider</Text>
              <Text style={styles.ratingSubtitle}>How was your delivery experience with {rider?.name}?</Text>
              
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map(s => (
                  <TouchableOpacity key={s} onPress={() => setRating(s)}>
                    <Text style={[styles.star, rating >= s && styles.activeStar]}>★</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TextInput 
                style={styles.commentInput}
                placeholder="Share your feedback..."
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
                value={comment}
                onChangeText={setComment}
              />

              <TouchableOpacity 
                style={[styles.submitRatingBtn, submittingReview && { opacity: 0.7 }]} 
                onPress={handleSubmitReview}
                disabled={submittingReview}
              >
                {submittingReview ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitRatingText}>Submit Review</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.closeRatingBtn} onPress={handleDismissRating}>
                <Text style={styles.closeRatingText}>Maybe later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Add Product Modal */}
        <Modal visible={showAddProduct} transparent animationType="slide">
          <View style={styles.addProductOverlay}>
            <SafeAreaView style={styles.addProductCardWrapper}>
              <View style={styles.addProductCard}>
                <View style={styles.addProductHeader}>
                  <Text style={styles.addProductTitle}>Add Items to Order</Text>
                  <TouchableOpacity style={styles.addProductCloseBtn} onPress={() => setShowAddProduct(false)}>
                    <Text style={styles.addProductCloseText}>✕</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchBox}>
                  <Text style={styles.searchIcon}>🔍</Text>
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search fresh products..."
                    placeholderTextColor="#999"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>

                <FlatList
                  data={filteredProducts}
                  keyExtractor={item => item.id}
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{ paddingBottom: 20 }}
                  ListEmptyComponent={() => (
                    <Text style={{ textAlign: 'center', marginTop: 30, color: '#999' }}>No products found!</Text>
                  )}
                  renderItem={({ item }) => {
                    const price = Number(item.price) - Number(item.discount || 0);
                    return (
                      <View style={styles.addProductRow}>
                        <View style={styles.addProdPic}>
                          {item.imageUrl ? (
                            <Image source={{ uri: item.imageUrl }} style={styles.addProdImg} />
                          ) : (
                            <Text>📦</Text>
                          )}
                        </View>
                        <View style={styles.addProdInfo}>
                          <Text style={styles.addProdName}>{item.name}</Text>
                          <Text style={styles.addProdPrice}>Rs. {price.toFixed(0)}</Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.addBtnSmall, item.stockQuantity < 1 && { opacity: 0.5 }]}
                          disabled={item.stockQuantity < 1 || addingProductId === item.id}
                          onPress={() => handleAddNewProductToOrder(item.id)}
                        >
                          {addingProductId === item.id ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.addBtnSmallText}>{item.stockQuantity > 0 ? '+ Add' : 'Out'}</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  }}
                />
              </View>
            </SafeAreaView>
          </View>
        </Modal>
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
  
  riderCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  riderInfo: { flexDirection: 'row', alignItems: 'center' },
  riderAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF450015', justifyContent: 'center', alignItems: 'center' },
  riderAvatarText: { color: '#FF4500', fontSize: 20, fontWeight: '800' },
  riderName: { fontSize: 16, fontWeight: '700', color: '#2D3748' },
  riderStatus: { fontSize: 13, color: '#A0AEC0', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#EDF2F7', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 18 },

  summaryCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: 20,
    marginBottom: 25, shadowColor: '#000', shadowOpacity: 0.05,
    shadowRadius: 10, elevation: 2,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  summaryTitle: { fontSize: 16, fontWeight: '700', color: '#2D3748', marginBottom: 15 },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, color: '#2D3748', fontWeight: '500' },
  itemPrice: { fontSize: 12, color: '#718096', marginTop: 2 },
  removeItemBtn: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF5F5', justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  removeIcon: { color: '#E53E3E', fontSize: 10, fontWeight: 'bold' },
  summaryDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 12 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 14, fontWeight: '600', color: '#718096' },
  totalText: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  
  quantityControls: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7FAFC', borderRadius: 10, padding: 4 },
  qtyBtn: { width: 32, height: 32, backgroundColor: '#fff', borderRadius: 8, justifyContent: 'center', alignItems: 'center', elevation: 1, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 2 },
  qtyBtnText: { fontSize: 18, fontWeight: 'bold', color: '#FF4500' },
  qtyText: { marginHorizontal: 12, fontSize: 15, fontWeight: '700', color: '#2D3748' },

  timeLabel: { fontSize: 11, color: '#A0AEC0', fontWeight: '500' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 25 },
  ratingBox: { backgroundColor: '#fff', borderRadius: 28, padding: 30, alignItems: 'center' },
  ratingTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A1A' },
  ratingSubtitle: { fontSize: 14, color: '#718096', textAlign: 'center', marginTop: 8, marginBottom: 25 },
  starsRow: { flexDirection: 'row', marginBottom: 25 },
  star: { fontSize: 40, color: '#E2E8F0', marginHorizontal: 6 },
  activeStar: { color: '#FFD700' },
  commentInput: { width: '100%', backgroundColor: '#F7FAFC', borderRadius: 16, padding: 15, color: '#2D3748', fontSize: 15, height: 100, textAlignVertical: 'top', marginBottom: 25 },
  submitRatingBtn: { width: '100%', height: 55, backgroundColor: '#FF4500', borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  submitRatingText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeRatingBtn: { marginTop: 15, padding: 10 },
  closeRatingText: { color: '#718096', fontWeight: '600', fontSize: 14 },
  confirmUpdatesBtn: {
    marginTop: 15,
    backgroundColor: '#FF450015',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF450030',
  },
  confirmUpdatesBtnText: { color: '#FF4500', fontWeight: '700', fontSize: 14 },
  
  summaryActionsRow: { flexDirection: 'row', gap: 10, marginTop: 15 },
  actionBtn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBtn: { backgroundColor: '#FF450015', borderWidth: 1, borderColor: '#FF450030' },
  addBtn: { backgroundColor: '#F0FDF4', borderWidth: 1, borderColor: '#BBF7D0' },
  confirmBtnText: { color: '#FF4500', fontWeight: '700', fontSize: 13 },
  addBtnText: { color: '#16A34A', fontWeight: '700', fontSize: 13 },

  addProductOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  addProductCardWrapper: { flex: 1, justifyContent: 'flex-end' },
  addProductCard: { backgroundColor: '#fff', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: '80%', padding: 20 },
  addProductHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  addProductTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A1A' },
  addProductCloseBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  addProductCloseText: { fontSize: 16, color: '#666', fontWeight: 'bold' },
  
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', borderRadius: 16, paddingHorizontal: 15, marginBottom: 20 },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchInput: { flex: 1, height: 50, fontSize: 16, color: '#1A1A1A', fontWeight: '500' },
  
  addProductRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  addProdPic: { width: 50, height: 50, borderRadius: 12, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  addProdImg: { width: '100%', height: '100%' },
  addProdInfo: { flex: 1, marginLeft: 15 },
  addProdName: { fontSize: 16, fontWeight: '600', color: '#2D3748', marginBottom: 4 },
  addProdPrice: { fontSize: 14, fontWeight: '800', color: '#FF4500' },
  addBtnSmall: { backgroundColor: '#FF4500', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, minWidth: 70, alignItems: 'center' },
  addBtnSmallText: { color: '#fff', fontWeight: '700', fontSize: 13 },

});
