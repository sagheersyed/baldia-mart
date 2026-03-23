import React, { useState, useEffect, useCallback, memo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { brandsApi, productsApi, categoriesApi } from '../api/api';
import { useCart } from '../context/CartContext';

const ProductCard = memo(({ prod, cartQty, onAdd }: { prod: any; cartQty: number; onAdd: (p: any) => void }) => {
  return (
    <View style={styles.prodCard}>
      <View style={styles.imageContainer}>
        {prod.imageUrl ? (
          <Image source={{ uri: prod.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholder} />
        )}
        {cartQty > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{cartQty}</Text>
          </View>
        )}
      </View>
      <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
      <Text style={styles.prodPrice}>Rs. {Number(prod.price).toFixed(0)}</Text>
      <TouchableOpacity style={styles.addBtn} onPress={() => onAdd(prod)}>
        <Text style={styles.addBtnText}>+ Add</Text>
      </TouchableOpacity>
    </View>
  );
});

export default function BrandDetailScreen({ navigation, route }: any) {
  const { brandId } = route.params;
  const { martCart, addToCart, setActiveMode } = useCart();
  const [brand, setBrand] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (setActiveMode) setActiveMode('mart');
    }, [setActiveMode])
  );

  const loadData = async () => {
    try {
      if (!refreshing) setLoading(true);
      const [brandRes, prodsRes, catsRes] = await Promise.all([
        brandsApi.getById(brandId),
        productsApi.getByBrand(brandId),
        categoriesApi.getAll()
      ]);
      
      setBrand(brandRes.data);
      const brandProds = prodsRes.data || [];
      setProducts(brandProds);
      
      // Filter categories that have products for this brand
      const brandCatIds = Array.from(new Set(brandProds.map((p: any) => p.categoryId)));
      const brandCats = (catsRes.data || []).filter((c: any) => brandCatIds.includes(c.id));
      setCategories(brandCats);
      
      if (brandCats.length > 0 && !selectedCatId) {
        setSelectedCatId(null); // 'All' by default
      }
    } catch (error) {
      console.error('Failed to load brand details:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [brandId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [brandId]);

  const filteredProducts = selectedCatId
    ? products.filter(p => p.categoryId === selectedCatId)
    : products;

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#FF4500" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{brand?.name || 'Brand'}</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart', { mode: 'mart' })}>
           <Text style={styles.cartCount}>{martCart.reduce((sum, i) => sum + i.quantity, 0)}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
      >
        {brand?.imageUrl && (
          <View style={styles.brandBannerContainer}>
            <Image source={{ uri: brand.imageUrl }} style={styles.brandBanner} resizeMode="contain" />
          </View>
        )}

        <View style={styles.catBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 15 }}>
            <TouchableOpacity 
              style={[styles.catItem, !selectedCatId && styles.catItemActive]}
              onPress={() => setSelectedCatId(null)}
            >
              <Text style={[styles.catText, !selectedCatId && styles.catTextActive]}>All Products</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity 
                key={cat.id}
                style={[styles.catItem, selectedCatId === cat.id && styles.catItemActive]}
                onPress={() => setSelectedCatId(cat.id)}
              >
                <Text style={[styles.catText, selectedCatId === cat.id && styles.catTextActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.productsGrid}>
          {filteredProducts.map(prod => (
            <ProductCard 
              key={prod.id} 
              prod={prod} 
              cartQty={martCart.find((c: any) => c.id === prod.id)?.quantity || 0}
              onAdd={(p) => addToCart(p, 'mart')}
            />
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No products found in this category.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9f9f9' },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a', flex: 1, textAlign: 'center' },
  backBtn: { width: 40, height: 40, backgroundColor: '#f5f5f5', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  cartBtn: { width: 40, height: 40, backgroundColor: '#FFF5F0', borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  cartCount: { fontWeight: 'bold', color: '#FF4500', fontSize: 12 },
  brandBannerContainer: { width: '100%', height: 180, backgroundColor: '#fff', padding: 20, marginBottom: 10 },
  brandBanner: { width: '100%', height: '100%' },
  catBar: { backgroundColor: '#fff', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#eee' },
  catItem: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 10, backgroundColor: '#f5f5f5' },
  catItemActive: { backgroundColor: '#FF4500' },
  catText: { fontWeight: 'bold', color: '#666', fontSize: 13 },
  catTextActive: { color: '#fff' },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10 },
  prodCard: { width: '46%', backgroundColor: '#fff', borderRadius: 15, padding: 12, margin: '2%', borderWidth: 1, borderColor: '#f0f0f0' },
  imageContainer: { width: '100%', height: 100, backgroundColor: '#f9f9f9', borderRadius: 10, marginBottom: 10, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  placeholder: { flex: 1, backgroundColor: '#eee' },
  prodName: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  prodPrice: { fontSize: 15, fontWeight: '900', color: '#FF4500', marginBottom: 10 },
  addBtn: { backgroundColor: '#FF4500', borderRadius: 8, paddingVertical: 8, alignItems: 'center' },
  addBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  badge: { position: 'absolute', top: 5, right: 5, backgroundColor: '#FF4500', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  empty: { padding: 50, alignItems: 'center' },
  emptyText: { color: '#999', fontSize: 16 }
});
