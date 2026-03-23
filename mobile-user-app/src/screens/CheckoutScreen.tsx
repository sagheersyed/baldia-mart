import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { ordersApi, addressesApi } from '../api/api';
import AddressPickerModal from '../components/AddressPickerModal';

export default function CheckoutScreen({ navigation, route }: any) {
  const mode = route.params?.mode || 'mart';
  const { martCart, foodCart, getCartTotal, clearCart } = useCart();
  const cart = mode === 'mart' ? martCart : foodCart;
  
  const [selectedPayment, setSelectedPayment] = useState('cod');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<any>(null);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Modals state
  const [showAddressListModal, setShowAddressListModal] = useState(false);
  const [showAddressPickerModal, setShowAddressPickerModal] = useState(false);
  const [editingAddressData, setEditingAddressData] = useState<any>(null);

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
      const restaurantId = mode === 'food' ? cart[0]?.restaurantId : undefined;
      fetchDeliveryFee(selectedAddress.id, restaurantId);
    }
  }, [selectedAddress, cart, mode]);

  const fetchDeliveryFee = async (addressId: string, restaurantId?: string) => {
    setIsLoadingFee(true);
    try {
      const res = await ordersApi.getDeliveryFee(addressId, restaurantId);
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
      setIsAddressValid(true);
    } finally {
      setIsLoadingFee(false);
    }
  };

  const handleUpdateAddress = async (addrData: any) => {
    try {
      if (editingAddressData?.id) {
        await addressesApi.update(editingAddressData.id, addrData);
      } else {
        await addressesApi.create({ ...addrData, isDefault: addresses.length === 0 });
      }
      await fetchAddresses();
      setShowAddressPickerModal(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to save address');
    }
  };

  const handleOpenEdit = (addr?: any) => {
    setEditingAddressData(addr || null);
    setShowAddressListModal(false);
    setTimeout(() => {
      setShowAddressPickerModal(true);
    }, 300);
  };

  const handleSelectAddress = (addr: any) => {
    setSelectedAddress(addr);
    setShowAddressListModal(false);
  };

  const subtotal = getCartTotal(mode);
  
  // Calculate multi-stop surcharge for food orders
  const uniqueRestaurants = mode === 'food' 
    ? [...new Set(cart.map((item: any) => item.restaurantId).filter(Boolean))] 
    : [];
  const multiStopCount = uniqueRestaurants.length > 1 ? uniqueRestaurants.length - 1 : 0;
  const multiStopSurcharge = multiStopCount * 50;
  
  const total = subtotal + deliveryFee + multiStopSurcharge;

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
      const restaurantId = mode === 'food' ? cart[0]?.restaurantId : undefined;
      
      const orderData = {
        addressId: selectedAddress.id,
        paymentMethod: selectedPayment,
        orderType: mode, // Identifies if it's a Mart or Food order
        restaurantId,
        notes: '',
        items: cart.map(item => ({
          [mode === 'food' ? 'menuItemId' : 'productId']: item.id,
          quantity: item.quantity
        }))
      };

      const res = await ordersApi.checkout(orderData);

      if (res.data && res.data.id) {
        clearCart(mode);
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
          <TouchableOpacity style={styles.addressBox} onPress={() => setShowAddressListModal(true)}>
            <View style={styles.addressIcon}>
              <Text style={{ fontSize: 20 }}>🏠</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.addressLabel}>{selectedAddress.label || 'Home'}</Text>
              <Text style={styles.addressText}>{selectedAddress.streetAddress}</Text>
            </View>
            <Text style={styles.changeBtn}>Change</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.addressBox}
            onPress={() => handleOpenEdit()}
          >
            <View style={[styles.addressIcon, { backgroundColor: '#f0f0f0' }]}>
              <Text style={{ fontSize: 20 }}>📍</Text>
            </View>
            <Text style={{ color: '#1a1a1a', fontWeight: 'bold', flex: 1 }}>No address found. Add one now.</Text>
            <Text style={styles.changeBtn}>Add</Text>
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

        {/* <TouchableOpacity 
          style={[styles.paymentBox, selectedPayment === 'card' && styles.paymentSelected]}
          onPress={() => setSelectedPayment('card')}
        >
          <View style={styles.paymentRow}>
             <View style={[styles.radio, selectedPayment === 'card' && styles.radioActive]} />
             <Text style={styles.paymentText}>Credit/Debit Card (Stripe)</Text>
          </View>
        </TouchableOpacity> */}

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
          {multiStopSurcharge > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: '#FF4500' }]}>Batch Routing ({multiStopCount} extra stop{multiStopCount > 1 ? 's' : ''})</Text>
              <Text style={[styles.summaryVal, { color: '#FF4500' }]}>Rs. {multiStopSurcharge}</Text>
            </View>
          )}
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

      {/* Address Selection Modal */}
      {showAddressListModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.addressListContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Saved Addresses</Text>
              <TouchableOpacity onPress={() => setShowAddressListModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.addressListScroll} showsVerticalScrollIndicator={false}>
              {addresses.map((addr) => (
                <View key={addr.id} style={[styles.addressItem, selectedAddress?.id === addr.id && styles.addressItemSelected]}>
                  <TouchableOpacity style={styles.addressItemInfo} onPress={() => handleSelectAddress(addr)}>
                    <View style={styles.addressIconItem}>
                      <Text style={{ fontSize: 16 }}>{addr.label === 'Work' ? '🏢' : '🏠'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addressItemLabel}>{addr.label || 'Other'}</Text>
                      <Text style={styles.addressItemText} numberOfLines={2}>{addr.streetAddress}</Text>
                    </View>
                    {selectedAddress?.id === addr.id && (
                      <View style={styles.selectedCircle}>
                        <Text style={{ color: '#fff', fontSize: 12, fontWeight: 'bold' }}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.editAddressBtn} onPress={() => handleOpenEdit(addr)}>
                    <Text style={styles.editAddressBtnText}>Edit</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.addNewAddressBtn} onPress={() => handleOpenEdit()}>
              <Text style={styles.addNewAddressText}>+ Add New Address</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Actual Address Map/Form Modal */}
      <AddressPickerModal
        visible={showAddressPickerModal}
        onClose={() => setShowAddressPickerModal(false)}
        onSave={handleUpdateAddress}
        initialData={editingAddressData}
        title={editingAddressData ? "Edit Address" : "Add New Address"}
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
  placeOrderText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  // Modal Styles
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 100 },
  addressListContainer: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, maxHeight: '80%', paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: '#1a1a1a' },
  closeBtn: { width: 36, height: 36, backgroundColor: '#f0f0f0', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  closeBtnText: { fontSize: 16, fontWeight: 'bold', color: '#666' },
  addressListScroll: { maxHeight: 400 },
  addressItem: { flexDirection: 'row', flexWrap: 'nowrap', backgroundColor: '#f9f9f9', borderRadius: 20, marginBottom: 15, paddingRight: 15, borderBottomWidth: 0, borderWidth: 1, borderColor: '#f0f0f0' },
  addressItemSelected: { borderColor: '#FF4500', backgroundColor: '#FFF5F0' },
  addressItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 15 },
  addressIconItem: { width: 36, height: 36, backgroundColor: '#fff', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 15, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  addressItemLabel: { fontWeight: 'bold', fontSize: 15, color: '#1a1a1a', marginBottom: 2 },
  addressItemText: { color: '#888', fontSize: 12, paddingRight: 10 },
  selectedCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center' },
  editAddressBtn: { paddingVertical: 15, paddingLeft: 10, justifyContent: 'center', alignItems: 'center', borderLeftWidth: 1, borderLeftColor: '#f0f0f0' },
  editAddressBtnText: { color: '#FF4500', fontWeight: 'bold', fontSize: 13 },
  addNewAddressBtn: { marginTop: 10, backgroundColor: '#fff', borderWidth: 2, borderStyle: 'dashed', borderColor: '#ccc', borderRadius: 20, padding: 18, alignItems: 'center' },
  addNewAddressText: { color: '#666', fontWeight: 'bold', fontSize: 15 }
});

