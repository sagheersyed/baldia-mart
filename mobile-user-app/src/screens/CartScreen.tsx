import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';
import { settingsApi, addressesApi, ordersApi } from '../api/api';

export default function CartScreen({ navigation, route }: any) {
  const { martCart, foodCart, updateQuantity, removeFromCart, getCartTotal, activeMode: contextMode, setActiveMode } = useCart();
  
  // Use mode from params if available, otherwise fallback to context, then default 'mart'
  const mode = route.params?.mode || contextMode || 'mart';
  const cart = mode === 'mart' ? martCart : foodCart;

  React.useEffect(() => {
    if (route.params?.mode && route.params.mode !== contextMode) {
      setActiveMode(route.params.mode);
    }
  }, [route.params?.mode]);

  const [deliveryFee, setDeliveryFee] = React.useState(0);
  const [isLoadingFee, setIsLoadingFee] = React.useState(false);
  const [isValidAddress, setIsValidAddress] = React.useState(true);

  React.useEffect(() => {
    fetchInitialData();
  }, [cart.length]);

  const fetchInitialData = async () => {
    if (cart.length === 0) return;

    setIsLoadingFee(true);
    try {
      const addrRes = await addressesApi.getAll();
      const defaultAddr = addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0];

      if (defaultAddr) {
        const restaurantId = mode === 'food' ? cart[0]?.restaurantId : undefined;
        const feeRes = await ordersApi.getDeliveryFee(defaultAddr.id, restaurantId);
        if (feeRes.data.isValid) {
          setDeliveryFee(Number(feeRes.data.deliveryFee) || 0);
          setIsValidAddress(true);
        } else {
          setDeliveryFee(0);
          setIsValidAddress(false);
        }
      } else {
        const settingsRes = await settingsApi.getPublicSettings();
        setDeliveryFee(Number(settingsRes.data.delivery_base_fee) || 150);
        setIsValidAddress(true);
      }
    } catch (error) {
      console.error('Failed to fetch initial pricing data:', error);
      setDeliveryFee(150);
      setIsValidAddress(true);
    } finally {
      setIsLoadingFee(false);
    }
  };

  const groupedCart = React.useMemo(() => {
    if (mode === 'mart') {
      return { mart: { name: 'Baldia Mart', items: cart } };
    }
    return cart.reduce((acc: any, item: any) => {
      const rid = item.restaurantId || 'unknown';
      if (!acc[rid]) acc[rid] = { 
        name: item.restaurantName || item.restaurant?.name || 'Restaurant', 
        items: [],
        maxPrep: 0
      };
      acc[rid].items.push(item);
      if ((item.prepTimeMinutes || 0) > acc[rid].maxPrep) {
        acc[rid].maxPrep = item.prepTimeMinutes;
      }
      return acc;
    }, {});
  }, [cart, mode]);

  const subtotal = getCartTotal(mode);
  const total = subtotal + (subtotal > 0 ? deliveryFee : 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{mode === 'mart' ? 'Mart' : 'Food'} Cart</Text>
      </View>

      {cart.length > 0 ? (
        <>
          <ScrollView style={styles.list}>
            {Object.keys(groupedCart).map((key) => {
              const group = groupedCart[key];
              return (
                <View key={key} style={styles.groupContainer}>
                  {mode === 'food' && (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <Text style={styles.groupHeader}>👨‍🍳 {group.name}</Text>
                      {group.maxPrep > 0 && (
                        <View style={{ backgroundColor: '#FFF5F0', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                          <Text style={{ fontSize: 12, color: '#FF4500', fontWeight: 'bold' }}>⏳ ~{group.maxPrep} mins</Text>
                        </View>
                      )}
                    </View>
                  )}
                  {group.items.map(item => (
                    <View key={item.id} style={styles.cartItem}>
                      <View style={styles.itemImageContainer}>
                        {item.imageUrl ? (
                          <Image source={{ uri: item.imageUrl }} style={styles.fullImage} />
                        ) : (
                          <View style={styles.itemPlaceholder} />
                        )}
                      </View>
                      <View style={styles.itemDetails}>
                        <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.itemPrice}>Rs. {(Number(item.price) || 0).toFixed(0)}</Text>
                      </View>
                      <View style={styles.qtyBox}>
                        <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1, mode)}>
                          <Text style={styles.qtyBtn}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.quantity}</Text>
                        <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1, mode)}>
                          <Text style={styles.qtyBtn}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              );
            })}

            <View style={styles.summaryBox}>
              <View style={styles.row}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryVal}>Rs. {(Number(subtotal) || 0).toFixed(0)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.summaryLabel}>Delivery Fee</Text>
                {isLoadingFee ? (
                  <ActivityIndicator size="small" color="#FF4500" />
                ) : !isValidAddress ? (
                  <Text style={[styles.summaryVal, { color: '#ff0000' }]}>Unavailable</Text>
                ) : (
                  <Text style={styles.summaryVal}>Rs. {(Number(deliveryFee) || 0).toFixed(0)}</Text>
                )}
              </View>
              <View style={[styles.row, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalVal}>
                  {!isValidAddress ? 'N/A' : `Rs. ${(Number(total) || 0).toFixed(0)}`}
                </Text>
              </View>
              {!isValidAddress && (
                <Text style={{ color: '#ff0000', fontSize: 12, fontWeight: 'bold', marginTop: 5, textAlign: 'center' }}>
                  Selected address is outside our delivery zone.
                </Text>
              )}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('Checkout', { mode })}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout (Rs. {(Number(total) || 0).toFixed(0)})</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <Text style={{ fontSize: 50 }}>{mode === 'mart' ? '🛒' : '🍔'}</Text>
          </View>
          <Text style={styles.emptyText}>Your {mode} cart is empty.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate(mode === 'mart' ? 'Home' : 'Food')}
          >
            <Text style={styles.browseBtnText}>Browse {mode === 'mart' ? 'Products' : 'Restaurants'}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9', marginBottom: 35 },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  list: { flex: 1, padding: 20 },
  groupContainer: { marginBottom: 10 },
  groupHeader: { fontSize: 16, fontWeight: 'bold', color: '#FF4500', marginBottom: 10, marginLeft: 5 },
  cartItem: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 20, marginBottom: 15, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5 },
  itemImageContainer: { width: 70, height: 70, borderRadius: 15, overflow: 'hidden', marginRight: 15, backgroundColor: '#f9f9f9' },
  itemPlaceholder: { flex: 1, backgroundColor: '#eee' },
  fullImage: { width: '100%', height: '100%' },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  itemPrice: { fontSize: 14, color: '#FF4500', fontWeight: '900' },
  qtyBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F0', borderRadius: 12, padding: 4, borderWidth: 1, borderColor: '#FFE4D1' },
  qtyBtn: { fontSize: 20, color: '#FF4500', paddingHorizontal: 12, fontWeight: 'bold' },
  qtyText: { fontSize: 16, fontWeight: '900', color: '#1a1a1a', marginHorizontal: 2 },
  summaryBox: { backgroundColor: '#fff', padding: 20, borderRadius: 25, marginTop: 10, borderWidth: 1, borderColor: '#f1f1f1', marginBottom: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  summaryLabel: { color: '#666', fontWeight: '500' },
  summaryVal: { fontWeight: '700', color: '#1a1a1a' },
  totalRow: { borderTopWidth: 1, borderTopColor: '#f1f1f1', marginTop: 10, paddingTop: 15 },
  totalLabel: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  totalVal: { fontSize: 20, fontWeight: '900', color: '#FF4500' },
  footer: { padding: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingBottom: 30 },
  checkoutBtn: { backgroundColor: '#FF4500', height: 60, borderRadius: 20, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: '#FF4500', shadowOpacity: 0.3, shadowRadius: 10 },
  checkoutText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIcon: { marginBottom: 20, opacity: 0.5 },
  emptyText: { color: '#999', fontSize: 18, fontWeight: 'bold', marginBottom: 20 },
  browseBtn: { paddingHorizontal: 30, paddingVertical: 15, backgroundColor: '#fff', borderRadius: 15, borderWidth: 1, borderColor: '#FF4500' },
  browseBtnText: { color: '#FF4500', fontWeight: 'bold' }
});

