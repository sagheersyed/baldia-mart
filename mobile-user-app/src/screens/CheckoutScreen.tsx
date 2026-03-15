import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { ordersApi, addressesApi } from '../api/api';
import AddressPickerModal from '../components/AddressPickerModal';

export default function CheckoutScreen({ navigation }: any) {
  const { cart, getCartTotal, clearCart } = useCart();
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [isLoadingFee, setIsLoadingFee] = useState(false);
  const [isAddressValid, setIsAddressValid] = useState(true);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      const res = await addressesApi.getAll();
      setAddresses(res.data);
      if (res.data.length > 0) {
        // If we have a selected address, try to keep it, otherwise pick default
        const currentId = selectedAddress?.id;
        const found = res.data.find((a: any) => a.id === currentId) || res.data.find((a: any) => a.isDefault) || res.data[0];
        setSelectedAddress(found);
      }
    } catch (error) {
      console.error('Failed to fetch addresses:', error);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  useEffect(() => {
    if (selectedAddress?.id) {
      fetchDeliveryFee(selectedAddress.id);
    }
  }, [selectedAddress]);

  const fetchDeliveryFee = async (addressId: string) => {
    setIsLoadingFee(true);
    try {
      const res = await ordersApi.getDeliveryFee(addressId);
      if (res.data.isValid === true) {
        setDeliveryFee(res.data.deliveryFee);
        setIsAddressValid(true);
      } else {
        setDeliveryFee(0);
        setIsAddressValid(false);
        Alert.alert('Out of Service Area', res.data.message || 'We do not deliver to this location yet.');
      }
    } catch (error) {
      console.error('Failed to fetch delivery fee:', error);
      setDeliveryFee(0);
      setIsAddressValid(true); // Don't block on network error
    } finally {
      setIsLoadingFee(false);
    }
  };

  const handleUpdateAddress = async (addrData: any) => {
    try {
      if (selectedAddress?.id) {
        await addressesApi.update(selectedAddress.id, { ...addrData, isDefault: true });
        await fetchAddresses();
        setShowAddressModal(false);
      } else {
        // Fallback for case where no address exists yet
        await addressesApi.create({ ...addrData, isDefault: true });
        await fetchAddresses();
        setShowAddressModal(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update address');
    }
  };
  
  const subtotal = getCartTotal();
  const total = subtotal + deliveryFee;

  const handlePlaceOrder = async () => {
    if (cart.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    if (!selectedAddress) {
      Alert.alert('Error', 'Please select a delivery address');
      return;
    }

    if (!isAddressValid) {
      Alert.alert('Error', 'Your address is outside our delivery zone. Please choose another address.');
      return;
    }

    setIsPlacingOrder(true);
    try {
      const orderData = {
        addressId: selectedAddress.id,
        paymentMethod: selectedPayment,
        notes: '', // Optional notes field
        items: cart.map(item => ({
          productId: item.id,
          quantity: item.quantity
        }))
      };

      const res = await ordersApi.checkout(orderData);
      
      if (res.data && res.data.id) {
        clearCart();
        navigation.replace('OrderTracking', { orderId: res.data.id });
      }
    } catch (error: any) {
      console.error('Checkout failed:', error);
      const msg = error.response?.data?.message || 'Failed to place order. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backCircle}>
          <Text style={styles.backBtn}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Review & Pay</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Delivery Details</Text>
        {isLoadingAddresses ? (
          <ActivityIndicator color="#FF4500" style={{ marginVertical: 20 }} />
        ) : selectedAddress ? (
          <TouchableOpacity style={styles.addressBox} onPress={() => setShowAddressModal(true)}>
            <View style={styles.addressIcon}>
               <Text style={{ fontSize: 20 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{selectedAddress.label || 'Home'}</Text>
              <Text style={styles.addressText}>{selectedAddress.streetAddress}</Text>
            </View>
            <Text style={styles.changeBtn}>Edit</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity 
            style={styles.addressBox}
            onPress={() => Alert.alert('Notice', 'Address selection coming soon. Using seeded address.')}
          >
            <Text style={{ color: '#666', textAlign: 'center', flex: 1 }}>No address found. Please add one.</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Payment Method</Text>
        <TouchableOpacity 
          style={[styles.paymentBox, selectedPayment === 'cod' && styles.paymentSelected]}
          onPress={() => setSelectedPayment('cod')}
        >
          <View style={styles.paymentRow}>
             <View style={[styles.radio, selectedPayment === 'cod' && styles.radioActive]} />
             <Text style={styles.paymentText}>Cash on Delivery (COD)</Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.paymentBox, selectedPayment === 'card' && styles.paymentSelected]}
          onPress={() => setSelectedPayment('card')}
        >
          <View style={styles.paymentRow}>
             <View style={[styles.radio, selectedPayment === 'card' && styles.radioActive]} />
             <Text style={styles.paymentText}>Credit/Debit Card (Stripe)</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.summaryContainer}>
           <Text style={styles.sectionTitle}>Order Summary</Text>
           <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryVal}>Rs. {(Number(subtotal) || 0).toFixed(0)}</Text>
           </View>
           <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              {isLoadingFee ? (
                <ActivityIndicator size="small" color="#FF4500" />
              ) : !isAddressValid ? (
                <Text style={[styles.summaryVal, { color: '#ff0000' }]}>Unavailable</Text>
              ) : (
                <Text style={styles.summaryVal}>Rs. {(Number(deliveryFee) || 0).toFixed(0)}</Text>
              )}
           </View>
           <View style={[styles.summaryRow, styles.totalPadding]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalVal}>Rs. {(Number(total) || 0).toFixed(0)}</Text>
           </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity 
          style={[
            styles.placeOrderBtn, 
            (isPlacingOrder || !isAddressValid || isLoadingFee) && styles.disabledBtn
          ]} 
          onPress={handlePlaceOrder}
          disabled={isPlacingOrder || !isAddressValid || isLoadingFee}
        >
          {isPlacingOrder ? (
            <ActivityIndicator color="#fff" />
          ) : !isAddressValid ? (
            <Text style={styles.placeOrderText}>Out of Service Area</Text>
          ) : (
            <Text style={styles.placeOrderText}>Confirm Order - Rs. {(Number(total) || 0).toFixed(0)}</Text>
          )}
        </TouchableOpacity>
      </View>

      <AddressPickerModal
        visible={showAddressModal}
        onClose={() => setShowAddressModal(false)}
        onSave={handleUpdateAddress}
        initialData={selectedAddress}
        title="Update Delivery Address"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  backCircle: { width: 40, height: 40, backgroundColor: '#f5f5f5', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  backBtn: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  content: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '900', marginBottom: 15, color: '#333', letterSpacing: 0.5 },
  addressBox: { backgroundColor: '#fff', padding: 18, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  addressIcon: { width: 45, height: 45, backgroundColor: '#FFF5F0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  addressLabel: { fontWeight: 'bold', fontSize: 15, color: '#1a1a1a', marginBottom: 2 },
  addressText: { color: '#888', fontSize: 13 },
  changeBtn: { color: '#FF4500', fontWeight: 'bold', borderLeftWidth: 1, borderLeftColor: '#eee', paddingLeft: 15 },
  paymentBox: { backgroundColor: '#fff', padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 1, borderColor: '#eee' },
  paymentSelected: { borderColor: '#FF4500', backgroundColor: '#FFF9F7' },
  paymentRow: { flexDirection: 'row', alignItems: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: '#ddd', marginRight: 15 },
  radioActive: { borderColor: '#FF4500', borderWidth: 6 },
  paymentText: { fontWeight: '700', fontSize: 15, color: '#333' },
  summaryContainer: { marginTop: 10, backgroundColor: '#fff', padding: 20, borderRadius: 25, marginBottom: 30 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: '#888', fontWeight: '500' },
  summaryVal: { fontWeight: '700', color: '#1a1a1a' },
  totalPadding: { borderTopWidth: 1, borderTopColor: '#f1f1f1', marginTop: 10, paddingTop: 15 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  totalVal: { fontSize: 22, fontWeight: '900', color: '#FF4500' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: 30 },
  placeOrderBtn: { backgroundColor: '#FF4500', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 10 },
  disabledBtn: { opacity: 0.7 },
  placeOrderText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

