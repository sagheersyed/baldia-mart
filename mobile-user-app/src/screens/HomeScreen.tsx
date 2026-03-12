import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoriesApi, productsApi, addressesApi } from '../api/api';
import { useCart } from '../context/CartContext';

export default function HomeScreen({ navigation }: any) {
  const { addToCart, getCartCount } = useCart();
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

  const handleAddToCart = (product: any) => {
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
          <Text style={styles.locationText}>{address ? `${address.label}: ${address.streetAddress.substring(0,20)}...` : 'Select Location'}</Text>
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
          <TouchableOpacity 
            style={[styles.catCard, !selectedCategoryId && styles.catCardActive]}
            onPress={() => setSelectedCategoryId(null)}
          >
            <View style={[styles.catImageContainer, !selectedCategoryId && styles.catActiveBorder]}>
              <Text style={{ fontSize: 24 }}>🏠</Text>
            </View>
            <Text style={styles.catText}>All</Text>
          </TouchableOpacity>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.catCard, selectedCategoryId === cat.id && styles.catCardActive]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <View style={[styles.catImageContainer, selectedCategoryId === cat.id && styles.catActiveBorder]}>
                {cat.imageUrl ? (
                  <Image source={{ uri: cat.imageUrl }} style={styles.fullImage} />
                ) : (
                  <View style={styles.catPlaceholder} />
                )}
              </View>
              <Text style={styles.catText} numberOfLines={1}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.sectionTitle}>Featured Products</Text>
        <View style={styles.productsGrid}>
          {filteredProducts.map(prod => (
            <View key={prod.id} style={styles.prodCard}>
              <View style={styles.prodImageContainer}>
                {prod.imageUrl ? (
                  <Image source={{ uri: prod.imageUrl }} style={styles.fullImage} />
                ) : (
                  <View style={styles.prodPlaceholder} />
                )}
              </View>
              <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
              <Text style={styles.prodCat}>{prod.category?.name}</Text>
              <View style={styles.priceRow}>
                <View>
                  <Text style={styles.price}>${(Number(prod.price) || 0).toFixed(2)}</Text>
                  {Number(prod.discountPrice) < Number(prod.price) && Number(prod.discountPrice) > 0 && (
                    <Text style={styles.oldPrice}>${(Number(prod.price) || 0).toFixed(2)}</Text>
                  )}
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => handleAddToCart(prod)}>
                  <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
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
  banner: { margin: 20, padding: 20, backgroundColor: '#FF4500', borderRadius: 20, elevation: 5, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 10 },
  bannerSmall: { color: '#FFE4D1', fontWeight: 'bold', fontSize: 12, marginBottom: 5 },
  bannerText: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginHorizontal: 20, marginBottom: 15, color: '#1a1a1a' },
  categories: { paddingHorizontal: 15, marginBottom: 30 },
  catCard: { alignItems: 'center', marginHorizontal: 8, width: 80 },
  catImageContainer: { width: 70, height: 70, backgroundColor: '#fff', borderRadius: 35, marginBottom: 8, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
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
  addBtnText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  catCardActive: { opacity: 1 },
  catActiveBorder: { borderColor: '#FF4500', borderWidth: 2 },
});

