import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCart } from '../context/CartContext';

export default function CartScreen({ navigation }: any) {
  const { cart, updateQuantity, removeFromCart, getCartTotal } = useCart();
  
  const subtotal = getCartTotal();
  const deliveryFee = subtotal > 0 ? 2.00 : 0;
  const total = subtotal + deliveryFee;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Cart</Text>
      </View>

      {cart.length > 0 ? (
        <>
          <ScrollView style={styles.list}>
            {cart.map(item => (
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
                  <Text style={styles.itemPrice}>${(Number(item.price) || 0).toFixed(2)}</Text>
                </View>
                <View style={styles.qtyBox}>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity - 1)}>
                    <Text style={styles.qtyBtn}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity onPress={() => updateQuantity(item.id, item.quantity + 1)}>
                    <Text style={styles.qtyBtn}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <View style={styles.summaryBox}>
               <View style={styles.row}>
                 <Text style={styles.summaryLabel}>Subtotal</Text>
                 <Text style={styles.summaryVal}>${(Number(subtotal) || 0).toFixed(2)}</Text>
               </View>
               <View style={styles.row}>
                 <Text style={styles.summaryLabel}>Delivery Fee</Text>
                 <Text style={styles.summaryVal}>${(Number(deliveryFee) || 0).toFixed(2)}</Text>
               </View>
               <View style={[styles.row, styles.totalRow]}>
                 <Text style={styles.totalLabel}>Total</Text>
                 <Text style={styles.totalVal}>${(Number(total) || 0).toFixed(2)}</Text>
               </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity 
              style={styles.checkoutBtn}
              onPress={() => navigation.navigate('Checkout')}
            >
              <Text style={styles.checkoutText}>Proceed to Checkout (${(Number(total) || 0).toFixed(2)})</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
             <Text style={{ fontSize: 50 }}>🛒</Text>
          </View>
          <Text style={styles.emptyText}>Your cart is empty.</Text>
          <TouchableOpacity 
            style={styles.browseBtn} 
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={styles.browseBtnText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  header: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#1a1a1a' },
  list: { flex: 1, padding: 20 },
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
  summaryBox: { backgroundColor: '#fff', padding: 20, borderRadius: 25, marginTop: 10, borderWidth: 1, borderColor: '#f1f1f1' },
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

