import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Switch, Alert, RefreshControl,
  Vibration, Modal, FlatList, Animated, PanResponder, Dimensions, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { useNetInfo } from '@react-native-community/netinfo';
import { socket, ordersApi, ridersApi, settingsApi } from '../api/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const DEFAULT_REGION = { latitude: 24.91522600, longitude: 66.96431980, latitudeDelta: 0.05, longitudeDelta: 0.05 };

// ─── Swipe-to-Accept Slider ──────────────────────────────────────────────────
function SwipeToAccept({ onAccept, label = 'Swipe to Accept' }: { onAccept: () => void; label?: string }) {
  const swipeX = useRef(new Animated.Value(0)).current;
  const TRACK_W = SCREEN_W - 72;
  const THUMB_W = 68;
  const MAX = TRACK_W - THUMB_W - 8;

  const panResponder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, g) => {
      const val = Math.max(0, Math.min(g.dx, MAX));
      swipeX.setValue(val);
    },
    onPanResponderRelease: (_, g) => {
      if (g.dx >= MAX * 0.75) {
        Animated.timing(swipeX, { toValue: MAX, duration: 120, useNativeDriver: false }).start(() => {
          onAccept();
          swipeX.setValue(0);
        });
      } else {
        Animated.spring(swipeX, { toValue: 0, useNativeDriver: false }).start();
      }
    },
  })).current;

  const opacity = swipeX.interpolate({ inputRange: [0, MAX], outputRange: [1, 0] });

  return (
    <View style={sw.track}>
      <Animated.View style={[sw.labelWrap, { opacity }]}>
        <Text style={sw.label}>{label}</Text>
        <Text style={sw.arrow}>›  ›  ›</Text>
      </Animated.View>
      <Animated.View style={[sw.thumb, { transform: [{ translateX: swipeX }] }]} {...panResponder.panHandlers}>
        <Text style={sw.thumbIcon}>🚴</Text>
      </Animated.View>
    </View>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }: any) {
  const netInfo = useNetInfo();
  const isNetworkOffline = netInfo.isConnected === false;
  
  const [isOnline, setIsOnline] = useState(false);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [rider, setRider] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [riderLoc, setRiderLoc] = useState<any>(null);
  const [martLocations, setMartLocations] = useState<any[]>([]);
  const [selectedMart, setSelectedMart] = useState<any>(null);
  const [showMartModal, setShowMartModal] = useState(false);

  // Animated bottom sheet for new order popup
  const [incomingOrder, setIncomingOrder] = useState<any>(null);
  const sheetY = useRef(new Animated.Value(350)).current;
  const [sheetVisible, setSheetVisible] = useState(false);

  // ── Location tracking ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      Location.watchPositionAsync(
        { accuracy: Location.Accuracy.High, distanceInterval: 15 },
        (loc) => {
          setRiderLoc(loc.coords);
          if (isOnline) {
            syncRiderStatus(true, loc.coords);
          }
        },
      );
    })();
  }, [isOnline]);

  // ── Socket lifecycle ────────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline || isNetworkOffline) { socket.disconnect(); return; }

    socket.connect();
    const onConnect = () => {
      if (rider) {
        socket.emit('joinRidersRoom', rider.id);
        socket.emit('joinRiderRoom', rider.id);
      }
    };

    const onNewOrder = (order: any) => {
      Vibration.vibrate([0, 400, 200, 400]);
      setPendingOrders(prev => prev.find(o => o?.id === order?.id) ? prev : [order, ...prev]);
      showIncoming(order);
    };

    const onOrderAccepted = ({ orderId }: any) =>
      setPendingOrders(prev => prev.filter(o => o?.id !== orderId));

    const onOrderCancelled = ({ orderId }: any) => {
      Vibration.vibrate([100, 500, 100, 500, 100, 500]);
      Alert.alert('Order Cancelled 🛑', `Order #${(orderId || '').slice(0, 8).toUpperCase()} was cancelled.`);
      fetchOrders();
    };

    socket.on('connect', onConnect);
    socket.on('newOrder', onNewOrder);
    socket.on('orderAccepted', onOrderAccepted);
    socket.on('orderCancelled', onOrderCancelled);
    socket.on('orderUpdated', fetchOrders);

    fetchOrders();
    if (!rider) fetchRiderInfo();

    return () => {
      socket.off('connect', onConnect);
      socket.off('newOrder', onNewOrder);
      socket.off('orderAccepted', onOrderAccepted);
      socket.off('orderCancelled', onOrderCancelled);
      socket.off('orderUpdated', fetchOrders);
      socket.disconnect();
    };
  }, [isOnline, rider?.id, isNetworkOffline]);

  useEffect(() => {
    const checkActiveOrder = async () => {
      try {
        const savedOrderId = await AsyncStorage.getItem('activeOrderId');
        if (savedOrderId) {
          navigation.navigate('Navigation', { orderId: savedOrderId });
        }
      } catch (e) {
        console.error('Auto-resume check failed:', e);
      }
    };
    
    fetchRiderInfo();
    fetchMartLocations();
    loadSelectedMart();
    checkActiveOrder();
    syncRiderStatus(isOnline);
  }, []);

  const syncRiderStatus = async (online: boolean, coords?: any) => {
    try {
      const data: any = { isOnline: online };
      if (coords) {
        data.currentLat = coords.latitude.toString();
        data.currentLng = coords.longitude.toString();
      }
      await ridersApi.updateProfile(data);
    } catch (e) {
      console.error('Failed to sync rider status:', e);
    }
  };

  // ── Data fetchers ────────────────────────────────────────────────────
  const fetchRiderInfo = async () => {
    try {
      const [profileRes, statsRes] = await Promise.all([ridersApi.getMe(), ridersApi.getStats()]);
      setRider(profileRes.data);
      setStats(statsRes.data);
    } catch (e) { console.error('fetchRiderInfo error', e); }
  };

  const fetchOrders = useCallback(async () => {
    try {
      const [pendingRes, activeRes, statsRes] = await Promise.all([
        ordersApi.getPending(),
        ordersApi.getActive(),
        ridersApi.getStats(),
      ]);
      setPendingOrders(pendingRes.data || []);
      setActiveOrders(activeRes.data || []);
      setStats(statsRes.data);
    } catch (e) { console.error('fetchOrders error', e); }
  }, []);

  const fetchMartLocations = async () => {
    try {
      const res = await settingsApi.getPublicSettings();
      if (res.data.mart_locations) {
        setMartLocations([
          { id: 'all', name: 'All Orders', address: 'Show orders from everywhere' },
          ...res.data.mart_locations,
        ]);
      }
    } catch (e) {}
  };

  const loadSelectedMart = async () => {
    try {
      const saved = await AsyncStorage.getItem('selectedMart');
      if (saved) setSelectedMart(JSON.parse(saved));
    } catch (e) {}
  };

  const handleSelectMart = async (mart: any) => {
    setSelectedMart(mart);
    await AsyncStorage.setItem('selectedMart', JSON.stringify(mart));
    setShowMartModal(false);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchOrders(); setRefreshing(false); };

  // ── Incoming Order Sheet ────────────────────────────────────────────
  const showIncoming = (order: any) => {
    setIncomingOrder(order);
    setSheetVisible(true);
    Animated.spring(sheetY, { toValue: 0, useNativeDriver: true, friction: 7 }).start();
  };

  const dismissIncoming = () => {
    Animated.timing(sheetY, { toValue: 350, duration: 250, useNativeDriver: true }).start(() => {
      setSheetVisible(false);
      setIncomingOrder(null);
    });
  };

  const handleAcceptIncoming = () => {
    if (!incomingOrder) return;
    navigation.navigate('OrderDetails', { orderId: incomingOrder.id });
    dismissIncoming();
  };

  // ── Filtered visible orders ─────────────────────────────────────────
  const visiblePending = pendingOrders
    .filter(p => !activeOrders.find(a => a?.id === p?.id))
    .filter(p => !selectedMart || selectedMart.id === 'all' || !p.martId || p.martId === selectedMart.id);

  const mapRegion = riderLoc
    ? { latitude: riderLoc.latitude, longitude: riderLoc.longitude, latitudeDelta: 0.04, longitudeDelta: 0.04 }
    : DEFAULT_REGION;

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {isNetworkOffline && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineText}>⚠️ No Internet Connection</Text>
        </View>
      )}
      {/* ── Full-screen Map ── */}
      <MapView style={styles.map} region={mapRegion} showsUserLocation showsMyLocationButton={false}>
        {/* Rider marker */}
        {riderLoc && (
          <Marker coordinate={{ latitude: riderLoc.latitude, longitude: riderLoc.longitude }} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={styles.riderPin}><Text style={{ fontSize: 20 }}>🏍️</Text></View>
          </Marker>
        )}
        {/* Active order customer pins */}
        {activeOrders.map(order => order.address?.latitude ? (
          <Marker
            key={order?.id || Math.random().toString()}
            coordinate={{ latitude: Number(order?.address?.latitude || 0), longitude: Number(order?.address?.longitude || 0) }}
            title={`#ORD-${(order?.id || '').slice(0, 6).toUpperCase()}`}
            pinColor="#2ecc71"
          />
        ) : null)}
      </MapView>

      {/* ── Top HUD ─────────────── */}
      <SafeAreaView style={styles.topHud} edges={['top']}>
        <View style={styles.topRow}>
          {/* Rider greeting */}
          <View style={{ flex: 1 }}>
            <Text style={styles.greeting}>
              {isOnline ? '🟢 Online' : '⚫ Offline'}
            </Text>
            <Text style={styles.name}>{rider?.name || 'Rider'}</Text>
          </View>

          {/* Online Switch */}
          <Switch
            value={isOnline}
            onValueChange={(val) => {
              setIsOnline(val);
              syncRiderStatus(val, riderLoc);
            }}
            trackColor={{ false: '#444', true: '#FF4500' }}
            thumbColor={isOnline ? '#fff' : '#888'}
            disabled={!rider?.isActive}
          />
        </View>

        {/* Approval banner */}
        {rider && !rider.isActive && rider.isProfileComplete && (
          <View style={styles.approvalBar}>
            <Text style={styles.approvalBarTxt}>⏳ Awaiting admin approval — you'll be notified once approved.</Text>
          </View>
        )}
      </SafeAreaView>

      {/* ── Stats Pill ─────────────── */}
      <View style={styles.statsPill}>
        <View style={styles.statItem}>
          <Text style={styles.statVal}>Rs {Number(stats?.todayEarnings || 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statVal}>{stats?.todayDeliveries || 0}</Text>
          <Text style={styles.statLabel}>Deliveries</Text>
        </View>
        <View style={styles.statDivider} />
        <TouchableOpacity style={styles.statItem} onPress={() => setShowMartModal(true)}>
          <Text style={styles.statVal} numberOfLines={1}>📍 {selectedMart?.name || 'Select Zone'}</Text>
          <Text style={styles.statLabel}>Tap to change</Text>
        </TouchableOpacity>
      </View>

      {/* ── Active & Pending Orders Bottom Panel ─────────────── */}
      <View style={styles.panel}>
        <View style={styles.panelHandle} />

        {!isOnline ? (
          <View style={styles.offlineWrap}>
            <Text style={styles.offlineIcon}>🔌</Text>
            <Text style={styles.offlineTxt}>Go online to receive delivery requests.</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 20 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
          >

            {/* Active Tasks */}
            {activeOrders.length > 0 && (
              <View>
                <Text style={styles.sectionHdr}>Active Deliveries</Text>
                {activeOrders.filter(o => o?.id).map(order => (
                  <TouchableOpacity
                    key={order.id}
                    style={styles.activeCard}
                    onPress={() => navigation.navigate('Navigation', { orderId: order.id })}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={styles.rowGap}>
                        <Text style={styles.orderId}>#{(order?.id || '').slice(0, 8).toUpperCase()}</Text>
                        <View style={[styles.badge, { backgroundColor: '#FF4500' }]}>
                          <Text style={styles.badgeTxt}>{order.status.replace('_', ' ').toUpperCase()}</Text>
                        </View>
                        {order.orderType === 'food' && <View style={[styles.badge, { backgroundColor: '#FFF5E0' }]}><Text style={[styles.badgeTxt, { color: '#FF8C00' }]}>🍽️ FOOD</Text></View>}
                        {order.orderType === 'mart' && <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.badgeTxt, { color: '#2E7D32' }]}>🛒 MART</Text></View>}
                      </View>
                      <Text style={styles.cardAddr} numberOfLines={1}>📍 {order.address?.streetAddress || 'Local Area'}</Text>
                      {order.orderType === 'food' && order.subOrders?.length > 1 && (
                        <Text style={styles.batchBadge}>🛣️ Batched: {order.subOrders.length} stops</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 22, color: '#FF4500' }}>›</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Pending Orders */}
            <Text style={styles.sectionHdr}>Available Orders ({visiblePending.length})</Text>
            {visiblePending.length === 0 ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyIcon}>🕐</Text>
                <Text style={styles.emptyTxt}>Waiting for new delivery requests...</Text>
              </View>
            ) : (
              visiblePending.filter(o => o?.id).map(order => (
                <TouchableOpacity
                  key={order.id}
                  style={styles.pendingCard}
                  onPress={() => navigation.navigate('OrderDetails', { orderId: order.id })}
                >
                  <View style={styles.rowGap}>
                    <Text style={styles.orderId}>#{(order?.id || '').slice(0, 8).toUpperCase()}</Text>
                    {order.orderType === 'food' && <View style={[styles.badge, { backgroundColor: '#FFF5E0' }]}><Text style={[styles.badgeTxt, { color: '#FF8C00' }]}>🍽️</Text></View>}
                    {order.orderType === 'mart' && <View style={[styles.badge, { backgroundColor: '#E8F5E9' }]}><Text style={[styles.badgeTxt, { color: '#2E7D32' }]}>🛒</Text></View>}
                    <Text style={styles.earnings}>Rs {order.total}</Text>
                  </View>
                  <Text style={styles.cardAddr} numberOfLines={1}>📍 {order.address?.streetAddress || 'Local Area'}</Text>
                  <Text style={styles.distanceTxt}>🚚 {order.deliveryDistanceKm || '?'} km · {order.items?.length || 0} items</Text>
                  {order.orderType === 'food' && order.subOrders?.length > 1 && (
                    <Text style={styles.batchBadge}>👨‍🍳 Batched ({order.subOrders.length} restaurants)</Text>
                  )}
                  <View style={styles.cardCTA}>
                    <Text style={styles.cardCTATxt}>View Details →</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* ── New Order Incoming Modal ─────────────── */}
      {sheetVisible && incomingOrder && (
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={{ flex: 1 }} onPress={dismissIncoming} />
          <Animated.View style={[styles.newOrderSheet, { transform: [{ translateY: sheetY }] }]}>
            <View style={styles.sheetPulse}>
              <Text style={styles.sheetPulseTxt}>🔔 NEW ORDER!</Text>
            </View>
            <Text style={styles.sheetOrderId}>#{(incomingOrder?.id || '').slice(0, 8).toUpperCase()}</Text>
            <View style={styles.sheetRow}>
              <View style={styles.sheetStat}>
                <Text style={styles.sheetStatVal}>Rs {incomingOrder.total}</Text>
                <Text style={styles.sheetStatLabel}>Earnings</Text>
              </View>
              <View style={styles.sheetStat}>
                <Text style={styles.sheetStatVal}>{incomingOrder.deliveryDistanceKm || '?'} km</Text>
                <Text style={styles.sheetStatLabel}>Distance</Text>
              </View>
              <View style={styles.sheetStat}>
                <Text style={styles.sheetStatVal}>{incomingOrder.items?.length || 0}</Text>
                <Text style={styles.sheetStatLabel}>Items</Text>
              </View>
            </View>
            <Text style={styles.sheetAddr} numberOfLines={2}>
              📍 {incomingOrder.address?.streetAddress || 'Local Area'}
            </Text>

            <SwipeToAccept onAccept={handleAcceptIncoming} label="Swipe to Accept Order" />

            <TouchableOpacity style={styles.declineBtn} onPress={dismissIncoming}>
              <Text style={styles.declineTxt}>Skip this order</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      )}

      {/* ── Mart Zone Modal ─────────────── */}
      <Modal visible={showMartModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.zoneModal}>
            <Text style={styles.modalTitle}>Select Delivery Zone</Text>
            <FlatList
              data={martLocations}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.zoneItem, selectedMart?.id === item.id && styles.zoneItemActive]}
                  onPress={() => handleSelectMart(item)}
                >
                  <Text style={[styles.zoneItemName, selectedMart?.id === item.id && { color: '#FF4500' }]}>{item.name}</Text>
                  <Text style={styles.zoneItemAddr}>{item.address}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={{ textAlign: 'center', color: '#888', marginTop: 20 }}>No zones available</Text>}
            />
            <TouchableOpacity onPress={() => setShowMartModal(false)} style={styles.closeZoneBtn}>
              <Text style={styles.closeZoneTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const sw = StyleSheet.create({
  track: {
    height: 60, backgroundColor: '#FF4500', borderRadius: 30, marginVertical: 15,
    paddingHorizontal: 4, justifyContent: 'center', position: 'relative',
  },
  labelWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  label: { color: '#fff', fontSize: 15, fontWeight: '700' },
  arrow: { color: 'rgba(255,255,255,0.6)', fontSize: 16, letterSpacing: 4 },
  thumb: {
    width: 52, height: 52, borderRadius: 26, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', elevation: 5,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4,
  },
  thumbIcon: { fontSize: 24 },
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },

  // Top HUD overlay
  topHud: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  topRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: 'rgba(20,20,20,0.88)',
  },
  greeting: { fontSize: 11, color: '#aaa', fontWeight: '600' },
  name: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginTop: 1 },
  approvalBar: { backgroundColor: '#B45309', paddingHorizontal: 20, paddingVertical: 8 },
  approvalBarTxt: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Stats pill
  statsPill: {
    position: 'absolute', left: 16, right: 16, top: 110, zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.97)', borderRadius: 18, flexDirection: 'row',
    padding: 12, elevation: 8, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statVal: { fontSize: 14, fontWeight: '800', color: '#1A1A1A', textAlign: 'center' },
  statLabel: { fontSize: 10, color: '#888', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#eee', marginHorizontal: 5 },

  // Bottom panel
  panel: {
    position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    maxHeight: SCREEN_H * 0.48, minHeight: 180,
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8,
    elevation: 20, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20,
  },
  panelHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 12 },

  offlineWrap: { alignItems: 'center', paddingVertical: 30 },
  offlineIcon: { fontSize: 40, marginBottom: 12 },
  offlineTxt: { color: '#888', fontSize: 15, textAlign: 'center' },

  sectionHdr: { fontSize: 14, fontWeight: '800', color: '#333', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },

  activeCard: {
    backgroundColor: '#FFF5F0', borderRadius: 14, padding: 16, marginBottom: 12,
    borderLeftWidth: 4, borderLeftColor: '#FF4500', flexDirection: 'row', alignItems: 'center',
  },

  pendingCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#EBEBEB', elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6,
  },

  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 6 },
  orderId: { fontSize: 13, fontWeight: 'bold', color: '#555' },
  earnings: { fontSize: 16, fontWeight: '800', color: '#27ae60', marginLeft: 'auto' },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 },
  badgeTxt: { fontSize: 9, fontWeight: '900', color: '#fff' },
  cardAddr: { fontSize: 13, color: '#666', marginBottom: 4 },
  distanceTxt: { fontSize: 12, color: '#FF4500', fontWeight: '700', marginBottom: 4 },
  batchBadge: { fontSize: 11, color: '#FF8C00', fontWeight: 'bold', marginTop: 2 },
  cardCTA: { marginTop: 8, alignSelf: 'flex-end', backgroundColor: '#FF4500', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  cardCTATxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingVertical: 20 },
  emptyIcon: { fontSize: 32, marginBottom: 8 },
  emptyTxt: { color: '#aaa', fontSize: 13, textAlign: 'center' },
  riderPin: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center', elevation: 5 },

  // Incoming order bottom sheet
  sheetOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100 },
  newOrderSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1A1A1A', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, paddingBottom: 40,
  },
  sheetPulse: { backgroundColor: '#FF4500', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 6, alignSelf: 'center', marginBottom: 12 },
  sheetPulseTxt: { color: '#fff', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
  sheetOrderId: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 16 },
  sheetRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  sheetStat: { alignItems: 'center' },
  sheetStatVal: { color: '#fff', fontSize: 20, fontWeight: '800' },
  sheetStatLabel: { color: '#888', fontSize: 11, marginTop: 2 },
  sheetAddr: { color: '#ccc', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  declineBtn: { alignSelf: 'center', marginTop: 6 },
  declineTxt: { color: '#666', fontSize: 13 },

  // Mart modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  zoneModal: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, minHeight: '50%' },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A', marginBottom: 16 },
  zoneItem: { padding: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  zoneItemActive: { backgroundColor: '#FFF5F0', borderRadius: 14 },
  zoneItemName: { fontSize: 15, fontWeight: '700', color: '#333' },
  zoneItemAddr: { fontSize: 12, color: '#888', marginTop: 3 },
  closeZoneBtn: { marginTop: 16, backgroundColor: '#F0F0F0', padding: 14, borderRadius: 14, alignItems: 'center' },
  closeZoneTxt: { fontWeight: 'bold', color: '#666' },

  offlineBanner: {
    position: 'absolute', top: 50, left: 16, right: 16, zIndex: 999,
    backgroundColor: '#EF4444', padding: 12, borderRadius: 12,
    alignItems: 'center', elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }
  },
  offlineText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
