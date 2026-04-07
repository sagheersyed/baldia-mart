import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, FlatList, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import io from 'socket.io-client';
import {
  categoriesApi, productsApi, addressesApi, brandsApi, bannersApi,
  deliveryZonesApi, normalizeUrl
} from '../api/api';
import { getDistanceKm, isBusinessOpen } from '../utils/helpers';
import BannerCarousel from '../components/BannerCarousel';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─────────────── Product Card ───────────────
const ProductCard = memo(({ prod, cartQty, onAdd, isFav, onToggleFav }: any) => {
  const stock = prod.stock ?? prod.stockQuantity ?? 1;
  const isOOS = stock <= 0;
  const finalPrice = (Number(prod.price) - Number(prod.discount || 0)).toFixed(0);

  return (
    <View style={styles.prodCard}>
      <View style={styles.prodImgWrap}>
        {prod.imageUrl
          ? <Image source={{ uri: prod.imageUrl }} style={styles.fillImg} resizeMode="cover" />
          : <View style={styles.prodImgPlaceholder} />}
        {cartQty > 0 && (
          <View style={styles.qtyBadge}><Text style={styles.qtyBadgeText}>{cartQty}</Text></View>
        )}

        {/* Hierarchical Business Hours Check */}
        {(() => {
          const productWait = !isBusinessOpen(prod.openingTime, prod.closingTime);
          const brandWait = prod.brand && !isBusinessOpen(prod.brand.openingTime, prod.brand.closingTime);
          const catWait = prod.category && !isBusinessOpen(prod.category.openingTime, prod.category.closingTime);

          if (productWait || brandWait || catWait) {
            return (
              <View style={styles.oosOverlay}>
                <Text style={styles.oosText}>Currently Closed</Text>
              </View>
            );
          }
          if (isOOS) {
            return (
              <View style={styles.oosOverlay}>
                <Text style={styles.oosText}>Out of Stock</Text>
              </View>
            );
          }
          return null;
        })()}

        <TouchableOpacity style={styles.prodHeart} onPress={onToggleFav}>
          <Text style={styles.prodHeartIcon}>{isFav ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.prodName} numberOfLines={2}>{prod.name}</Text>
      {prod.category?.name && <Text style={styles.prodCatLabel}>{prod.category.name}</Text>}
      <View style={styles.prodBottom}>
        <View>
          <Text style={styles.prodPrice}>Rs {finalPrice}</Text>
          {Number(prod.discount) > 0 && (
            <Text style={styles.prodOldPrice}>Rs {Number(prod.price).toFixed(0)}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[styles.addCircle, (isOOS || !isBusinessOpen(prod.openingTime, prod.closingTime) || (prod.brand && !isBusinessOpen(prod.brand.openingTime, prod.brand.closingTime)) || (prod.category && !isBusinessOpen(prod.category.openingTime, prod.category.closingTime))) && styles.addCircleDisabled]}
          onPress={() => onAdd(prod)}
          disabled={isOOS || !isBusinessOpen(prod.openingTime, prod.closingTime) || (prod.brand && !isBusinessOpen(prod.brand.openingTime, prod.brand.closingTime)) || (prod.category && !isBusinessOpen(prod.category.openingTime, prod.category.closingTime))}
        >
          <Text style={styles.addCircleText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ─────────────── Category Pill ───────────────
const CatPill = memo(({ cat, isSelected, onPress }: any) => (
  <TouchableOpacity style={styles.catPill} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.catIconBox, isSelected && styles.catIconBoxActive]}>
      {cat.imageUrl
        ? <Image source={{ uri: normalizeUrl(cat.imageUrl) }} style={styles.catIcon} resizeMode="cover" />
        : <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png' }}
          style={{ width: 30, height: 30, opacity: 0.4 }}
        />}
    </View>
    <Text style={[styles.catPillText, isSelected && styles.catPillTextActive]} numberOfLines={1}>
      {cat.name}
    </Text>
  </TouchableOpacity>
));

// ─────────────── Brand Chip ───────────────
const BrandChip = memo(({ brand, onPress }: any) => {
  const imgUri = normalizeUrl(brand.logoUrl || brand.imageUrl);
  const isOpen = isBusinessOpen(brand.openingTime, brand.closingTime);
  return (
    <TouchableOpacity style={styles.brandChip} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.brandChipImg}>
        {imgUri
          ? <Image source={{ uri: imgUri }} style={styles.fillImg} />
          : <Text style={{ fontSize: 28 }}>🏬</Text>}
        {!isOpen && (
          <View style={[styles.oosOverlay, { borderRadius: 16 }]}>
            <Text style={[styles.oosText, { fontSize: 8 }]}>CLOSED</Text>
          </View>
        )}
      </View>
      <Text style={styles.brandChipName} numberOfLines={1}>{brand.name}</Text>
    </TouchableOpacity>
  );
});

// ════════════════ MAIN SCREEN ════════════════
export default function HomeScreen({ navigation }: any) {
  const { martCart, foodCart, addToCart, getCartCount, activeMode, setActiveMode } = useCart();
  const [serviceMode, setServiceMode] = useState<'mart' | 'food'>(activeMode);
  const cart = serviceMode === 'mart' ? martCart : foodCart;
  const { isFavourite, toggleFavourite, reload: reloadFavs } = useFavourites();

  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAllCats, setShowAllCats] = useState(false);

  // ── Load Data ──
  const loadData = useCallback(async () => {
    try {
      const [catRes, prodRes, addrRes, brandRes, zonesRes] = await Promise.all([
        categoriesApi.getAll('mart'),
        productsApi.getAll(),
        addressesApi.getAll().catch(() => ({ data: [] })),
        brandsApi.getAll('mart').catch(() => ({ data: [] })),
        deliveryZonesApi.getActive().catch(() => ({ data: [] })),
      ]);

      const addrs = addrRes.data || [];
      const currentAddr = addrs.find((a: any) => a.isDefault) || addrs[0] || null;
      const zones = zonesRes.data || [];

      let zoneId: string | undefined;
      if (currentAddr?.latitude && currentAddr?.longitude) {
        const matchingZone = zones.find((z: any) =>
          getDistanceKm(
            Number(currentAddr.latitude), Number(currentAddr.longitude),
            Number(z.centerLat), Number(z.centerLng)
          ) <= Number(z.radiusKm)
        );
        zoneId = matchingZone?.id;
      }

      const bannerRes = await bannersApi.getBySection('mart', zoneId).catch(() => ({ data: [] }));

      setCategories(catRes.data || []);
      setProducts((prodRes.data || []).filter((p: any) => p.isActive !== false));
      setBrands((brandRes.data || []).filter((b: any) => b.isActive !== false));
      setBanners(bannerRes.data || []);
      setAddress(currentAddr);
    } catch (e) {
      console.error('Failed to load home data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setActiveMode('mart');
    loadData();
    reloadFavs();
  }, [loadData, reloadFavs]));

  // Real-time Banners Update
  useEffect(() => {
    const socket = io('https://00ad-175-107-236-228.ngrok-free.app', {
      transports: ['websocket'],
      forceNew: true
    });
    socket.on('connect', () => console.log('Home: Connected to socket'));
    socket.on('bannersUpdated', async () => {
      console.log('Home: Banners updated remotely, refreshing...');
      try {
        const res = await bannersApi.getBySection('mart');
        setBanners(res.data || []);
      } catch (err) {
        console.error('Failed to sync banners', err);
      }
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  // Refresh address on focus
  useFocusEffect(useCallback(() => {
    (async () => {
      try {
        const res = await addressesApi.getAll();
        const addrs = res.data || [];
        setAddress(addrs.find((a: any) => a.isDefault) || addrs[0] || null);
      } catch (_) { }
    })();
  }, []));


  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleAddToCart = (prod: any) => {
    if ((prod.stock ?? prod.stockQuantity ?? 1) <= 0) return;
    addToCart(prod, serviceMode);
  };


  // ── Derived lists ──
  const displayCats = categories.filter(c => c.section === 'mart' || c.section === 'all');
  const displayProducts = selectedCatId
    ? products.filter(p => p.categoryId === selectedCatId)
    : products;

  const cartCount = getCartCount('mart');
  const locationLabel = address
    ? `${address.label ? address.label + ', ' : ''}${address.streetAddress?.substring(0, 28) || ''}`
    : 'Select your location';

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={styles.loaderText}>Loading Baldia Mart...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── HEADER ── */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          {/* Logo + App Name */}
          <View style={styles.logoArea}>
            <Text style={styles.appName}>
              <Text style={styles.appNameBold}>Baldia</Text>
              <Text style={styles.appNameAccent}>Mart</Text>
            </Text>
          </View>
          {/* Right icons */}
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate('Notifications')}>
              <Text style={styles.iconEmoji}>🔔</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cartIconBtn} onPress={() => navigation.navigate('Cart')}>
              <Text style={styles.iconEmoji}>🛒</Text>
              {cartCount > 0 && (
                <View style={styles.cartBadge}>
                  <Text style={styles.cartBadgeText}>{cartCount > 9 ? '9+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Location Row */}
        <TouchableOpacity style={styles.locationRow} onPress={() => navigation.navigate('SavedAddresses')}>
          <Text style={styles.deliveryLabel}>Delivering to</Text>
          <View style={styles.locationInner}>
            <Text style={styles.pinIcon}>📍</Text>
            <Text style={styles.locationText} numberOfLines={1}>{locationLabel}</Text>
            <Text style={styles.chevronIcon}>⌄</Text>
          </View>
        </TouchableOpacity>

        {/* Search Bar */}
        <TouchableOpacity
          style={styles.searchBar}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Search', { mode: 'mart' })}
        >
          <Text style={styles.searchBarIcon}>🔍</Text>
          <Text style={styles.searchBarText}>
            Search groceries, daily essentials...
          </Text>
        </TouchableOpacity>

      </View>

      {/* ── CONTENT ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" colors={['#FF4500']} />}
        contentContainerStyle={{ paddingBottom: 100 }}
      >
        {/* ── Rotating Banner Carousel ── */}
        <BannerCarousel
          banners={banners}
          autoScrollInterval={5000}
          fallbackBanner={{
            id: 'mart-fallback',
            title: 'Welcome to BaldiaMart',
            subtitle: 'Get 20% off on your first order. Use code: FIRST20',
            tagLabel: '🎉 New Users',
            backgroundColor: '#FF4500',
            textColor: '#fff',
          }}
          onPress={(b: any) => {
            if (b.linkType === 'product' && b.linkId) {
              const product = products.find(p => p.id === b.linkId);
              if (product) handleAddToCart(product);
            } else if (b.linkType === 'brand' && b.linkId) {
              const brand = brands.find(br => br.id === b.linkId);
              if (brand) navigation.navigate('BrandDetail', { brandId: brand.id });
            } else if (b.linkType === 'category' && b.linkId) {
              setSelectedCatId(b.linkId);
            } else if (b.linkType === 'restaurant' && b.linkId) {
              navigation.navigate('RestaurantDetail', { restaurantId: b.linkId });
            }
          }}
        />

        {/* ─ BRANDS ─ */}
        {brands.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Top Brands</Text>
              <TouchableOpacity onPress={() => navigation.navigate('BrandsList')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.brandsRow}>
              {brands.map(b => (
                <BrandChip key={b.id} brand={b} onPress={() => navigation.navigate('BrandDetail', { brandId: b.id })} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ─ CATEGORIES ─ */}
        {displayCats.length > 0 && (
          <View style={styles.section}>
            <Text style={{ marginHorizontal: 16, marginBottom: 12, fontSize: 17, fontWeight: '700', color: '#111' }}>
              Shop by Category
            </Text>
            <View style={styles.catsGrid}>
              <CatPill
                cat={{ id: null, name: 'All', imageUrl: null }}
                isSelected={!selectedCatId}
                onPress={() => setSelectedCatId(null)}
              />
              {(showAllCats ? displayCats : displayCats.slice(0, 6)).map(c => (
                <CatPill
                  key={c.id}
                  cat={c}
                  isSelected={selectedCatId === c.id}
                  onPress={() => setSelectedCatId(selectedCatId === c.id ? null : c.id)}
                />
              ))}
              {displayCats.length > 6 && (
                <TouchableOpacity style={styles.catPill} onPress={() => setShowAllCats(!showAllCats)} activeOpacity={0.8}>
                  <View style={styles.catIconBox}>
                    <Text style={{ fontSize: 20 }}>{showAllCats ? '⬆️' : '⬇️'}</Text>
                  </View>
                  <Text style={styles.catPillText}>{showAllCats ? 'Less' : 'More'}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
        {/* ─ PRODUCTS ─ */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Best Sellers</Text>
          </View>
          {displayProducts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No items found</Text>
            </View>
          ) : (
            <View style={styles.productsGrid}>
              {displayProducts.map(prod => (
                <ProductCard
                  key={prod.id}
                  prod={prod}
                  cartQty={martCart.find((c: any) => c.id === prod.id)?.quantity || 0}
                  onAdd={handleAddToCart}
                  isFav={isFavourite(prod.id, 'products')}
                  onToggleFav={() => toggleFavourite(
                    {
                      id: prod.id,
                      name: prod.name,
                      imageUrl: prod.imageUrl,
                      price: prod.price,
                      discount: prod.discount,
                      category: prod.category,
                      brand: prod.brand,
                      openingTime: prod.openingTime,
                      closingTime: prod.closingTime
                    },
                    'products'
                  )}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', marginTop: 0 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderText: { marginTop: 12, color: '#888', fontSize: 14, fontWeight: '600' },

  // ── Header ──
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  logoArea: { flex: 1 },
  appName: { fontSize: 22, letterSpacing: -0.3 },
  appNameBold: { fontWeight: '900', color: '#1A1A1A' },
  appNameAccent: { fontWeight: '900', color: '#FF4500' },
  headerIcons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  cartIconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD8C4' },
  iconEmoji: { fontSize: 18 },
  cartBadge: { position: 'absolute', top: -3, right: -3, backgroundColor: '#FF4500', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },

  locationRow: { marginBottom: 10 },
  deliveryLabel: { fontSize: 11, color: '#999', fontWeight: '500', marginBottom: 2 },
  locationInner: { flexDirection: 'row', alignItems: 'center' },
  pinIcon: { fontSize: 14, marginRight: 4 },
  locationText: { fontSize: 14, fontWeight: '700', color: '#FF4500', flex: 1 },
  chevronIcon: { fontSize: 16, color: '#FF4500', marginLeft: 4 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EBEBF0',
  },
  searchBarIcon: { fontSize: 16, marginRight: 10, color: '#999' },
  searchBarText: { fontSize: 14, color: '#ABABAB', fontWeight: '400', flex: 1 },

  // Toggle
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#F0F2F5',
    borderRadius: 14,
    padding: 4,
  },
  toggleSegment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  toggleSegmentActive: {
    backgroundColor: '#FF4500',
    elevation: 3,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  toggleSegmentIcon: { fontSize: 16 },
  toggleSegmentLabel: { fontSize: 14, fontWeight: '700', color: '#888' },
  toggleSegmentLabelActive: { color: '#fff' },

  // Banner
  bannerCard: {
    margin: 16,
    borderRadius: 20,
    backgroundColor: '#FF4500',
    flexDirection: 'row',
    overflow: 'hidden',
    minHeight: 120,
    elevation: 6,
    shadowColor: '#FF4500',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  bannerTextArea: { flex: 1, padding: 20, justifyContent: 'center' },
  bannerTag: { fontSize: 11, color: '#FFD8C4', fontWeight: '700', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  bannerTitle: { fontSize: 22, fontWeight: '900', color: '#fff', marginBottom: 4, lineHeight: 26 },
  bannerSub: { fontSize: 12, color: '#FFD8C4', fontWeight: '600' },
  bannerImgArea: { width: 110, justifyContent: 'center', alignItems: 'center' },

  // Sections
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  seeAll: { fontSize: 13, color: '#FF4500', fontWeight: '700' },

  // Brands
  brandsRow: { paddingLeft: 16, paddingRight: 8, paddingBottom: 4 },
  brandChip: { alignItems: 'center', marginRight: 14, width: 85 },
  brandChipImg: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  brandChipName: { fontSize: 12, fontWeight: '700', color: '#333', marginTop: 8, textAlign: 'center' },


  // Categories
  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, justifyContent: 'flex-start', paddingTop: 4 },
  catsRow: { paddingLeft: 16, paddingRight: 8, paddingBottom: 4 },
  catPill: { alignItems: 'center', marginBottom: 16, width: (SCREEN_WIDTH - 24) / 4 },
  catIconBox: { width: 56, height: 56, borderRadius: 14, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#F0F0F0', overflow: 'hidden', marginBottom: 6, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 3 },
  catIconBoxActive: { borderColor: '#FF4500', backgroundColor: '#FFF5F0' },
  catIcon: { width: '100%', height: '100%' },
  catEmoji: { fontSize: 26 },
  catPillText: { fontSize: 11, fontWeight: '600', color: '#666', textAlign: 'center', paddingHorizontal: 2 },
  catPillTextActive: { color: '#FF4500' },

  // Products Grid
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  prodCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 12,
    margin: 6,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    borderWidth: 1,
    borderColor: '#F5F5F5',
  },
  prodImgWrap: { width: '100%', height: 110, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F7F8FA', marginBottom: 10 },
  fillImg: { width: '100%', height: '100%' },
  prodImgPlaceholder: { flex: 1, backgroundColor: '#EEF0F3' },
  qtyBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FF4500', borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, elevation: 3 },
  qtyBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900' },
  oosOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 6 },
  oosText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  prodHeart: {
    position: 'absolute', top: 6, left: 6,
    width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.85)',
    justifyContent: 'center', alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 3
  },
  prodHeartIcon: { fontSize: 14 },
  prodName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 2, lineHeight: 18 },
  prodCatLabel: { fontSize: 10, color: '#ABABAB', fontWeight: '600', marginBottom: 8 },
  prodBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  prodPrice: { fontSize: 15, fontWeight: '900', color: '#FF4500' },
  prodOldPrice: { fontSize: 10, color: '#CCC', textDecorationLine: 'line-through', marginTop: 1 },
  addCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#FF4500', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  addCircleDisabled: { backgroundColor: '#CCC' },
  addCircleText: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },

  emptyState: { padding: 50, alignItems: 'center' },
  emptyStateText: { color: '#ABABAB', fontSize: 15 },
});
