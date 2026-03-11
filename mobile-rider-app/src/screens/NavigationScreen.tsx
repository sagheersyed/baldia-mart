import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Alert } from 'react-native';

export default function NavigationScreen({ navigation, route }: any) {
  const { orderId } = route.params || { orderId: 'Unknown' };
  const [status, setStatus] = useState('headed_to_store'); // headed_to_store, picked_up, out_for_delivery, delivered

  const handleUpdateStatus = () => {
    if (status === 'headed_to_store') {
      setStatus('picked_up');
    } else if (status === 'picked_up') {
      setStatus('out_for_delivery');
    } else if (status === 'out_for_delivery') {
      setStatus('delivered');
      Alert.alert('Success', 'Order delivered successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    }
  };

  const statusText = {
    headed_to_store: 'I have arrived at the store',
    picked_up: 'Order Picked Up',
    out_for_delivery: 'Mark as Delivered',
    delivered: 'Completed'
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Order #{orderId}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.mapContainer}>
        {/* Placeholder for react-native-maps <MapView> */}
        <View style={styles.mockMap}>
           <Text style={styles.mockMapText}>Google Maps Integration</Text>
           <Text style={styles.mockMapSub}>Routing from Store to Customer (Baldia Town)</Text>
        </View>
      </View>

      <View style={styles.bottomSheet}>
        <View style={styles.customerInfo}>
          <View style={styles.avatar} />
          <View style={styles.details}>
            <Text style={styles.name}>Customer Name</Text>
            <Text style={styles.address}>House 12, Street 4, Baldia</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
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
  header: { padding: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1E1E1E' },
  backBtn: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  title: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  mapContainer: { flex: 1, backgroundColor: '#e0e0e0' },
  mockMap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mockMapText: { fontSize: 20, fontWeight: 'bold', color: '#666' },
  mockMapSub: { fontSize: 14, color: '#888', marginTop: 10 },
  bottomSheet: { padding: 20, backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, elevation: 10, marginTop: -20 },
  customerInfo: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#f0f0f0', marginRight: 15 },
  details: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  address: { fontSize: 13, color: '#666' },
  callBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#e8f4fd', justifyContent: 'center', alignItems: 'center' },
  callIcon: { fontSize: 20 },
  statusBtn: { backgroundColor: '#FF4500', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  statusBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
