import { useState, useEffect, useMemo, useCallback } from 'react';
import io from 'socket.io-client';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ordersApi, ridersApi, businessReviewsApi, productsApi, menuItemsApi, socket } from '../api/api';
import { ENV } from '../config/env';
import { isBusinessOpen } from '../utils/helpers';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface TrackingStep {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const GET_STATUS_STEPS = (orderType: string = 'mart'): TrackingStep[] => [
  { key: 'pending', label: 'Order Placed', icon: '📝', description: orderType === 'food' ? 'Restaurant has received your order' : 'We have received your order' },
  { key: 'confirmed', label: 'Confirmed', icon: '✅', description: orderType === 'food' ? 'Restaurant has confirmed your order' : 'The store has confirmed your order' },
  { key: 'preparing', label: 'Preparing', icon: orderType === 'food' ? '👨‍🍳' : '📦', description: orderType === 'food' ? 'Your food is being prepared' : 'Your items are being packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery', icon: '🚴', description: 'Our rider is on the way' },
  { key: 'delivered', label: 'Delivered', icon: '🎁', description: orderType === 'food' ? 'Enjoy your meal!' : 'Your package has been delivered' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────
export function useOrderTracking(orderId: string, navigation: any) {
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [rider, setRider] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [localItems, setLocalItems] = useState<any[]>([]);
  const [timeline, setTimeline] = useState<any[]>([]);

  // Rating flow state
  const [showRating, setShowRating] = useState(false);
  const [ratingStep, setRatingStep] = useState(1);
  const [businessesToRate, setBusinessesToRate] = useState<any[]>([]);
  const [currentBusinessIndex, setCurrentBusinessIndex] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [businessRating, setBusinessRating] = useState(5);
  const [businessComment, setBusinessComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // Add-product state
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [addingProductId, setAddingProductId] = useState<string | null>(null);

  // ── Fetch helpers ────────────────────────────────────────────────────────
  const fetchProductsList = useCallback(async (currentOrder: any) => {
    try {
      if (currentOrder?.orderType === 'food' && currentOrder?.restaurantId) {
        const res = await menuItemsApi.getByRestaurant(currentOrder.restaurantId);
        setAllProducts(res.data);
      } else {
        const res = await productsApi.getAll();
        setAllProducts(res.data);
      }
    } catch (e) {
      console.error('Failed to fetch products for adding:', e);
    }
  }, []);

  const fetchOrderDetails = useCallback(async () => {
    try {
      const [orderRes, timelineRes] = await Promise.all([
        ordersApi.getById(orderId),
        ordersApi.getTimeline(orderId),
      ]);
      const data = orderRes.data;
      setOrder(data);
      setLocalItems(data.items || []);
      setTimeline(timelineRes.data);
      setStatus(data.status || 'pending');
      if (data.rider) setRider(data.rider);

      await fetchProductsList(data);

      // Trigger rating modal for delivered orders
      if (data.status === 'delivered') {
        const dismissed = await AsyncStorage.getItem(`ratingDismissed_${orderId}`);
        if (!dismissed && (!data.isRated || !data.isBusinessRated)) {
          const toRate: any[] = [];
          if (data.orderType === 'food' && data.subOrders?.length > 0) {
            data.subOrders.forEach((so: any) => {
              toRate.push({ id: so.restaurantId, name: so.restaurant?.name || 'Restaurant', type: 'restaurant', subOrderId: so.id });
            });
          } else if (data.restaurantId) {
            toRate.push({ id: data.restaurantId, name: data.restaurant?.name || 'Restaurant', type: 'restaurant' });
          } else if (data.brandId) {
            toRate.push({ id: data.brandId, name: data.brand?.name || 'Brand', type: 'brand' });
          }
          setBusinessesToRate(toRate);
          setShowRating(true);
        }
      }
    } catch (e) {
      console.error('Failed to fetch order details:', e);
    } finally {
      setLoading(false);
    }
  }, [orderId, fetchProductsList]);

  // ── Socket + initial fetch ────────────────────────────────────────────────
  useEffect(() => {
    fetchOrderDetails();

    // Use centralized socket
    if (!socket.connected) socket.connect();
    
    socket.emit('joinOrder', orderId);

    const onStatusUpdate = async (data: any) => {
      if (data.orderId === orderId) { setStatus(data.status); await fetchOrderDetails(); }
    };

    const onOrderUpdate = async (data: any) => {
      if (data.orderId === orderId) await fetchOrderDetails();
    };

    const onRiderLocation = (data: any) => {
      if (data.orderId === orderId && data.latitude && data.longitude) {
        setRiderLocation({ latitude: Number(data.latitude), longitude: Number(data.longitude) });
      }
    };

    socket.on('orderStatusUpdated', onStatusUpdate);
    socket.on('orderUpdated', onOrderUpdate);
    socket.on('riderLocationUpdate', onRiderLocation);

    return () => {
      socket.off('orderStatusUpdated', onStatusUpdate);
      socket.off('orderUpdated', onOrderUpdate);
      socket.off('riderLocationUpdate', onRiderLocation);
    };
  }, [orderId, fetchOrderDetails]);

  // ── Derived values ────────────────────────────────────────────────────────
  const steps = useMemo(() => GET_STATUS_STEPS(order?.orderType), [order?.orderType]);
  const currentStepIndex = status === 'cancelled' ? -1 : steps.findIndex(s => s.key === status);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return allProducts;
    return allProducts.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [searchQuery, allProducts]);

  const hasChanges = useCallback(() => {
    if (!order?.items) return false;
    return JSON.stringify(localItems.map(i => ({ id: i.id, q: i.quantity }))) !==
      JSON.stringify(order.items.map((i: any) => ({ id: i.id, q: i.quantity })));
  }, [localItems, order]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReorder = async () => {
    await ordersApi.reorderOrder(orderId);
    navigation.navigate('MyOrders');
  };

  const handleUpdateQuantityLocal = (itemId: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    const item = localItems.find(i => i.id === itemId);
    if (item && newQuantity > item.quantity) {
      if (item.product?.maxQuantityPerOrder > 0 && newQuantity > item.product.maxQuantityPerOrder) {
        Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${item.product.maxQuantityPerOrder} units for ${item.product.name}.`);
        return;
      }
      if (newQuantity > (item.product?.stockQuantity || 0)) {
        Alert.alert('Out of Stock', 'Sorry, no more stock available for this product.');
        return;
      }
    }
    setLocalItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: newQuantity } : i));
  };

  const handleConfirmBatchUpdates = async () => {
    setLoading(true);
    try {
      const updates = localItems.map(item => ({ itemId: item.id, quantity: item.quantity }));
      const res = await ordersApi.updateOrderItems(orderId, updates);
      if (res.data?.deleted) {
        navigation.navigate('MyOrders');
      } else {
        setOrder(res.data);
        setLocalItems(res.data.items || []);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const res = await ordersApi.removeItem(orderId, itemId);
    if (res.data?.deleted) navigation.navigate('MyOrders');
    else fetchOrderDetails();
  };

  const handleAddNewProductToOrder = async (productId: string) => {
    setAddingProductId(productId);
    try {
      await ordersApi.addItem(orderId, productId, 1);
      await fetchOrderDetails();
      setShowAddProduct(false);
    } finally {
      setAddingProductId(null);
    }
  };

  const handleDismissRating = async () => {
    await AsyncStorage.setItem(`ratingDismissed_${orderId}`, 'true');
    setShowRating(false);
  };

  const handleSubmitReview = async () => {
    setSubmittingReview(true);
    try {
      if (ratingStep === 1) {
        if (rider) await ridersApi.postReview(rider.id, { rating, comment, orderId });
        if (businessesToRate.length > 0) { setRatingStep(2); setCurrentBusinessIndex(0); }
        else { await AsyncStorage.setItem(`ratingDismissed_${orderId}`, 'true'); setShowRating(false); }
      } else {
        const currentBiz = businessesToRate[currentBusinessIndex];
        if (currentBiz) {
          await businessReviewsApi.create({ orderId, subOrderId: currentBiz.subOrderId, businessId: currentBiz.id, businessType: currentBiz.type, rating: businessRating, comment: businessComment });
        }
        if (currentBusinessIndex < businessesToRate.length - 1) {
          setCurrentBusinessIndex(prev => prev + 1);
          setBusinessRating(5);
          setBusinessComment('');
        } else {
          await AsyncStorage.setItem(`ratingDismissed_${orderId}`, 'true');
          setShowRating(false);
        }
      }
    } finally {
      setSubmittingReview(false);
    }
  };

  return {
    // State
    order, status, loading, rider, riderLocation, localItems, timeline,
    // Rating
    showRating, ratingStep, businessesToRate, currentBusinessIndex,
    rating, setRating, comment, setComment,
    businessRating, setBusinessRating, businessComment, setBusinessComment,
    submittingReview,
    // Add product
    showAddProduct, setShowAddProduct, filteredProducts, searchQuery, setSearchQuery, addingProductId,
    // Derived
    steps, currentStepIndex,
    // Handlers
    fetchOrderDetails, hasChanges,
    handleReorder, handleUpdateQuantityLocal, handleConfirmBatchUpdates, handleRemoveItem,
    handleAddNewProductToOrder, handleDismissRating, handleSubmitReview,
  };
}
