import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
  ActivityIndicator, ScrollView, Linking, Platform, Vibration,
  Animated, PanResponder, Dimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ordersApi, socket } from '../api/api';

const { width: SCREEN_W } = Dimensions.get('window');
const DEFAULT_MART = { latitude: 24.91522600, longitude: 66.96431980 };

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
const getStatusLabel = (status: string, isFood: boolean, paymentMethod: string) => {
  const isCOD = paymentMethod === 'cod';
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
  const [order, setOrder] = useState<any>(null);
  const [status, setStatus] = useState('confirmed');
  const [loading, setLoading] = useState(true);
  const [riderLoc, setRiderLoc] = useState<any>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [expandedChecklist, setExpandedChecklist] = useState(true);
  const mapRef = useRef<MapView>(null);

  // ── Derived logic (Must be before useEffect/Handlers) ───────────────
  const isFood = order?.orderType === 'food';
  const pickupStops: any[] = [];

  if (order) {
    if (order.subOrders?.length > 0) {
      // Handle both Food (Restaurants) and Mart (Vendors) sub-orders
      order.subOrders.forEach((sub: any, i: number) => {
        const entity = sub.restaurant || sub.vendor;
        if (entity?.latitude || entity?.lat) {
          pickupStops.push({
            id: sub.id,
            stopNum: i + 1,
            name: entity.name,
            description: entity.location || entity.address || (isFood ? 'Restaurant' : 'Shop'),
            coords: {
              latitude: Number(entity.latitude || entity.lat || 0),
              longitude: Number(entity.longitude || entity.lng || 0)
            },
            subOrderId: sub.id,
            subStatus: sub.status,
            emoji: isFood ? '🍽️' : '🏪',
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
    } else {
      pickupStops.push({
        id: 'mart', stopNum: 1, name: 'Baldia Mart', description: 'Main Colony, Baldia Town',
        coords: DEFAULT_MART, emoji: '🏪',
      });
    }
  }

  const customerCoords = {
    latitude: Number(order?.address?.latitude || 24.9144),
    longitude: Number(order?.address?.longitude || 66.9748),
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
  const statusLabel = getStatusLabel(status, isFood, order?.paymentMethod || 'online');

  // ── Init ────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        // Save current active order ID for auto-resume logic
        if (orderId) {
          await AsyncStorage.setItem('activeOrderId', orderId);
        }

        const [orderRes, { status: locStatus }] = await Promise.all([
          ordersApi.getById(orderId),
          Location.requestForegroundPermissionsAsync(),
        ]);
        if (orderRes.data) {
          setOrder(orderRes.data);
          setStatus(orderRes.data.status);
          if (orderRes.data.status === 'cancelled') {
            Alert.alert('Order Cancelled', 'This order is no longer active.');
            navigation.replace('Main');
            return;
          }
        }
        if (locStatus === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setRiderLoc(loc.coords);
          Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 10 },
            (l) => setRiderLoc(l.coords),
          );
        }
      } catch (e) {
        console.error('NavigationScreen init:', e);
        Alert.alert('Error', 'Failed to load order navigation data.');
      } finally {
        setLoading(false);
      }
    };
    init();

    socket.connect();
    socket.emit('joinOrder', orderId);

    const onCancelled = (data: any) => {
      try {
        if (!data) return;
        const targetId = data.orderId || (typeof data === 'string' ? data : null);

        // CRITICAL FIX: Only trigger alert IF the status provided is actually 'cancelled'
        if ((targetId === orderId && data.status === 'cancelled') || (typeof data === 'string' && data === 'cancelled')) {
          Vibration.vibrate([100, 500]);
          AsyncStorage.removeItem('activeOrderId')
            .then(() => {
              Alert.alert('Order Cancelled 🛑', 'The customer has cancelled this order.', [
                { text: 'Okay', onPress: () => navigation.replace('Main') },
              ]);
            })
            .catch(e => console.error(e));
        }
      } catch (err) { console.error('onCancelled error', err); }
    };

    const onUpdated = (data: any) => {
      try {
        if (data?.orderId === orderId) refreshOrder();
      } catch (err) { console.error('onUpdated error', err); }
    };

    socket.on('orderStatusUpdated', onCancelled);
    socket.on('orderUpdated', onUpdated);
    return () => {
      socket.off('orderStatusUpdated', onCancelled);
      socket.off('orderUpdated', onUpdated);
    };
  }, [orderId]);

  const refreshOrder = useCallback(async () => {
    try {
      const res = await ordersApi.getById(orderId);
      if (res.data) {
        setOrder(res.data);
        setStatus(res.data.status);
      }
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

    const next: Record<string, string> = {
      confirmed: 'preparing',
      preparing: 'out_for_delivery',
      out_for_delivery: 'delivered',
    };
    const nextStatus = next[status];
    if (!nextStatus) return;

    // --- COD CASH COLLECTION WORKFLOW ---
    if (nextStatus === 'delivered' && order?.paymentMethod === 'cod') {
      Alert.alert(
        '💵 Collect Cash',
        `Please collect Rs. ${order.total} from the customer before completing the delivery.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'I have Collected Cash',
            onPress: () => completeDelivery(nextStatus),
            style: 'default'
          }
        ]
      );
      return;
    }

    // Process immediately if not COD or not final delivery stage
    completeDelivery(nextStatus);
  };

  const completeDelivery = async (nextStatus: string) => {
    setUpdatingStatus(true);
    try {
      await ordersApi.updateStatus(orderId, nextStatus);
      setStatus(nextStatus);
      if (nextStatus === 'delivered') {
        await AsyncStorage.removeItem('activeOrderId');
        Alert.alert('✅ Delivered!', 'Great job! Order completed successfully.', [
          { text: 'Back to Dashboard', onPress: () => navigation.replace('Main') },
        ]);
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update order status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handlePickUpSubOrder = async (subOrderId: string) => {
    try {
      await ordersApi.updateSubOrderStatus(subOrderId, 'picked_up');
      await refreshOrder();
    } catch (e) { Alert.alert('Error', 'Failed to update stop status.'); }
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
          <View style={styles.typeBadge}>
            <Text style={styles.typeTxt}>{isFood ? '🍽️ Food Order' : '🛒 Mart Order'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openExternalMaps} style={styles.navBtn}>
          <Text style={styles.navBtnTxt}>🧭</Text>
        </TouchableOpacity>
      </SafeAreaView>

      {/* ── Route Legend strip ── */}
      <View style={styles.routeLegend}>
        {pickupStops.map((stop, i) => (
          <React.Fragment key={stop.id}>
            <View style={styles.legendStep}>
              <View style={styles.legendNum}><Text style={styles.legendNumTxt}>{stop.stopNum}</Text></View>
              <Text style={styles.legendTxt} numberOfLines={1}>{stop.name}</Text>
            </View>
            <Text style={styles.legendArrow}>›</Text>
          </React.Fragment>
        ))}
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
          <Text style={{ fontSize: 28 }}>{isPickupPhase ? (isFood ? '🍽️' : '🏪') : '🏠'}</Text>
          <View style={{ flex: 1, marginLeft: 14 }}>
            <Text style={styles.stopLabel}>{isPickupPhase ? 'Pick up from' : 'Deliver to'}</Text>
            <Text style={styles.stopName} numberOfLines={1}>{nextStopName}</Text>
            <Text style={styles.stopAddr} numberOfLines={1}>{nextStopAddr}</Text>
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
        </View>

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
                const gName = (isFood || item.menuItem)
                  ? (sub?.restaurant?.name || item.menuItem?.restaurant?.name || order.restaurant?.name || 'Restaurant')
                  : 'Baldia Mart';
                if (!acc[gName]) acc[gName] = { items: [], subOrderId: item.subOrderId, status: sub?.status };
                acc[gName].items.push(item);
                return acc;
              }, {})
            ).map(([gName, group]: [any, any], gIdx) => (
              <View key={gIdx} style={{ marginBottom: 10 }}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupName}>{gName}</Text>
                  {group.subOrderId && group.status !== 'picked_up' && group.status !== 'delivered' && (
                    <TouchableOpacity style={styles.pickupChip} onPress={() => handlePickUpSubOrder(group.subOrderId)}>
                      <Text style={styles.pickupChipTxt}>PICKED UP ✓</Text>
                    </TouchableOpacity>
                  )}
                  {group.status === 'picked_up' && (
                    <View style={styles.pickedChip}><Text style={styles.pickedChipTxt}>✅ DONE</Text></View>
                  )}
                </View>
                {group.items.map((item: any, idx: number) => (
                  <View key={idx} style={styles.itemRow}>
                    <Text style={styles.itemQty}>{item.quantity}x</Text>
                    <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || item.menuItem?.name || 'Item'}</Text>
                    <Text style={styles.itemPrice}>Rs {Number(item.priceAtTime || 0) * item.quantity}</Text>
                  </View>
                ))}
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total (COD)</Text>
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
          <View>
            <View style={styles.completedBadge}>
              <Text style={styles.completedTxt}>
                {status === 'cancelled' ? '🛑 Order Cancelled' : '✅ Order Successfully Delivered'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.replace('Main')}>
              <Text style={styles.closeBtnTxt}>Return to Dashboard</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
});
