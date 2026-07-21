import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Linking, Platform, Vibration,
  Animated, PanResponder, Dimensions, FlatList, Modal, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ordersApi, socket } from '../api/api';
import { useSettings } from '../context/SettingsContext';
import { generateReceiptPDF, printReceipt } from '../utils/receiptGenerator';

const { width: SCREEN_W } = Dimensions.get('window');
const DEFAULT_MART = { latitude: 24.91522600, longitude: 66.96431980 };
const SUCCESS = '#10B981';

const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};



// ─── Swipe-to-Confirm Slider ──────────────────────────────────────────────────
function SwipeToConfirm({ onConfirm, label }: { onConfirm: () => void; label: string }) {
  const swipeX = useRef(new Animated.Value(0)).current;
  const TRACK_W = SCREEN_W - 48;
  const THUMB_W = 60;
  const MAX = TRACK_W - THUMB_W - 8;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => swipeX.setValue(Math.max(0, Math.min(g.dx, MAX))),
    onPanResponderRelease: (_, g) => {
      if (g.dx >= MAX * 0.72) {
        Animated.timing(swipeX, { toValue: MAX, duration: 100, useNativeDriver: false }).start(() => {
          onConfirm();
          swipeX.setValue(0);
        });
      } else {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
      }
    },
  })).current;

  const textOpacity = swipeX.interpolate({ inputRange: [0, MAX * 0.4], outputRange: [1, 0] });

  return (
    <View style={sw.track}>
      <Animated.Text style={[sw.label, { opacity: textOpacity }]}>{label}</Animated.Text>
      <Animated.View style={[sw.thumb, { transform: [{ translateX: swipeX }] }]} {...panResponder.panHandlers}>
        <Text style={sw.thumbTxt}>✓</Text>
      </Animated.View>
    </View>
  );
}

const sw = StyleSheet.create({
  track: {
    height: 58, backgroundColor: '#FF4500', borderRadius: 29, marginVertical: 8,
    paddingHorizontal: 4, justifyContent: 'center',
  },
  label: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 15, fontWeight: '700' },
  thumb: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  thumbTxt: { fontSize: 22, color: '#FF4500', fontWeight: '900' },
});

// ─── Stop Indicator Pin ───────────────────────────────────────────────────────
function StopPin({ number, emoji }: { number: number; emoji: string }) {
  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '900' }}>{number}</Text>
      </View>
      <Text style={{ fontSize: 16 }}>{emoji}</Text>
    </View>
  );
}

// ─── Status label map ─────────────────────────────────────────────────────────
const getStatusLabel = (status: string, orderType: string, paymentMethod: string) => {
  const isFood = orderType === 'food';
  const isPharma = orderType === 'pharma';
  const isCOD = paymentMethod === 'cod';

  if (isPharma) {
    const pharmaLabels: Record<string, string> = {
      confirmed: 'Swipe — Arrived at Pharmacy',
      preparing: 'Swipe — Awaiting Packing',
      assigned_to_rider: 'Swipe — Awaiting Packing',
      ready_for_pickup: 'Swipe — Pick Up Medicines',
      picked_up: 'Swipe — Start Delivery Route',
      in_transit: 'Swipe — Arrived at Customer',
      out_for_delivery: isCOD ? 'Swipe — Collect Cash & Deliver' : 'Swipe — Mark as Delivered',
      delivered: '✅  Order Delivered',
    };
    return pharmaLabels[status] || 'Swipe to Update';
  }

  const labels: Record<string, string> = {
    confirmed: isFood ? 'Swipe — Arrived at Restaurant' : 'Swipe — Arrived at Mart',
    preparing: isFood ? 'Swipe — Food Ready, Pick Up' : 'Swipe — Order Packed, Pick Up',
    out_for_delivery: isCOD ? 'Swipe — Collect Cash & Deliver' : 'Swipe — Mark as Delivered',
    delivered: '✅  Order Delivered',
  };
  return labels[status] || 'Swipe to Update';
};

// ─── Main Routing/Navigation Screen ──────────────────────────────────────────
export default function NavigationScreen({ navigation, route }: any) {
  const { orderId } = route.params || {};
  const { settings } = useSettings();
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('confirmed');
  const [loading, setLoading] = useState(true);
  const [riderLoc, setRiderLoc] = useState<any>(null);
  const [isLocationBlocked, setIsLocationBlocked] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState(true);
  const [cashFlowInfo, setCashFlowInfo] = useState<any>(null);

  // Guard: prevents double-navigation when rider self-releases order
  // (submitReason navigates away AND backend emits 'pending' status via socket)
  const isNavigatingAway = useRef(false);

  // Reason Modal State
  const [reasonModalVisible, setReasonModalVisible] = useState(false);
  const [reasonText, setReasonText] = useState('');
  const [reasonType, setReasonType] = useState<'missing' | 'release'>('missing');
  const [pendingItem, setPendingItem] = useState<{ id: string; name: string } | null>(null);

  const mapRef = useRef<MapView>(null);

  // ── Derived logic (Must be before useEffect/Handlers) ───────────────
  const isFood = order?.orderType === 'food';
  const pickupStops: any[] = [];

  if (order) {
    if (order.subOrders?.length > 0) {
      // Handle both Food (Restaurants), Mart (Vendors), and Pharma (Pharmacies) sub-orders
      order.subOrders.forEach((sub: any, i: number) => {
        const entity = sub.restaurant || sub.vendor || sub.pharmacy;
        if (entity?.latitude || entity?.lat) {
          pickupStops.push({
            id: sub.id,
            stopNum: i + 1,
            name: entity.name,
            description: entity.location || entity.address || (isFood ? 'Restaurant' : sub.pharmacy ? 'Pharmacy' : 'Shop'),
            coords: {
              latitude: Number(entity.latitude || entity.lat || 0),
              longitude: Number(entity.longitude || entity.lng || 0)
            },
            subOrderId: sub.id,
            subStatus: sub.status,
            emoji: sub.pharmacy ? '🏥' : isFood ? '🍽️' : '🏪',
          });
        }
      });
    } else if (isFood && order.restaurant?.latitude) {
      pickupStops.push({
        id: order.restaurant.id, stopNum: 1, name: order.restaurant.name,
        description: order.restaurant.location,
        coords: { latitude: Number(order.restaurant.latitude || 0), longitude: Number(order.restaurant.longitude || 0) },
        emoji: '🍽️',
      });
    } else if (order.orderType === 'pharma' && order.pharmacy) {
      pickupStops.push({
        id: order.pharmacy.id, stopNum: 1, name: order.pharmacy.name,
        description: order.pharmacy.location || order.pharmacy.address || 'Pharmacy',
        coords: {
          latitude: Number(order.pharmacy.latitude || 0),
          longitude: Number(order.pharmacy.longitude || 0)
        },
        emoji: '🏥',
      });
    } else {
      pickupStops.push({
        id: 'mart',
        stopNum: 1,
        name: order.orderType === 'rashan' ? 'Wholesale Market / Warehouse' : 'Baldia Mart',
        description: order.orderType === 'rashan' ? 'Monthly Bulk Sourcing Point' : 'Main Colony, Baldia Town',
        coords: DEFAULT_MART,
        emoji: order.orderType === 'rashan' ? '📦' : '🏪',
      });
    }
  }

  const customerCoords = {
    latitude: Number(order?.address?.latitude || order?.addressLat || 24.9144),
    longitude: Number(order?.address?.longitude || order?.addressLng || 66.9748),
  };

  const isPickupPhase = status === 'confirmed' || status === 'preparing';
  const focusCoords = isPickupPhase ? (pickupStops[0]?.coords || DEFAULT_MART) : customerCoords;
  const mapRegion = { ...focusCoords, latitudeDelta: 0.04, longitudeDelta: 0.04 };

  const routeCoords = [
    ...(riderLoc ? [{ latitude: riderLoc.latitude, longitude: riderLoc.longitude }] : []),
    ...pickupStops.map(s => s.coords),
    customerCoords,
  ];

  const dropoffStopNum = pickupStops.length + 1;
  const statusLabel = getStatusLabel(status, order?.orderType || 'mart', order?.paymentMethod || 'online');

  // ── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // 1. Fetch Order Data First (Crucial for UI)
        const orderRes = await ordersApi.getById(orderId);
        if (orderRes.data) {
          setOrder(orderRes.data);
          setStatus(orderRes.data.status);
          if (orderId) await AsyncStorage.setItem('activeOrderId', orderId);

          if (orderRes.data.status === 'cancelled') {
            Alert.alert('Order Cancelled', 'This order is no longer active.');
            navigation.replace('Main');
            return;
          }
        }

        try {
          const cashFlowRes = await ordersApi.getCashFlowInfo(orderId);
          if (cashFlowRes.data) setCashFlowInfo(cashFlowRes.data);
        } catch (_) { /* non-critical */ }

        // 2. Location Handling (Non-blocking init)
        const { status: locPerm } = await Location.requestForegroundPermissionsAsync();
        if (locPerm !== 'granted') {
          setIsLocationBlocked(true);
          Alert.alert('Permission Denied', 'Location permission is required for navigation.');
        } else {
          const servicesEnabled = await Location.hasServicesEnabledAsync();
          if (!servicesEnabled) {
            setIsLocationBlocked(true);
          } else {
            // Background location fetch
            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
              .then(loc => setRiderLoc(loc.coords))
              .catch(() => { });

            Location.watchPositionAsync(
              { accuracy: Location.Accuracy.High, distanceInterval: 10 },
              (l) => {
                setRiderLoc(l.coords);
                setIsLocationBlocked(false); // Unblock once location is active
              }
            );
          }
        }
      } catch (e: any) {
        console.error('NavigationScreen init error:', e);
        const msg = e.response?.data?.message || e.message || 'Failed to load navigation data.';
        if (e.response?.status === 401 || e.response?.status === 403) {
          await AsyncStorage.removeItem('activeOrderId');
          Alert.alert(
            e.response?.status === 403 ? 'Access Denied' : 'Session Expired',
            msg,
            [{ text: 'OK', onPress: () => navigation.replace('Main') }],
          );
          return;
        }
        Alert.alert('Error', msg);
      } finally {
        setLoading(false);
      }
    };
    init();

    const join = () => {
      socket.emit('joinOrder', orderId);
    };
    if (socket.connected) join();
    else socket.once('connect', join);

    const onStatusUpdate = (data: any) => {
      try {
        // Guard: if rider already self-navigated (e.g., via submitReason),
        // ignore any incoming socket events to prevent double-navigation/stale alerts
        if (isNavigatingAway.current) return;
        if (!data) return;
        const targetId = data.orderId || (typeof data === 'string' ? data : null);
        const newStatus = data.status || (typeof data === 'string' ? data : null);

        if (targetId === orderId) {
          if (newStatus === 'cancelled') {
            Vibration.vibrate([100, 500]);
            AsyncStorage.removeItem('activeOrderId')
              .then(() => {
                isNavigatingAway.current = true;
                Alert.alert('Order Cancelled 🛑', 'The customer has cancelled this order.', [
                  { text: 'Okay', onPress: () => navigation.replace('Main') },
                ]);
              })
              .catch(e => console.error(e));
          } else if (newStatus === 'pending') {
            // Order was released by ADMIN (not by this rider via submitReason)
            Vibration.vibrate(500);
            AsyncStorage.removeItem('activeOrderId')
              .then(() => {
                isNavigatingAway.current = true;
                Alert.alert('Order Released 🔓', 'This order has been released by admin.', [
                  { text: 'Okay', onPress: () => navigation.replace('Main') },
                ]);
              })
              .catch(e => console.error(e));
          }
        }
      } catch (err) { console.error('onStatusUpdate error', err); }
    };

    const onUpdated = (data: any) => {
      try {
        if (data?.orderId === orderId) refreshOrder();
      } catch (err) { console.error('onUpdated error', err); }
    };

    socket.on('orderStatusUpdated', onStatusUpdate);
    socket.on('orderUpdated', onUpdated);
    return () => {
      socket.off('connect', join);
      socket.off('orderStatusUpdated', onStatusUpdate);
      socket.off('orderUpdated', onUpdated);
    };
  }, [orderId]);

  const refreshOrder = useCallback(async () => {
    try {
      const [orderRes, cashFlowRes] = await Promise.all([
        ordersApi.getById(orderId),
        ordersApi.getCashFlowInfo(orderId).catch(() => null),
      ]);
      if (orderRes.data) {
        setOrder(orderRes.data);
        setStatus(orderRes.data.status);
      }
      if (cashFlowRes?.data) setCashFlowInfo(cashFlowRes.data);
    } catch (e) { console.warn('Refresh order failed', e); }
  }, [orderId]);

  // Zoom to fit all markers
  useEffect(() => {
    if (!loading && mapRef.current && routeCoords.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(routeCoords, {
          edgePadding: { top: 150, right: 50, bottom: 400, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [loading, riderLoc, order]);

  // ── Status progression ──────────────────────────────────────────────
  const handleSwipeConfirm = async () => {
    if (updatingStatus || status === 'delivered') return;

    // --- GEO-FENCING CHECKS ---
    if (riderLoc) {
      const { latitude: rLat, longitude: rLng } = riderLoc;

      if (status === 'confirmed') {
        // Must be near Mart/Restaurant (500m)
        const pickup = pickupStops[0]?.coords || DEFAULT_MART;
        const dist = calculateDistance(rLat, rLng, pickup.latitude, pickup.longitude);
        if (dist > 0.5) {
          Alert.alert('Geo-Fencing 📍', `You are ${dist.toFixed(1)}km away. Please reach the pickup location before swiping arrived.`);
          return;
        }
      } else if (status === 'out_for_delivery') {
        // Must be near Customer (200m)
        const dist = calculateDistance(rLat, rLng, customerCoords.latitude, customerCoords.longitude);
        if (dist > 0.2) {
          Alert.alert('Geo-Fencing 📍', `You are ${dist.toFixed(1)}km away. Please reach the customer location before completing the delivery.`);
          return;
        }
      }
    }

    let nextStatus = '';
    if (order?.orderType === 'pharma') {
      const pharmaNext: Record<string, string> = {
        confirmed: 'preparing',
        preparing: 'ready_for_pickup',
        ready_for_pickup: 'picked_up',
        picked_up: 'in_transit',
        in_transit: 'out_for_delivery',
        out_for_delivery: 'delivered',
      };
      nextStatus = pharmaNext[status];
    } else {
      const normalNext: Record<string, string> = {
        confirmed: 'preparing',
        preparing: 'out_for_delivery',
        out_for_delivery: 'delivered',
      };
      nextStatus = normalNext[status];
    }
    if (!nextStatus) return;

    // --- COD CASH COLLECTION WORKFLOW ---
    if (nextStatus === 'delivered' && order?.paymentMethod === 'cod') {
      const isCashOnPick = order?.cashFlowMode === 'CASH_ON_PICK' || cashFlowInfo?.isCashOnPick;
      const collectMsg = isCashOnPick
        ? `Collect Rs. ${order.total} from the customer.\n\n✅ You already paid the shop.\n⚠️ You only owe platform commission + fee to Baldia Mart (not the full order).`
        : `Please collect Rs. ${order.total} from the customer before completing the delivery.`;
      Alert.alert('💵 Collect Cash', collectMsg, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I have Collected Cash', onPress: () => completeDelivery(nextStatus), style: 'default' },
      ]);
      return;
    }

    // --- CASH-ON-PICK: Confirm shop payment before leaving pickup phase ---
    const isCashOnPick = order?.cashFlowMode === 'CASH_ON_PICK' || cashFlowInfo?.isCashOnPick;
    const leavingPickup = ['out_for_delivery', 'picked_up', 'in_transit'].includes(nextStatus);
    if (isCashOnPick && leavingPickup) {
      const hasSubOrders = order?.subOrders?.length > 0;
      if (!hasSubOrders && order?.pickupPaymentStatus !== 'confirmed') {
        const amount = Number(order.subtotal);
        Alert.alert(
          '💵 Pay Shop First',
          `Pay Rs. ${amount} to the shop in cash from your pocket, then confirm.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'I Paid the Shop',
              onPress: async () => {
                try {
                  setUpdatingStatus(true);
                  await ordersApi.confirmPickupPayment(orderId, { amountPaid: amount });
                  await completeDelivery(nextStatus);
                  await refreshOrder();
                } catch (e: any) {
                  Alert.alert('Error', e.response?.data?.message || 'Failed to confirm shop payment');
                } finally {
                  setUpdatingStatus(false);
                }
              },
            },
          ]
        );
        return;
      }
    }

    // Process immediately if not COD or not final delivery stage
    completeDelivery(nextStatus);
  };

  const completeDelivery = async (nextStatus: string) => {
    setUpdatingStatus(true);
    try {
      await ordersApi.updateStatus(orderId, nextStatus);
      setStatus(nextStatus);
      // if (nextStatus === 'delivered') {
      //   await AsyncStorage.removeItem('activeOrderId');
      //   Alert.alert('✅ Delivered!', 'Great job! Order completed successfully.', [
      //     { text: 'Back to Dashboard', onPress: () => navigation.replace('Main') },
      //   ]);
      // }
    } catch (e) {
      Alert.alert('Error', (e as any)?.response?.data?.message || 'Could not update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleReportMissing = (itemId: string, itemName: string) => {
    setPendingItem({ id: itemId, name: itemName });
    setReasonType('missing');
    setReasonText('');
    setReasonModalVisible(true);
  };

  const submitReason = async () => {
    if (!reasonText.trim()) {
      Alert.alert('Required', 'Please provide a reason.');
      return;
    }

    const currentReason = reasonText.trim();
    setReasonModalVisible(false);
    setUpdatingStatus(true);

    try {
      if (reasonType === 'missing' && pendingItem) {
        await ordersApi.removeItem(orderId, pendingItem.id, currentReason);
        Alert.alert('Success', `${pendingItem.name} marked as missing.`);
        await refreshOrder();
      } else if (reasonType === 'release') {
        // Set guard BEFORE API call to prevent socket's 'pending' event
        // from triggering a second navigation while we're already navigating away
        isNavigatingAway.current = true;
        await ordersApi.releaseOrder(orderId, currentReason);
        Alert.alert('Order Released', 'This order has been released. Reason logged.');
        navigation.replace('Main');
      }
    } catch (e: any) {
      console.error('Submit reason error:', e);
      const serverMsg = e.response?.data?.message || e.message || `Failed to ${reasonType === 'missing' ? 'report missing item' : 'release order'}`;
      Alert.alert('Error', serverMsg);
    } finally {
      setUpdatingStatus(false);
      setPendingItem(null);
    }
  };

  const handleReleaseOrder = () => {
    setReasonType('release');
    setReasonText('');
    setReasonModalVisible(true);
  };

  const handlePickUpSubOrder = async (subOrderId: string, amountToPay: number) => {
    const sub = order?.subOrders?.find((s: any) => s.id === subOrderId);
    const isCashOnPick = order?.cashFlowMode === 'CASH_ON_PICK' || cashFlowInfo?.isCashOnPick;

    if (isCashOnPick && sub?.pickupPaymentStatus !== 'confirmed') {
      Alert.alert(
        '💵 Pay Shop First',
        `Pay Rs. ${amountToPay} to this shop in cash from your pocket, then confirm pickup.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I Paid the Shop',
            onPress: async () => {
              try {
                await ordersApi.confirmPickupPayment(orderId, { subOrderId, amountPaid: amountToPay });
                await ordersApi.updateSubOrderStatus(subOrderId, 'picked_up');
                await refreshOrder();
              } catch (e: any) {
                Alert.alert('Error', e.response?.data?.message || 'Failed to confirm shop payment');
              }
            },
          },
        ]
      );
      return;
    }

    try {
      await ordersApi.updateSubOrderStatus(subOrderId, 'picked_up');
      await refreshOrder();
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to update stop status.');
    }
  };

  // ── External maps ───────────────────────────────────────────────────
  const openExternalMaps = () => {
    const origin = riderLoc ? `${riderLoc.latitude},${riderLoc.longitude}` : '';
    const customerLabel = encodeURIComponent(order?.address?.label || 'Customer');
    const dest = `${customerCoords.latitude},${customerCoords.longitude}`;
    const waypts = pickupStops.map(s => `${s.coords.latitude},${s.coords.longitude}`).join('|');

    if (Platform.OS === 'android') {
      if (pickupStops.length === 1) {
        // Single stop: origin -> stop -> customer with destination label
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&destination_place_id=${customerLabel}&waypoints=${pickupStops[0].coords.latitude},${pickupStops[0].coords.longitude}&travelmode=two_wheeler`
        );
      } else {
        Linking.openURL(
          `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${dest}&waypoints=${waypts}&travelmode=two_wheeler`
        );
      }
    } else {
      const first = pickupStops[0]?.coords || DEFAULT_MART;
      const firstName = pickupStops[0]?.name || 'Stop';
      Linking.openURL(`maps:0,0?q=${encodeURIComponent(firstName)}@${first.latitude},${first.longitude}`);
    }
  };

  const handleChat = () => {
    navigation.navigate('OrderChat', {
      orderId: order.id,
      customerName: order.user?.name || 'Customer'
    });
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#FF4500" /></View>;
  if (!order) return <View style={styles.centered}><Text>Order not found</Text></View>;

  // ─── Next stop context for bottom sheet ─────────────────────────────
  const nextStopName = isPickupPhase
    ? (pickupStops.length > 1 ? `${pickupStops.length} ${isFood ? 'Restaurants' : 'Shops'}` : (pickupStops[0]?.name || (isFood ? 'Restaurant' : 'Shop')))
    : (order.user?.name || 'Customer');
  const nextStopAddr = isPickupPhase
    ? (pickupStops.length > 1 ? 'Multiple pickup points' : (pickupStops[0]?.description || ''))
    : (order.address?.streetAddress || '');

  return (
    <View style={styles.root}>
      {/* ── Map ── */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={mapRegion}
        showsUserLocation={false}
        showsCompass
        showsMyLocationButton={false}
      >
        {/* Rider live location */}
        {riderLoc && (
          <Marker coordinate={{ latitude: riderLoc.latitude, longitude: riderLoc.longitude }}>
            <View style={styles.riderPin}><Text style={{ fontSize: 18 }}>🏍️</Text></View>
          </Marker>
        )}

        {/* Pickup stops — numbered */}
        {pickupStops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={stop.coords}
            tracksViewChanges={false}
          >
            <StopPin number={stop.stopNum} emoji={stop.emoji} />
          </Marker>
        ))}

        {/* Customer dropoff — numbered last */}
        <Marker
          coordinate={customerCoords}
          tracksViewChanges={false}
        >
          <StopPin number={dropoffStopNum} emoji="📍" />
        </Marker>

        {/* Full route polyline */}
        {routeCoords.length >= 2 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor="#FF4500"
            strokeWidth={3.5}
            lineDashPattern={[6, 4]}
          />
        )}
      </MapView>

      {/* ── Top Header overlay ── */}
      <SafeAreaView style={styles.header} edges={['top']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.orderTitle}>Order #{(orderId || '').slice(0, 8).toUpperCase()}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, flexWrap: 'wrap', gap: 6 }}>
            <View style={[styles.typeBadge, order.orderType === 'rashan' && { backgroundColor: '#FF4500' }, order.orderType === 'pharma' && { backgroundColor: '#E0F2F1' }, { marginTop: 0 }]}>
              <Text style={[styles.typeTxt, order.orderType === 'rashan' && { color: '#fff' }, order.orderType === 'pharma' && { color: '#00796B' }]}>
                {order.orderType === 'food' ? '🍽️ Food Order' : order.orderType === 'rashan' ? '📦 RASHAN BULK' : order.orderType === 'pharma' ? '🏥 PHARMACY' : '🛒 Mart Order'}
              </Text>
            </View>
            {order.priority === 'high' && (
              <View style={[styles.emergencyBadge, { marginTop: 0 }]}>
                <Text style={styles.emergencyTxt}>🚨 EMERGENCY</Text>
              </View>
            )}
          </View>
        </View>
        {settings?.feature_chat_enabled === true && status !== 'delivered' && status !== 'cancelled' && (
          <TouchableOpacity onPress={handleChat} style={styles.navChatBtn}>
            <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={openExternalMaps} style={styles.navBtn}>
          <Text style={styles.navBtnTxt}>🧭</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleReleaseOrder} style={[styles.navBtn, { backgroundColor: '#C53030' }]}>
          <Text style={[styles.navBtnTxt, { fontSize: 16 }]}>🚫</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Route Legend strip ── */}
      <View style={styles.routeLegend}>
        {/* {pickupStops.map((stop, i) => (
          <React.Fragment key={stop.id}>
            <View style={styles.legendStep}>
              <View style={styles.legendNum}><Text style={styles.legendNumTxt}>{stop.stopNum}</Text></View>
              <Text style={styles.legendTxt} numberOfLines={1}>{stop.name}</Text>
            </View>
            <Text style={styles.legendArrow}>›</Text>
          </React.Fragment>
        ))} */}
        <FlatList
          horizontal
          data={pickupStops}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <React.Fragment key={item.id}>
              <View style={styles.legendStep}>
                <View style={styles.legendNum}><Text style={styles.legendNumTxt}>{item.stopNum}</Text></View>
                <Text style={styles.legendTxt} numberOfLines={1}>{item.name}</Text>
              </View>
              <Text style={styles.legendArrow}>›</Text>
            </React.Fragment>
          )}
        />

        <View style={styles.legendStep}>
          <View style={[styles.legendNum, { backgroundColor: '#27ae60' }]}>
            <Text style={styles.legendNumTxt}>{dropoffStopNum}</Text>
          </View>
          <Text style={styles.legendTxt} numberOfLines={1}>{order.user?.name || 'Customer'}</Text>
        </View>
      </View>

      {/* ── Bottom Sheet ── */}
      <View style={styles.bottomSheet}>
        {/* Next stop info */}
        <View style={styles.stopInfo}>
          <Text style={{ fontSize: 28 }}>{isPickupPhase ? (order.orderType === 'rashan' ? '📦' : (isFood ? '🍽️' : '🏪')) : '🏠'}</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.stopLabel}>{isPickupPhase ? 'Pick up from' : 'Deliver to'}</Text>
            <Text style={styles.stopName} numberOfLines={1}>{nextStopName}</Text>
            <Text style={styles.stopAddr} numberOfLines={1}>
              {order?.orderType === 'pharma' && isPickupPhase ? '🏥 ' : ''}
              {nextStopAddr}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              const phone = order.user?.phoneNumber || order.user?.phone;
              if (phone) Linking.openURL(`tel:${phone}`);
              else Alert.alert('Error', 'Customer phone not available.');
            }}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
          {settings?.feature_chat_enabled === true && status !== 'delivered' && status !== 'cancelled' && (
            <TouchableOpacity
              style={[styles.callBtn, { backgroundColor: '#FF450015', marginLeft: 8 }]}
              onPress={handleChat}
            >
              <Ionicons name="chatbubbles-outline" size={20} color="#FF4500" />
            </TouchableOpacity>
          )}
        </View>

        {/* Cash-on-Pick Payment Banner */}
        {(order?.cashFlowMode === 'CASH_ON_PICK' || cashFlowInfo?.isCashOnPick) && isPickupPhase && (
          <View style={styles.cashOnPickBox}>
            <View style={styles.cashOnPickHeader}>
              <Text style={{ fontSize: 18 }}>💵</Text>
              <Text style={styles.cashOnPickTitle}>Cash on Pick — Pay Shop First</Text>
            </View>
            <Text style={styles.cashOnPickMsg}>
              Pay the shop subtotal in cash before picking up. Platform commission is paid separately by the merchant.
            </Text>
            {(cashFlowInfo?.stops || []).map((stop: any, idx: number) => (
              <View key={idx} style={styles.cashOnPickStop}>
                <Text style={styles.cashOnPickStopName}>{stop.merchantName}</Text>
                <Text style={styles.cashOnPickStopAmt}>Rs. {stop.amountToPay}</Text>
                <Text style={[
                  styles.cashOnPickStatus,
                  stop.pickupPaymentStatus === 'confirmed' ? styles.cashOnPickConfirmed : styles.cashOnPickPending,
                ]}>
                  {stop.pickupPaymentStatus === 'confirmed' ? '✓ Paid' : 'Pending'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Cold Chain Reminder */}
        {order.isColdChain && (
          <View style={styles.coldChainBox}>
            <View style={styles.coldChainHeader}>
              <Ionicons name="thermometer" size={18} color="#00796B" />
              <Text style={styles.coldChainTitle}>Cold Chain Required ❄️</Text>
            </View>
            <Text style={styles.coldChainMsg}>Use a cool-box. Keep medicine between 2°C - 8°C.</Text>
          </View>
        )}

        {/* Item Checklist (collapsible) */}
        {order.items?.length > 0 && (
          <TouchableOpacity style={styles.checklistToggle} onPress={() => setExpandedChecklist(v => !v)}>
            <Text style={styles.checklistToggleTxt}>
              {isFood ? '🍽️ Order Checklist' : '📦 Items'} ({order.items.length})
            </Text>
            <Text style={styles.checklistToggleIcon}>{expandedChecklist ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}

        {expandedChecklist && order.items?.length > 0 && (
          <ScrollView style={styles.checklist} showsVerticalScrollIndicator={false}>
            {Object.entries(
              order.items.reduce((acc: any, item: any) => {
                const sub = order.subOrders?.find((s: any) => s.id === item.subOrderId);
                const gName = sub?.pharmacy?.name || sub?.vendor?.name || sub?.restaurant?.name || item.product?.brand?.name || item.menuItem?.restaurant?.name || order.restaurant?.name || 'Baldia Mart';
                if (!acc[gName]) acc[gName] = { active: [], missing: [], subOrderId: item.subOrderId, status: sub?.status };
                if (item.status === 'missing') acc[gName].missing.push(item);
                else acc[gName].active.push(item);
                return acc;
              }, {})
            ).map(([gName, group]: [any, any], gIdx) => (
              <View key={gIdx} style={{ marginBottom: 15 }}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{gName}</Text>
                  {group.subOrderId && group.status !== 'picked_up' && group.status !== 'delivered' && group.active.length > 0 && (() => {
                    const sub = order.subOrders?.find((s: any) => s.id === group.subOrderId);
                    const isCashOnPick = order?.cashFlowMode === 'CASH_ON_PICK';
                    const needsPay = isCashOnPick && sub?.pickupPaymentStatus !== 'confirmed';
                    return (
                      <TouchableOpacity
                        style={styles.pickupChip}
                        onPress={() => handlePickUpSubOrder(group.subOrderId, Number(sub?.subtotal || 0))}
                      >
                        <Text style={styles.pickupChipTxt}>
                          {needsPay ? `PAY Rs.${Number(sub?.subtotal || 0)} & PICK UP` : 'PICKED UP ✓'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()}
                  {group.status === 'picked_up' && (
                    <View style={styles.pickedChip}><Text style={styles.pickedChipTxt}>✅ DONE</Text></View>
                  )}
                </View>

                {/* Active Items */}
                {group.active.map((item: any, idx: number) => {
                  const itemName = item.medicine?.name || item.product?.name || item.menuItem?.name || item.productName || 'Item';
                  return (
                    <View key={idx} style={[styles.itemRow, { justifyContent: 'space-between' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={styles.itemQty}>{item.quantity}x</Text>
                        <Text style={[styles.itemName, { flex: 1, marginRight: 5 }]} numberOfLines={1}>{itemName}</Text>
                        <Text style={styles.itemPrice}>Rs {Number(item.priceAtTime || 0) * item.quantity}</Text>
                      </View>
                      {group.status !== 'picked_up' && group.status !== 'delivered' && (
                        <TouchableOpacity onPress={() => handleReportMissing(item.id, itemName)} style={{ marginLeft: 10, padding: 4, backgroundColor: '#FFF5F5', borderRadius: 6 }}>
                          <Text style={{ fontSize: 13 }}>🗑️</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {/* Missing Items */}
                {group.missing.map((item: any, idx: number) => {
                  const itemName = item.medicine?.name || item.product?.name || item.menuItem?.name || item.productName || 'Item';
                  return (
                    <View key={`miss-${idx}`} style={[styles.itemRow, { justifyContent: 'space-between', opacity: 0.5 }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                        <Text style={[styles.itemQty, { color: '#666' }]}>{item.quantity}x</Text>
                        <Text style={[styles.itemName, { flex: 1, marginRight: 5, textDecorationLine: 'line-through' }]} numberOfLines={1}>{itemName}</Text>
                        <Text style={[styles.itemPrice, { color: '#C53030', fontSize: 10 }]}>MISSING</Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total (COD Collection)</Text>
              <Text style={styles.totalVal}>Rs {order.total}</Text>
            </View>
          </ScrollView>
        )}

        {/* Swipe to Confirm */}
        {status !== 'delivered' && status !== 'cancelled' ? (
          updatingStatus
            ? <ActivityIndicator size="large" color="#FF4500" style={{ marginVertical: 12 }} />
            : <SwipeToConfirm onConfirm={handleSwipeConfirm} label={statusLabel} />
        ) : (
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark-done-circle" size={60} color={SUCCESS} />
            </View>
            <Text style={[styles.successTitle, { textAlign: 'center' }]}>Order Delivered!</Text>
            <Text style={styles.successMsg}>
              You earned <Text style={{ fontWeight: 'bold', color: SUCCESS }}>Rs {order.deliveryFee}</Text> from this delivery.
            </Text>

            <View style={styles.postActionRow}>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => printReceipt(order)}>
                <Ionicons name="receipt-outline" size={18} color="#64748B" />
                <Text style={styles.secondaryActionTxt}>View Receipt</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryActionBtn} onPress={() => generateReceiptPDF(order)}>
                <Ionicons name="share-outline" size={18} color="#64748B" />
                <Text style={styles.secondaryActionTxt}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.primaryFinishBtn}
              onPress={() => {
                AsyncStorage.removeItem('activeOrderId');
                navigation.replace('Main')
              }}
            >
              <Text style={styles.primaryFinishBtnTxt}>Go to Dashboard</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Location Block Overlay ── */}
      {isLocationBlocked && (
        <View style={styles.blockOverlay}>
          <Ionicons name="location" size={64} color="#FF4500" />
          <Text style={styles.blockTitle}>Location Required 📍</Text>
          <Text style={styles.blockMsg}>
            Please enable GPS to continue. We need your live location to track delivery progress.
          </Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={async () => {
              const enabled = await Location.hasServicesEnabledAsync();
              if (enabled) {
                setIsLocationBlocked(false);
                // Trigger re-init or just let watchPosition handle it
              } else {
                Alert.alert('GPS Still Off', 'Please enable location services in your device settings.');
              }
            }}
          >
            <Text style={styles.retryBtnTxt}>I've Enabled GPS</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Reason Modal ── */}
      <Modal
        visible={reasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReasonModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {reasonType === 'missing' ? 'Report Missing Item' : 'Release/Cancel Order'}
            </Text>
            <Text style={styles.modalSub}>
              {reasonType === 'missing'
                ? `Please explain why "${pendingItem?.name}" is missing.`
                : 'Please explain why you are releasing/cancelling this order.'}
            </Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Enter reason here..."
              placeholderTextColor="#999"
              multiline
              value={reasonText}
              onChangeText={setReasonText}
              autoFocus
            />

            <View style={styles.modalRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#F5F5F5' }]}
                onPress={() => setReasonModalVisible(false)}
              >
                <Text style={[styles.modalBtnTxt, { color: '#666' }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#FF4500' }]}
                onPress={submitReason}
              >
                <Text style={styles.modalBtnTxt}>Submit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  riderPin: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#FF4500',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
  },

  header: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'rgba(20,20,20,0.9)', gap: 12,
  },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#2A2A2A', justifyContent: 'center', alignItems: 'center' },
  backArrow: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  orderTitle: { color: '#fff', fontSize: 16, fontWeight: '800' },
  typeBadge: { backgroundColor: '#FF450025', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  typeTxt: { fontSize: 10, fontWeight: '700', color: '#FF7A3D' },
  navBtn: { width: 40, height: 40, backgroundColor: '#2A2A2A', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navBtnTxt: { fontSize: 20 },

  routeLegend: {
    position: 'absolute', top: 100, left: 16, right: 16, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', flexWrap: 'nowrap',
    elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8,
  },
  legendStep: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  legendNum: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' },
  legendNumTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  legendTxt: { fontSize: 11, color: '#333', fontWeight: '600', maxWidth: 70 },
  legendArrow: { color: '#ccc', fontSize: 18, marginHorizontal: 4 },

  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 20, paddingBottom: 36,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
  },

  stopInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  stopLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
  stopName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },
  stopAddr: { fontSize: 12, color: '#666', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E8F4FD', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 20 },

  checklistToggle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#F5F5F5' },
  checklistToggleTxt: { fontSize: 13, fontWeight: '700', color: '#555' },
  checklistToggleIcon: { color: '#999', fontSize: 12 },
  checklist: { maxHeight: 160, marginBottom: 4 },

  groupHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 8 },
  groupName: { fontSize: 11, fontWeight: '800', color: '#FF4500', textTransform: 'uppercase' },
  pickupChip: { backgroundColor: '#FF4500', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pickupChipTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },
  pickedChip: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  pickedChipTxt: { color: '#27ae60', fontSize: 9, fontWeight: '900' },
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  itemQty: { width: 28, fontSize: 13, fontWeight: '800', color: '#FF4500' },
  itemName: { flex: 1, fontSize: 13, color: '#333' },
  itemPrice: { fontSize: 12, color: '#666', fontWeight: '600' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, marginTop: 4 },
  totalLabel: { fontSize: 13, fontWeight: '700' },
  totalVal: { fontSize: 15, fontWeight: '800', color: '#27ae60' },

  completedBadge: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 8 },
  completedTxt: { color: '#27ae60', fontSize: 15, fontWeight: '800' },
  closeBtn: { backgroundColor: '#1A1A1A', height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginTop: 12 },
  closeBtnTxt: { color: '#fff', fontSize: 15, fontWeight: '700' },
  receiptSuccessBtn: {
    backgroundColor: '#FF450015',
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#FF450030',
  },
  receiptSuccessBtnTxt: { color: '#FF4500', fontSize: 15, fontWeight: '700' },
  navChatBtn: {
    width: 40,
    height: 40,
    backgroundColor: '#FF4500',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4
  },
  emergencyBadge: {
    backgroundColor: '#C53030',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  emergencyTxt: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '900',
  },
  cashOnPickBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  cashOnPickHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cashOnPickTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginLeft: 6 },
  cashOnPickMsg: { fontSize: 11, color: '#78350F', lineHeight: 16, marginBottom: 8 },
  cashOnPickStop: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 },
  cashOnPickStopName: { flex: 1, fontSize: 12, fontWeight: '700', color: '#78350F' },
  cashOnPickStopAmt: { fontSize: 12, fontWeight: '900', color: '#92400E' },
  cashOnPickStatus: { fontSize: 10, fontWeight: '800', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  cashOnPickConfirmed: { backgroundColor: '#D1FAE5', color: '#065F46' },
  cashOnPickPending: { backgroundColor: '#FEE2E2', color: '#991B1B' },
  coldChainBox: {
    backgroundColor: '#E0F2F1',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#B2DFDB',
  },
  coldChainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  coldChainTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00796B',
    marginLeft: 6,
  },
  coldChainMsg: {
    fontSize: 11,
    color: '#004D40',
    lineHeight: 16,
  },
  blockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.98)',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },
  blockTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    marginTop: 20,
    textAlign: 'center',
  },
  blockMsg: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 24,
  },
  retryBtn: {
    backgroundColor: '#FF4500',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 30,
    marginTop: 30,
    elevation: 4,
  },
  retryBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center', padding: 20
  },
  modalContent: {
    backgroundColor: '#fff', width: '100%', borderRadius: 20, padding: 24,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 8 },
  modalSub: { fontSize: 14, color: '#666', marginBottom: 20, lineHeight: 20 },
  modalInput: {
    backgroundColor: '#F9F9F9', borderRadius: 12, padding: 16, height: 100,
    textAlignVertical: 'top', fontSize: 15, color: '#1A1A1A', borderWidth: 1, borderColor: '#EEE',
    marginBottom: 24
  },
  modalRow: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
  modalBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  successContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  successMsg: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  postActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  secondaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    gap: 8,
  },
  secondaryActionTxt: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  primaryFinishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    paddingHorizontal: 30,
    paddingVertical: 16,
    borderRadius: 32,
    gap: 12,
    elevation: 4,
  },
  primaryFinishBtnTxt: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});
