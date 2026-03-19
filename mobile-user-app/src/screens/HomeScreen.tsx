import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoriesApi, productsApi, addressesApi } from '../api/api';
import { useCart } from '../context/CartContext';

// Memoized product card — only re-renders when its own props change,
// preventing image flicker when cart state updates.
const ProductCard = memo(({ prod, cartQty, onAdd }: { prod: any; cartQty: number; onAdd: (p: any) => void }) => {
  const stock = prod.stock ?? prod.stockQuantity ?? 1;
  const isOutOfStock = stock <= 0;
  return (
    <View style={styles.prodCard}>
      <View style={styles.prodImageContainer}>
        {prod.imageUrl ? (
          <Image source={{ uri: prod.imageUrl }} style={styles.fullImage} />
        ) : (
          <View style={styles.prodPlaceholder} />
        )}
        {cartQty > 0 && (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartQty}</Text>
          </View>
        )}
        {isOutOfStock && (
          <View style={styles.outOfStockOverlay}>
            <Text style={styles.outOfStockText}>Out of Stock</Text>
          </View>
        )}
      </View>
      <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
      <Text style={styles.prodCat}>{prod.category?.name}</Text>
      <View style={styles.priceRow}>
        <View>
          <Text style={styles.price}>Rs. {(Number(prod.price) - Number(prod.discount || 0)).toFixed(0)}</Text>
          {Number(prod.discount) > 0 && (
            <Text style={styles.oldPrice}>Rs. {Number(prod.price).toFixed(0)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addBtn, isOutOfStock && styles.addBtnDisabled]}
          onPress={() => onAdd(prod)}
          disabled={isOutOfStock}
        >
          <Text style={styles.addBtnText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const CategoryItem = memo(({ cat, isSelected, onPress }: { cat: any; isSelected: boolean; onPress: () => void }) => {
  return (
    <TouchableOpacity
      style={[styles.catCard, isSelected && styles.catCardActive]}
      onPress={onPress}
    >
      <View style={[styles.catImageContainer, isSelected && styles.catActiveBorder]}>
        {cat.imageUrl ? (
          <Image
            source={{ uri: cat.imageUrl }}
            style={styles.fullImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.catPlaceholder} />
        )}
      </View>
      <Text style={styles.catText} numberOfLines={1}>{cat.name}</Text>
    </TouchableOpacity>
  );
});

export default function HomeScreen({ navigation }: any) {
  const { cart, addToCart, getCartCount } = useCart();
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState<any>(null);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const [catRes, prodRes, addrRes] = await Promise.all([
        categoriesApi.getAll(),
        productsApi.getAll(),
        addressesApi.getAll()
      ]);
      setCategories(catRes.data || []);
      setProducts(prodRes.data || []);
      if (addrRes.data && addrRes.data.length > 0) {
        setAddress(addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0]);
      }
    } catch (error) {
      console.error('Failed to load home data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Refresh address when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshAddress = async () => {
        try {
          const addrRes = await addressesApi.getAll();
          if (addrRes.data && addrRes.data.length > 0) {
            setAddress(addrRes.data.find((a: any) => a.isDefault) || addrRes.data[0]);
          } else {
            setAddress(null);
          }
        } catch (error) {
          console.error('Failed to refresh address on focus:', error);
        }
      };
      refreshAddress();
    }, [])
  );

  const handleAddToCart = (product: any) => {
    if ((product.stock ?? product.stockQuantity ?? 1) <= 0) return;
    addToCart(product);
  };

  const filteredProducts = selectedCategoryId
    ? products.filter(p => p.categoryId === selectedCategoryId)
    : products;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={styles.loaderText}>Loading Baldia Mart...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.locationBox} onPress={loadData}>
          <Text style={styles.deliveryText}>Delivering to</Text>
          <Text style={styles.locationText}>{address ? `${address.label}: ${address.streetAddress.substring(0, 20)}...` : 'Select Location'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartCount}>{getCartCount()}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />
        }
      >
        <View style={styles.banner}>
          <Text style={styles.bannerSmall}>Express Delivery</Text>
          <Text style={styles.bannerText}>Get items in 20 Mins!</Text>
        </View>

        <Text style={styles.sectionTitle}>Categories</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categories}>
          <CategoryItem
            cat={{
              id: 'all',
              name: 'All',
              imageUrl: "https://images.unsplash.com/photo-1542838132-92c53300491e?q=80&w=200"
            }}
            isSelected={!selectedCategoryId}
            onPress={() => setSelectedCategoryId(null)}
          />
          {categories.map(cat => (
            <CategoryItem
              key={cat.id}
              cat={cat}
              isSelected={selectedCategoryId === cat.id}
              onPress={() => setSelectedCategoryId(cat.id)}
            />
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Featured Products</Text>
        <View style={styles.productsGrid}>
          {filteredProducts.map(prod => {
            const cartItem = cart.find((c: any) => c.id === prod.id);
            const cartQty = cartItem ? cartItem.quantity : 0;
            return (
              <ProductCard
                key={prod.id}
                prod={prod}
                cartQty={cartQty}
                onAdd={handleAddToCart}
              />
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderText: { marginTop: 10, color: '#666', fontWeight: 'bold' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  locationBox: { flex: 1 },
  deliveryText: { fontSize: 12, color: '#666' },
  locationText: { fontSize: 15, fontWeight: 'bold', color: '#FF4500' },
  cartBtn: { width: 44, height: 44, backgroundColor: '#FFF5F0', borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#FFE4D1' },
  cartCount: { fontWeight: 'bold', color: '#FF4500' },
  banner: { margin: 15, padding: 20, backgroundColor: '#FF4500', borderRadius: 20, elevation: 5, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10 },
  bannerSmall: { color: '#FFE4D1', fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
  bannerText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15, color: '#1a1a1a' },
  categories: { paddingHorizontal: 15, marginBottom: 15, paddingTop: 10, paddingBottom: 10 },
  catCard: { alignItems: 'center', marginHorizontal: 8, width: 80 },
  catCardActive: { transform: [{ scale: 1.05 }] },
  catImageContainer: {
    width: 70, height: 70,
    backgroundColor: '#fff',
    borderRadius: 35,
    marginBottom: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 2,
    borderColor: 'transparent'
  },
  catActiveBorder: { borderColor: '#FF4500' },
  catPlaceholder: { flex: 1, backgroundColor: '#f0f0f0' },
  fullImage: { width: '100%', height: '100%' },
  catText: { fontSize: 12, fontWeight: '700', color: '#444' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, paddingBottom: 20 },
  prodCard: { width: '46%', backgroundColor: '#fff', borderRadius: 20, padding: 12, margin: '2%', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, elevation: 3, borderWidth: 1, borderColor: '#f1f1f1' },
  prodImageContainer: { width: '100%', height: 110, backgroundColor: '#f9f9f9', borderRadius: 15, marginBottom: 12, overflow: 'hidden' },
  prodPlaceholder: { flex: 1, backgroundColor: '#f0f0f0' },
  prodName: { fontSize: 14, fontWeight: 'bold', color: '#1a1a1a', marginBottom: 2 },
  prodCat: { fontSize: 10, color: '#999', marginBottom: 8, fontWeight: '600' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  price: { fontSize: 16, fontWeight: '900', color: '#FF4500' },
  oldPrice: { fontSize: 10, color: '#bbb', textDecorationLine: 'line-through' },
  addBtn: { width: 32, height: 32, backgroundColor: '#FF4500', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  addBtnDisabled: { backgroundColor: '#ccc' },
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  cartBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: '#FF4500', borderRadius: 12,
    minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 4, elevation: 3,
  },
  cartBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  outOfStockOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: 'rgba(0,0,0,0.55)', paddingVertical: 5, alignItems: 'center',
  },
  outOfStockText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});

