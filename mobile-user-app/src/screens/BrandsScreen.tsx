import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Dimensions, FlatList
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { brandsApi, productsApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';
import { isBusinessOpen } from '../utils/helpers';
import SkeletonLoader from '../components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 48) / 2;

// ─── Product Card ───────────────────────────────────────────
const ProductCard = memo(({ item, cartQty, onAdd, brandClosed }: any) => {
  const finalPrice = (Number(item.price) - Number(item.discount || 0)).toFixed(0);
  const productClosed = !isBusinessOpen(item.openingTime, item.closingTime);
  const categoryClosed = item.category && !isBusinessOpen(item.category.openingTime, item.category.closingTime);
  const isClosed = brandClosed || productClosed || categoryClosed;

  return (
    <View style={[styles.prodCard, isClosed && { opacity: 0.7 }]}>
      <View style={styles.prodImgWrap}>
        {item.imageUrl
          ? <Image source={{ uri: item.imageUrl }} style={styles.fillImg} resizeMode="cover" />
          : <View style={styles.prodPlaceholder} />}

        {isClosed && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>CLOSED</Text>
          </View>
        )}
        {cartQty > 0 && !isClosed && (
          <View style={styles.qtyBadge}><Text style={styles.qtyBadgeTxt}>{cartQty}</Text></View>
        )}
      </View>
      <Text style={styles.prodName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.prodBottom}>
        <Text style={styles.prodPrice}>Rs {finalPrice}</Text>
        <TouchableOpacity
          style={[styles.addCircle, isClosed && styles.addCircleDisabled]}
          onPress={() => onAdd(item)}
          disabled={isClosed}
        >
          <Text style={styles.addCircleTxt}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─── Brand Grid Card (2-per-row) ─────────────────────────────────────────────
const GRID_CARD_W = (SCREEN_WIDTH - 48) / 2;

const BrandGridCard = memo(({ brand, onPress }: any) => {
  const imageUri = normalizeUrl(brand.logoUrl || brand.imageUrl);
  const isOpen = isBusinessOpen(brand.openingTime, brand.closingTime);
  return (
    <TouchableOpacity style={[styles.brandGridCard, { width: GRID_CARD_W }]} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.brandGridImgWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.fillImg} />
        ) : (
          <View style={styles.brandGridImgPlaceholder}>
            <Text style={{ fontSize: 32 }}>🏬</Text>
          </View>
        )}
        {!isOpen && (
          <View style={styles.oosOverlay}>
            <Text style={styles.oosText}>CLOSED</Text>
          </View>
        )}
      </View>
      <Text style={styles.brandGridName} numberOfLines={1}>{brand.name}</Text>
      <Text style={styles.brandGridCount}>{brand.productCount ?? 0} products</Text>
      <View style={[styles.brandGridShopBtn, !isOpen && { opacity: 0.6 }]}>
        <Text style={styles.brandGridShopTxt}>{isOpen ? 'Shop Now →' : 'Closed'}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ════════════════════════════════════════════════════════════
export default function BrandsScreen({ navigation }: any) {
  const { martCart, addToCart, getCartCount, setActiveMode } = useCart();

  useFocusEffect(
    useCallback(() => {
      if (setActiveMode) setActiveMode('mart');
    }, [setActiveMode])
  );


  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All');

  const loadData = useCallback(async () => {
    try {
      const [brandsRes, prodRes] = await Promise.all([
        brandsApi.getAll('mart'),
        productsApi.getAll(),
      ]);
      const allBrands = (brandsRes.data || []).filter((b: any) => b.isActive !== false);
      const allProds = (prodRes.data || []).filter((p: any) => p.isActive !== false);

      // Attach product count to each brand
      const brandsWithCount = allBrands.map((b: any) => ({
        ...b,
        productCount: allProds.filter((p: any) => p.brandId === b.id).length,
      }));

      setBrands(brandsWithCount);
      setProducts(allProds);
    } catch (e) {
      console.error('Failed to load brands:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const brandProducts = selectedBrand
    ? products.filter(p => p.brandId === selectedBrand.id)
    : [];

  const cartCount = getCartCount('mart');

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header Skeleton */}
        <View style={styles.header}>
           <SkeletonLoader width={40} height={40} borderRadius={20} />
           <SkeletonLoader width={120} height={24} />
           <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
           {/* Hero Banner Skeleton */}
           <SkeletonLoader width="100%" height={100} borderRadius={20} style={{ marginBottom: 16 }} />

           {/* Brands List Header Skeleton */}
           <SkeletonLoader width={150} height={16} style={{ marginBottom: 16 }} />

           {/* Brand Grid Skeleton */}
           <View style={styles.brandGridContainer}>
             {[...Array(6)].map((_, i) => (
               <View key={i} style={[styles.brandGridCard, { width: GRID_CARD_W, padding: 16 }]}>
                 <SkeletonLoader width={85} height={85} borderRadius={20} style={{ marginBottom: 14 }} />
                 <SkeletonLoader width="80%" height={16} style={{ marginBottom: 6 }} />
                 <SkeletonLoader width="50%" height={12} style={{ marginBottom: 14 }} />
                 <SkeletonLoader width="100%" height={34} borderRadius={20} />
               </View>
             ))}
           </View>
        </ScrollView>
      </SafeAreaView>
    );
  }


  // ── Products View (brand selected) ───────────────────────
  if (selectedBrand) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => setSelectedBrand(null)}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            {selectedBrand.imageUrl
              ? <Image source={{ uri: selectedBrand.imageUrl }} style={styles.headerBrandImg} resizeMode="contain" />
              : null}
            <Text style={styles.headerTitle} numberOfLines={1}>{selectedBrand.name}</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartIcon}>🛒</Text>
            {cartCount > 0 && (
              <View style={styles.cartBadge}><Text style={styles.cartBadgeTxt}>{cartCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>

        {brandProducts.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyTitle}>No products yet</Text>
            <Text style={styles.emptySub}>This brand hasn't listed products yet.</Text>
          </View>
        ) : (
          <FlatList
            data={brandProducts}
            numColumns={2}
            keyExtractor={item => item.id}
            contentContainerStyle={styles.prodGrid}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
            ListHeaderComponent={
              <Text style={styles.prodListHeader}>
                {brandProducts.length} product{brandProducts.length !== 1 ? 's' : ''} available
              </Text>
            }
            renderItem={({ item }) => (
              <ProductCard
                item={item}
                cartQty={martCart.find((c: any) => c.productId === item.id || c.id === item.id)?.quantity || 0}
                onAdd={(p: any) => addToCart(p, 'mart')}
                brandClosed={!isBusinessOpen(selectedBrand.openingTime, selectedBrand.closingTime)}
              />
            )}
          />
        )}
      </SafeAreaView>
    );
  }

  // ── Brands Grid View ──────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Top Brands</Text>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart', { mode: 'mart' })}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeTxt}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero banner */}
        <View style={styles.heroBanner}>
          <Text style={styles.heroBannerTitle}>Explore Premium Brands</Text>
          <Text style={styles.heroBannerSub}>Find your favourite brands and their products</Text>
        </View>

        {/* Categories Filter */}
        {(() => {
          const categories = ['All', ...Array.from(new Set(brands.map((b: any) => b.category).filter(Boolean)))];
          return categories.length > 1 ? (
            <View style={{ marginBottom: 16 }}>
              <Text style={styles.brandCount}>Categories</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                {categories.map((cat: any) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, activeCategory === cat && styles.catChipActive]}
                    onPress={() => setActiveCategory(cat)}
                  >
                    <Text style={[styles.catTxt, activeCategory === cat && styles.catTxtActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ) : null;
        })()}

        {/* Brand Count Badge */}
        {(() => {
          const filteredBrands = activeCategory === 'All' ? brands : brands.filter((b: any) => b.category === activeCategory);
          return (
            <>
              <Text style={styles.brandCount}>{filteredBrands.length} brands available</Text>
              {filteredBrands.length === 0 ? (
                <View style={styles.empty}>
                  <Text style={styles.emptyIcon}>🏬</Text>
                  <Text style={styles.emptyTitle}>No brands found</Text>
                  <Text style={styles.emptySub}>Try selecting a different category.</Text>
                </View>
              ) : (
                <View style={styles.brandGridContainer}>
                  {filteredBrands.map((item: any) => (
                    <BrandGridCard key={item.id} brand={item} onPress={() => setSelectedBrand(item)} />
                  ))}
                </View>
              )}
            </>
          );
        })()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  loaderWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderTxt: { marginTop: 12, color: '#888', fontSize: 14, fontWeight: '600' },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#F0F0F0',
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#333', justifyContent: 'center', alignItems: 'center', textAlign: 'center', display: 'flex', marginTop: -8, fontWeight: 'bold' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  headerBrandImg: { width: 28, height: 28, borderRadius: 6, marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#1A1A1A' },
  cartBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD8C4' },
  cartIcon: { fontSize: 18 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF4500', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  cartBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },

  scrollContent: { padding: 16, paddingBottom: 30 },

  // Hero Banner
  heroBanner: {
    backgroundColor: '#FF4500', borderRadius: 20, padding: 20, marginBottom: 16,
    elevation: 4, shadowColor: '#FF4500', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12,
  },
  heroBannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', marginBottom: 4 },
  heroBannerSub: { fontSize: 13, color: '#FFD8C4', fontWeight: '500' },

  brandCount: { fontSize: 12, color: '#888', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 },

  catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E7EB' },
  catChipActive: { backgroundColor: '#FF4500', borderColor: '#FF4500' },
  catTxt: { fontSize: 13, fontWeight: '700', color: '#4B5563' },
  catTxtActive: { color: '#fff' },

  brandGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 50
  },

  // Brand Grid Card (2-per-row)
  brandGridCard: {
    backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 16,
    alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12,
    borderWidth: 1, borderColor: '#F5F5F5',
  },
  brandGridImgWrap: {
    width: 85, height: 85, borderRadius: 20,
    backgroundColor: '#F7F8FA', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#F0F0F0',
    overflow: 'hidden', marginBottom: 14,
    elevation: 3, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
  },
  brandGridImgPlaceholder: {
    width: '100%', height: '100%',
    justifyContent: 'center', alignItems: 'center',
    backgroundColor: '#FFF5F0',
  },
  brandGridName: { fontSize: 15, fontWeight: '900', color: '#1A1A1A', textAlign: 'center', marginBottom: 4 },
  brandGridCount: { fontSize: 12, color: '#888', fontWeight: '700', marginBottom: 12 },
  brandGridShopBtn: {
    backgroundColor: '#FFF5F0', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1, borderColor: '#FFD8C4', width: '100%', alignItems: 'center'
  },
  brandGridShopTxt: { color: '#FF4500', fontSize: 13, fontWeight: '900' },

  // Products Grid
  prodGrid: { padding: 12, paddingBottom: 30 },
  prodListHeader: { fontSize: 13, color: '#888', fontWeight: '700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  prodCard: {
    width: CARD_W, backgroundColor: '#fff', borderRadius: 18, padding: 12, margin: 6,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    borderWidth: 1, borderColor: '#F5F5F5',
  },
  prodImgWrap: { width: '100%', height: 110, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F7F8FA', marginBottom: 10 },
  fillImg: { width: '100%', height: '100%' },
  prodPlaceholder: { flex: 1, backgroundColor: '#EEF0F3' },
  qtyBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FF4500', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3 },
  qtyBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },
  prodName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 8, lineHeight: 18 },
  prodBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  prodPrice: { fontSize: 15, fontWeight: '900', color: '#FF4500' },
  addCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#FF4500', shadowOpacity: 0.4, shadowRadius: 6 },
  addCircleDisabled: { backgroundColor: '#ccc' },
  addCircleTxt: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },

  oosOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  oosText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Empty
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 },
  emptySub: { fontSize: 14, color: '#999', textAlign: 'center' },
});
