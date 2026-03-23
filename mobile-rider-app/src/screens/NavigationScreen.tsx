import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, ScrollView, Linking, Platform, Vibration } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ordersApi, socket } from '../api/api';

// Default fallback mart location (Baldia Town)
const DEFAULT_MART_COORDS = { latitude: 24.91522600, longitude: 66.96431980 };

export default function NavigationScreen({ navigation, route }: any) {
  const { orderId } = route.params || { orderId: 'Unknown' };
  const [status, setStatus] = useState('confirmed');
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any>(null);
  const [userLocation, setUserLocation] = useState<any>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const [orderRes, { status: locStatus }] = await Promise.all([
          ordersApi.getById(orderId),
          Location.requestForegroundPermissionsAsync()
        ]);

        if (orderRes.data) {
          setOrder(orderRes.data);
          setStatus(orderRes.data.status);

          if (orderRes.data.status === 'cancelled') {
            Alert.alert('Order Cancelled', 'This order was cancelled by the customer.');
            navigation.replace('Main');
            return;
          }
        }

        if (locStatus === 'granted') {
          setPermissionGranted(true);
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location.coords);

          Location.watchPositionAsync(
            { accuracy: Location.Accuracy.High, distanceInterval: 10 },
            (newLoc) => setUserLocation(newLoc.coords)
          );
        }
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();

    socket.connect();
    socket.emit('joinOrder', orderId);

    const onStatusUpdate = (data: any) => {
      if (data.orderId === orderId && data.status === 'cancelled') {
        Vibration.vibrate([100, 500, 100, 500, 100, 500]);
        Alert.alert(
          'Order Cancelled 🛑',
          'The customer has cancelled this order. Please return to the dashboard.',
          [{ text: 'OK', onPress: () => navigation.replace('Main') }]
        );
      }
    };

    const onOrderUpdated = (data: any) => {
      if (data.orderId === orderId) {
        ordersApi.getById(orderId).then(res => {
          if (res.data) {
            setOrder(res.data);
            setStatus(res.data.status);
          }
        });
      }
    };

    socket.on('orderStatusUpdated', onStatusUpdate);
    socket.on('orderUpdated', onOrderUpdated);

    return () => {
      socket.off('orderStatusUpdated', onStatusUpdate);
      socket.off('orderUpdated', onOrderUpdated);
    };
  }, [orderId]);

  const handleUpdateStatus = async () => {
    const isFoodOrder = order?.orderType === 'food';
    let nextStatus = '';
    if (status === 'confirmed') nextStatus = 'preparing';
    else if (status === 'preparing') nextStatus = 'out_for_delivery';
    else if (status === 'out_for_delivery') nextStatus = 'delivered';

    if (nextStatus) {
      try {
        await ordersApi.updateStatus(orderId, nextStatus);
        setStatus(nextStatus);
        if (nextStatus === 'delivered') {
          Alert.alert('✅ Delivered!', 'Order delivered successfully.', [{ text: 'OK', onPress: () => navigation.replace('Main') }]);
        }
      } catch (e) {
        Alert.alert('Error', 'Could not update order status. Please try again.');
      }
    }
  };

  const handlePickUpSubOrder = async (subOrderId: string) => {
    try {
      await ordersApi.updateSubOrderStatus(subOrderId, 'picked_up');
      // Refresh order
      const res = await ordersApi.getById(orderId);
      if (res.data) {
        setOrder(res.data);
        setStatus(res.data.status);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to update sub-order status.');
    }
  };

  const openInExternalMaps = () => {
    const isPickupPhase = status === 'confirmed' || status === 'preparing';
    
    if (Platform.OS === 'android') {
      // Use Google Maps multi-stop directions
      const origin = userLocation ? `${userLocation.latitude},${userLocation.longitude}` : '';
      const destination = `${customerCoords.latitude},${customerCoords.longitude}`;
      const waypoints = pickupLocations.map(l => `${l.coords.latitude},${l.coords.longitude}`).join('|');
      
      const url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&waypoints=${waypoints}&travelmode=two_wheeler`;
      Linking.openURL(url);
    } else {
      // iOS Fallback (First Stop)
      const dest = isPickupPhase ? (pickupLocations[0]?.coords || DEFAULT_MART_COORDS) : customerCoords;
      const label = isPickupPhase ? (pickupLocations[0]?.name || pickupLabel) : 'Customer Location';
      const url = `maps:0,0?q=${label}@${dest.latitude},${dest.longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#FF4500" /></View>;
  }

  const isFood = order?.orderType === 'food';
  const hasSubOrders = isFood && order?.subOrders && order.subOrders.length > 0;

  // ── Dynamic pickup coordinates ──
  const pickupLocations: any[] = [];
  if (hasSubOrders) {
     order.subOrders.forEach((sub: any) => {
        if (sub.restaurant?.latitude && sub.restaurant?.longitude) {
           pickupLocations.push({
               id: sub.restaurant.id,
               name: sub.restaurant.name,
               description: sub.restaurant.location,
               coords: { latitude: Number(sub.restaurant.latitude), longitude: Number(sub.restaurant.longitude) }
           });
        }
     });
  } else if (isFood && order?.restaurant?.latitude) {
     pickupLocations.push({
         id: order.restaurant.id,
         name: order.restaurant.name,
         description: order.restaurant.location,
         coords: { latitude: Number(order.restaurant.latitude), longitude: Number(order.restaurant.longitude) }
     });
  } else if (!isFood) {
     pickupLocations.push({
         id: 'mart',
         name: 'Baldia Mart',
         description: 'Mart pickup point',
         coords: DEFAULT_MART_COORDS
     });
  }

  const pickupLabel = pickupLocations.length > 1 
      ? `Batch: ${pickupLocations.length} Stops` 
      : (pickupLocations[0]?.name || 'Pickup Point');

  const pickupDescription = pickupLocations.length > 1
      ? 'Multi-restaurant delivery route'
      : (pickupLocations[0]?.description || '');

  const customerCoords = {
    latitude: Number(order?.address?.latitude || 24.9144),
    longitude: Number(order?.address?.longitude || 66.9748)
  };

  const isPickupPhase = status === 'confirmed' || status === 'preparing';

  const statusText: Record<string, string> = {
    pending: isFood ? '📦 Confirm Food Order' : '📦 Confirm Order',
    confirmed: isFood ? '🍽️ Arrived at Restaurant' : '🏪 Arrived at Mart',
    preparing: isFood ? '✅ Food Ready — Pick Up Now' : '✅ Order Packed — Pick Up Now',
    out_for_delivery: '🚴 Mark as Delivered',
    delivered: '✅ Completed',
  };

  const mapRegion = {
    latitude: isPickupPhase ? (pickupLocations[0]?.coords.latitude || DEFAULT_MART_COORDS.latitude) : customerCoords.latitude,
    longitude: isPickupPhase ? (pickupLocations[0]?.coords.longitude || DEFAULT_MART_COORDS.longitude) : customerCoords.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Order #{orderId.slice(0, 8).toUpperCase()}</Text>
          <View style={styles.orderTypeBadge}>
            <Text style={styles.orderTypeTxt}>{isFood ? '🍽️ Food Order' : '🛒 Mart Order'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={openInExternalMaps} style={styles.navIconBtn}>
          <Text style={{ fontSize: 20 }}>🧭</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView style={styles.map} region={mapRegion} showsUserLocation showsMyLocationButton>
          {/* Pickup Point(s) — Restaurants or Mart */}
          {pickupLocations.map((loc, idx) => (
            <Marker
              key={`pickup-${idx}`}
              coordinate={loc.coords}
              title={pickupLocations.length > 1 ? `[Stop ${idx + 1}] ${loc.name}` : loc.name}
              description={loc.description}
              pinColor="#FF4500"
            />
          ))}

          {/* Customer delivery location */}
          <Marker
            coordinate={customerCoords}
            title="Customer"
            description={order?.address?.streetAddress}
            pinColor="#2ecc71"
          />

          {/* Route line connecting all pickups to customer */}
          <Polyline
            coordinates={[...pickupLocations.map(l => l.coords), customerCoords]}
            strokeColor="#FF4500"
            strokeWidth={3}
            lineDashPattern={[5, 5]}
          />
        </MapView>

        {/* Order Items Checklist */}
        {order?.items && order.items.length > 0 && status !== 'out_for_delivery' && (
          <View style={styles.itemsOverlay}>
            <Text style={styles.itemsTitle}>
              {isFood ? '🍽️ Pickup Checklist' : '📦 Items'} ({order.items.length})
            </Text>
            <ScrollView style={styles.itemsList}>
              {Object.entries(
                order.items.reduce((acc: any, item: any) => {
                  const sub = order.subOrders?.find((s: any) => s.id === item.subOrderId);
                  const gName = (order.orderType === 'food' || item.menuItem) 
                    ? (sub?.restaurant?.name || item.menuItem?.restaurant?.name || order.restaurant?.name || 'Restaurant')
                    : 'Baldia Mart';
                  if (!acc[gName]) acc[gName] = { items: [], subOrderId: item.subOrderId, status: sub?.status };
                  acc[gName].items.push(item);
                  return acc;
                }, {})
              ).map(([gName, group]: [any, any], gIdx) => (
                <View key={gIdx} style={{ marginBottom: 15 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#FF4500', textTransform: 'uppercase' }}>{gName}</Text>
                    {group.subOrderId && group.status !== 'picked_up' && group.status !== 'delivered' && (
                       <TouchableOpacity 
                         onPress={() => handlePickUpSubOrder(group.subOrderId)}
                         style={{ backgroundColor: '#FF4500', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 }}
                       >
                         <Text style={{ color: '#fff', fontSize: 9, fontWeight: 'black' }}>PICK UP</Text>
                       </TouchableOpacity>
                    )}
                    {group.status === 'picked_up' && (
                       <View style={{ backgroundColor: '#2ecc7120', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                         <Text style={{ color: '#27ae60', fontSize: 9, fontWeight: 'black' }}>✅ PICKED</Text>
                       </View>
                    )}
                  </View>
                  {group.items.map((item: any, idx: number) => (
                    <View key={item.id || idx} style={styles.itemRow}>
                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.itemQty}>{item.quantity}x</Text>
                        <Text style={styles.itemName} numberOfLines={1}>{item.product?.name || item.menuItem?.name || 'Item'}</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.itemPrice}>Rs. {item.priceAtTime * item.quantity}</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total (COD)</Text>
                <Text style={styles.totalVal}>Rs. {order.total}</Text>
              </View>
            </ScrollView>
          </View>
        )}
      </View>

      {/* Bottom Sheet */}
      <View style={styles.bottomSheet}>
        {/* Pickup Info */}
        <View style={styles.pickupInfo}>
          <Text style={styles.pickupIcon}>{isFood ? '🍽️' : '🏪'}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.pickupLabel}>{isPickupPhase ? 'Pickup from' : 'Delivering to'}</Text>
            <Text style={styles.pickupName} numberOfLines={1}>
              {isPickupPhase ? pickupLabel : (order?.user?.name || 'Customer')}
            </Text>
            <Text style={styles.pickupAddr} numberOfLines={1}>
              {isPickupPhase ? pickupDescription : (order?.address?.streetAddress || '')}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              const phone = order?.user?.phoneNumber || order?.user?.phone;
              if (phone) Linking.openURL(`tel:${phone}`);
              else Alert.alert('Error', 'Customer phone not available');
            }}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.statusBtn, status === 'delivered' && { backgroundColor: '#2ecc71' }]}
          onPress={handleUpdateStatus}
          disabled={status === 'delivered'}
        >
          <Text style={styles.statusBtnText}>{statusText[status] || 'Update Status'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1E1E1E' },
  backBtn: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  orderTypeBadge: { backgroundColor: '#FF450020', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start', marginTop: 2 },
  orderTypeTxt: { fontSize: 11, fontWeight: '700', color: '#FF7A3D' },
  navIconBtn: { width: 40, height: 40, backgroundColor: '#2A2A2A', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },

  mapContainer: { flex: 1 },
  map: { flex: 1 },

  itemsOverlay: {
    position: 'absolute', top: 10, left: 10, right: 10, maxHeight: '40%',
    backgroundColor: 'rgba(255,255,255,0.96)', borderRadius: 15, padding: 15,
    borderWidth: 1, borderColor: '#eee', elevation: 5
  },
  itemsTitle: { fontSize: 14, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  itemsList: {},
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  itemQty: { fontSize: 14, fontWeight: '800', color: '#FF4500', width: 30 },
  itemName: { fontSize: 13, color: '#333', flex: 1 },
  itemPrice: { fontSize: 13, color: '#333', fontWeight: 'bold' },
  itemRate: { fontSize: 10, color: '#888' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { fontSize: 14, fontWeight: 'bold' },
  totalVal: { fontSize: 16, fontWeight: 'bold', color: '#2ecc71' },

  bottomSheet: {
    padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 15,
    position: 'absolute', bottom: 0, left: 0, right: 0
  },
  pickupInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 12 },
  pickupIcon: { fontSize: 28 },
  pickupLabel: { fontSize: 11, color: '#999', fontWeight: '600', marginBottom: 2 },
  pickupName: { fontSize: 15, fontWeight: '800', color: '#1A1A1A' },
  pickupAddr: { fontSize: 12, color: '#666', marginTop: 2 },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 20 },
  statusBtn: { backgroundColor: '#FF4500', height: 55, borderRadius: 14, justifyContent: 'center', alignItems: 'center', elevation: 4 },
  statusBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
});
