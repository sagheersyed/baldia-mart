import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert, ActivityIndicator, ScrollView, Linking, Platform, Vibration } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import * as Location from 'expo-location';
import { ordersApi, socket } from '../api/api';

const MART_COORDS = { latitude: 24.91522600, longitude: 66.96431980 };

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

    // Socket listeners for real-time cancellation
    socket.connect();
    socket.emit('joinOrder', orderId);

    const onStatusUpdate = (data: any) => {
      if (data.orderId === orderId && data.status === 'cancelled') {
        // Aggressive vibration pattern: wait 100ms, vibrate 500ms, repeat 3 times
        Vibration.vibrate([100, 500, 100, 500, 100, 500]);
        Alert.alert(
          'Order Cancelled 🛑',
          'The customer has cancelled this order. Please return to the dashboard.',
          [{ text: 'OK', onPress: () => navigation.replace('Main') }]
        );
      }
    };

    socket.on('orderStatusUpdated', onStatusUpdate);

    return () => {
      socket.off('orderStatusUpdated', onStatusUpdate);
    };
  }, [orderId]);

  const handleUpdateStatus = async () => {
    let nextStatus = '';
    if (status === 'confirmed') nextStatus = 'preparing';
    else if (status === 'preparing') nextStatus = 'out_for_delivery';
    else if (status === 'out_for_delivery') nextStatus = 'delivered';

    if (nextStatus) {
      try {
        await ordersApi.updateStatus(orderId, nextStatus);
        setStatus(nextStatus);
        if (nextStatus === 'delivered') {
          Alert.alert('Success', 'Order delivered successfully.', [{ text: 'OK', onPress: () => navigation.replace('Main') }]);
        }
        if (nextStatus === 'cancelled') {
          Alert.alert('Order Cancelled', 'This order was cancelled by the customer.');
          navigation.replace('Main');
        }
      } catch (e) {
        if (nextStatus === 'cancelled') {
          Alert.alert('Order Cancelled', 'This order was cancelled by the customer.');
          navigation.replace('Main');
        }
        Alert.alert('Order Cancelled', 'This order was cancelled by the customer.');
      }
    }
  };

  const openInExternalMaps = () => {
    const dest = status === 'confirmed' || status === 'preparing'
      ? MART_COORDS
      : { latitude: Number(order.address?.latitude), longitude: Number(order.address?.longitude) };

    const label = status === 'confirmed' || status === 'preparing' ? 'Baldia Mart' : 'Customer Location';
    const url = Platform.select({
      ios: `maps:0,0?q=${label}@${dest.latitude},${dest.longitude}`,
      android: `geo:0,0?q=${dest.latitude},${dest.longitude}(${label})`
    });

    if (url) Linking.openURL(url);
  };

  const statusText = {
    pending: 'Confirm Order arrival',
    confirmed: 'Arrived at Store',
    preparing: 'Order Prepared & Picked Up',
    out_for_delivery: 'Mark as Delivered',
    delivered: 'Completed'
  };

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#FF4500" /></View>;
  }

  const customerCoords = {
    latitude: Number(order?.address?.latitude || 24.9144),
    longitude: Number(order?.address?.longitude || 66.9748)
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order #{orderId.slice(0, 8).toUpperCase()}</Text>
        <TouchableOpacity onPress={openInExternalMaps} style={styles.navIconBtn}>
          <Text style={{ fontSize: 20 }}>🧭</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          initialRegion={{
            ...MART_COORDS,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
          showsUserLocation={true}
          showsMyLocationButton={true}
        >
          {/* Mart Marker */}
          <Marker
            coordinate={MART_COORDS}
            title="Baldia Mart"
            description="Pickup Point"
            pinColor="#FF4500"
          />

          {/* Customer Marker */}
          <Marker
            coordinate={customerCoords}
            title="Customer Dropoff"
            description={order?.address?.streetAddress}
            pinColor="#2ecc71"
          />

          {/* Line between if available */}
          {order?.address && (
            <Polyline
              coordinates={[MART_COORDS, customerCoords]}
              strokeColor="#FF4500"
              strokeWidth={3}
              lineDashPattern={[5, 5]}
            />
          )}
        </MapView>

        {order?.items && order.items.length > 0 && status !== 'out_for_delivery' && (
          <View style={styles.itemsOverlay}>
            <Text style={styles.itemsTitle}>Checklist ({order.items.length} Items)</Text>
            <ScrollView style={styles.itemsList}>
              {order.items.map((item: any) => (
                <View key={item.id} style={styles.itemRow}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.itemQty}>{item.quantity}x</Text>
                    <Text style={styles.itemName}>{item.product?.name || 'Item'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.itemPrice}>Rs. {item.priceAtTime * item.quantity}</Text>
                    <Text style={styles.itemRate}>Rs. {item.priceAtTime} each</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.customerInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{order?.user?.name?.[0] || 'C'}</Text>
          </View>
          <View style={styles.details}>
            <Text style={styles.name}>{order?.user?.name || 'Valued Customer'}</Text>
            <Text style={styles.address} numberOfLines={1}>{order?.address?.streetAddress || 'Baldia Town'}</Text>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => {
              const phone = order?.user?.phoneNumber || order?.user?.phone;
              if (phone) {
                Linking.openURL(`tel:${phone}`);
              } else {
                Alert.alert('Error', 'Customer phone number not available');
              }
            }}
          >
            <Text style={styles.callIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.statusBtn, status === 'delivered' && { backgroundColor: '#2ecc71' }]}
          onPress={handleUpdateStatus}
        >
          <Text style={styles.statusBtnText}>{statusText[status as keyof typeof statusText]}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { padding: 20, paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E1E' },
  backBtn: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  navIconBtn: { width: 40, height: 40, backgroundColor: '#2A2A2A', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  bottomSheet: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 15, position: 'absolute', bottom: 0, left: 0, right: 0 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FF450015', marginRight: 15, justifyContent: 'center', alignItems: 'center' },
  avatarText: { color: '#FF4500', fontWeight: 'bold' },
  details: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  address: { fontSize: 13, color: '#666' },
  callBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 20 },
  statusBtn: { backgroundColor: '#FF4500', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  itemsOverlay: {
    position: 'absolute', top: 10, left: 10, right: 10, maxHeight: '40%',
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 15, padding: 15,
    borderWidth: 1, borderColor: '#eee', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, elevation: 5
  },
  itemsTitle: { fontSize: 15, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 10 },
  itemsList: {},
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  itemQty: { fontSize: 14, fontWeight: '800', color: '#FF4500', width: 30 },
  itemName: { fontSize: 14, color: '#333' },
  itemPrice: { fontSize: 13, color: '#333', fontWeight: 'bold' },
  itemRate: { fontSize: 10, color: '#888' }
});
