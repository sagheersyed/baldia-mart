import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, ActivityIndicator, RefreshControl, Dimensions, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { categoriesApi, addressesApi, bannersApi, restaurantsApi, settingsApi, deliveryZonesApi, normalizeUrl } from '../api/api';
import { useFocusEffect } from '@react-navigation/native';
import io from 'socket.io-client';
import BannerCarousel from '../components/BannerCarousel';
import { useCart } from '../context/CartContext';
import { formatRatingCount, getDistanceKm } from '../utils/helpers';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Helper: check if a restaurant is currently open
const isRestaurantOpen = (openingTime?: string, closingTime?: string): boolean => {
  if (!openingTime || !closingTime) return true;
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const [oh, om] = openingTime.split(':').map(Number);
  const [ch, cm] = closingTime.split(':').map(Number);
  const openMins = oh * 60 + om;
  const closeMins = ch * 60 + cm;
  if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
  return nowMins >= openMins || nowMins < closeMins; // overnight
};

// ─── Restaurant Card ─────────────────────────────────────────
const MenuItemCard = memo(({ prod, cartQty, onAdd }: any) => (
  <View style={styles.menuCard}>
    <View style={styles.menuImgWrap}>
      {prod.imageUrl
        ? <Image source={{ uri: normalizeUrl(prod.imageUrl) }} style={styles.fillImg} resizeMode="cover" />
        : <Image
          source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png' }}
          style={{ width: 40, height: 40, opacity: 0.4 }}
        />}
    </View>
    <View style={styles.menuInfo}>
      <Text style={styles.menuName} numberOfLines={1}>{prod.name}</Text>
      {prod.description && <Text style={styles.menuDesc} numberOfLines={1}>{prod.description}</Text>}
      <View style={styles.menuBottom}>
        <Text style={styles.menuPrice}>Rs {Number(prod.price).toFixed(0)}</Text>
        <TouchableOpacity style={styles.menuAddBtn} onPress={() => onAdd(prod)}>
          <Text style={styles.menuAddTxt}>{cartQty > 0 ? `${cartQty} ✓` : '+ Add'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
));

const RestaurantCard = memo(({ resto, onPress }: any) => {
  const logoUri = normalizeUrl(resto.logoUrl);
  const coverFallback = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80';
  const open = isRestaurantOpen(resto.openingTime, resto.closingTime);
  return (
    <TouchableOpacity style={[styles.restoCard, !open && styles.restoCardClosed]} onPress={onPress} activeOpacity={0.88}>
      {/* Cover Image / Placeholder */}
      <View style={styles.restoCover}>
        <Image
          source={{ uri: logoUri || coverFallback }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: open ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.55)' }} />
        {resto.cuisineType && (
          <View style={styles.restoTag}><Text style={styles.restoTagTxt}>{resto.cuisineType}</Text></View>
        )}
        {!open && (
          <View style={styles.closedPill}>
            <Text style={styles.closedPillTxt}>Currently Closed</Text>
          </View>
        )}
      </View>
      <View style={styles.restoInfo}>
        <View style={styles.restoTopRow}>
          <Text style={[styles.restoName, !open && { color: '#999' }]} numberOfLines={1}>{resto.name}</Text>
          {resto.rating > 0 && (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingStar}>⭐</Text>
              <Text style={styles.ratingValue}>{Number(resto.rating).toFixed(1)}{formatRatingCount(resto.ratingCount)}</Text>
            </View>
          )}
        </View>
        {resto.cuisineType && <Text style={styles.restoCuisine} numberOfLines={1}>{resto.cuisineType}</Text>}
        <View style={styles.restoMetaRow}>
          {resto.openingHours && (
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>⏱</Text>
              <Text style={styles.metaTxt}>{resto.openingHours}</Text>
            </View>
          )}
          {(resto.menuItems?.length ?? 0) > 0 && (
            <View style={styles.metaChip}>
              <Text style={styles.metaIcon}>🍽️</Text>
              <Text style={styles.metaTxt}>{resto.menuItems.length} items</Text>
            </View>
          )}
        </View>
        {/* Location row */}
        {resto.location && (
          <View style={styles.locationRow}>
            <Text style={styles.pinIcon}>📍</Text>
            <Text style={styles.locationTxt} numberOfLines={1}>{resto.location}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

// ─── Cuisine Chip ────────────────────────────────────────────
const CuisineChip = memo(({ label, emoji, isActive, onPress }: any) => (
  <TouchableOpacity style={[styles.cuisineChip, isActive && styles.cuisineChipActive]} onPress={onPress}>
    <Text style={styles.cuisineEmoji}>{emoji}</Text>
    <Text style={[styles.cuisineTxt, isActive && styles.cuisineTxtActive]}>{label}</Text>
  </TouchableOpacity>
));

const CUISINES = [
  { id: 'all', label: 'All', emoji: '🍽️' },
  { id: 'desi', label: 'Desi', emoji: '🍛' },
  { id: 'pizza', label: 'Pizza', emoji: '🍕' },
  { id: 'burgers', label: 'Burgers', emoji: '🍔' },
  { id: 'chinese', label: 'Chinese', emoji: '🥡' },
  { id: 'bbq', label: 'BBQ', emoji: '🥩' },
  { id: 'sweets', label: 'Sweets', emoji: '🍮' },
];

// ════════════════════════════════════════════════════════════
export default function FoodScreen({ navigation }: any) {
  const { foodCart, addToCart, getCartCount, setActiveMode } = useCart();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCuisine, setActiveCuisine] = useState('all');
  const [address, setAddress] = useState<any>(null);
  const [activeZones, setActiveZones] = useState<any[]>([]);

  // Set food mode whenever this screen is focused
  useFocusEffect(useCallback(() => {
    setActiveMode('food');
    loadData();
  }, []));

  const loadData = async () => {
    try {
      console.log('FoodScreen: Fetching data...');
      const [restRes, addrRes, zonesRes] = await Promise.all([
        restaurantsApi.getAll().catch(err => {
          console.error('Restaurants API Error:', err);
          return { data: [] };
        }),
        addressesApi.getAll().catch(err => ({ data: [] })),
        deliveryZonesApi.getActive().catch(err => ({ data: [] })),
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

      const bannerRes = await bannersApi.getBySection('food', zoneId).catch(err => {
        console.error('Food Banners API Error:', err);
        return { data: [] };
      });

      const allRestos = (restRes.data || []).filter((r: any) => r.isActive !== false);
      setRestaurants(allRestos);
      setBanners(bannerRes.data || []);
      setAddress(currentAddr);
      setActiveZones(zones);
    } catch (e) {
      console.error('Failed to load food data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => {
    const socket = io('https://c2e9-175-107-236-228.ngrok-free.app', {
      transports: ['websocket'],
      forceNew: true
    });
    socket.on('connect', () => console.log('Food: Connected to socket'));
    socket.on('bannersUpdated', async () => {
      console.log('Food: Banners updated remotely, refreshing...');
      try {
        const res = await bannersApi.getBySection('food');
        setBanners(res.data || []);
      } catch (err) {
        console.error('Failed to sync food banners', err);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []));

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, []);

  // Sort: open restaurants by rating (desc), then closed by rating (desc)
  const sortedFilteredRestaurants = [...restaurants]
    .filter((r: any) => {
      if (activeCuisine !== 'all' && !r.cuisineType?.toLowerCase().includes(activeCuisine.toLowerCase())) {
        return false;
      }

      // Zone filter
      if (activeZones.length > 0 && address?.latitude && address?.longitude) {
        // Find which zones the user is currently inside
        const userZones = activeZones.filter(z =>
          getDistanceKm(Number(address.latitude), Number(address.longitude), Number(z.centerLat), Number(z.centerLng)) <= Number(z.radiusKm)
        );

        // If user is not in ANY zone, they can't see the restaurant
        if (userZones.length === 0) return false;

        // If restaurant has no coords, maybe we assume it's hidden or show it? We will hide it if it lacks coords
        if (!r.latitude || !r.longitude) return false;

        // Restaurant must be in AT LEAST ONE of the zones the user is in
        const isRestoInUserZone = userZones.some(z =>
          getDistanceKm(Number(r.latitude), Number(r.longitude), Number(z.centerLat), Number(z.centerLng)) <= Number(z.radiusKm)
        );

        if (!isRestoInUserZone) return false;
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const aOpen = isRestaurantOpen(a.openingTime, a.closingTime);
      const bOpen = isRestaurantOpen(b.openingTime, b.closingTime);
      if (aOpen !== bOpen) return aOpen ? -1 : 1;
      return Number(b.rating || 0) - Number(a.rating || 0);
    });

  const cartCount = getCartCount('food');

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#FF4500" />
        <Text style={styles.loaderTxt}>Finding restaurants near you...</Text>
      </View>
    );
  }

  // ── Main Food Screen ──────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Food Delivery</Text>
            <Text style={styles.headerSub}>Order from best restaurants</Text>
          </View>
          <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
            <Text style={styles.cartIcon}>🛒</Text>
            {cartCount > 0 && <View style={styles.cartBadge}><Text style={styles.cartBadgeTxt}>{cartCount}</Text></View>}
          </TouchableOpacity>
        </View>

        {/* Mart / Food Toggle */}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" colors={['#FF4500']} />}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        {/* Food Banner Carousel */}
        <BannerCarousel
          banners={banners}
          autoScrollInterval={5000}
          fallbackBanner={{
            id: 'food-fallback',
            title: "Hungry? We've got you!",
            subtitle: '30 min delivery • Free on Rs 500+',
            tagLabel: '🔥 Flash Deals',
            backgroundColor: '#1A1A1A',
            textColor: '#fff',
          }}
          onPress={(b: any) => {
            if (b.linkType === 'restaurant' && b.linkId) {
              const resto = restaurants.find((r: any) => r.id === b.linkId);
              navigation.navigate('RestaurantDetail', {
                restaurantId: b.linkId,
                restaurantData: resto
              });
            } else if (b.linkType === 'product' && b.linkId) {
              // Food mode product usually belongs to a restaurant, 
              // but for now we'll just navigate to the search if detail isn't clear
              navigation.navigate('Search', { mode: 'food', query: b.linkId });
            } else if (b.linkType === 'category' && b.linkId) {
              setActiveCuisine(b.linkId);
            } else if (b.linkType === 'brand' && b.linkId) {
              navigation.navigate('BrandDetail', { brandId: b.linkId });
            }
          }}
        />


        {/* Cuisine Filter */}
        <Text style={styles.sectionTitle}>Cuisines</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cuisineRow}>
          {CUISINES.map(c => (
            <CuisineChip
              key={c.id}
              label={c.label}
              emoji={c.emoji}
              isActive={activeCuisine === c.id}
              onPress={() => setActiveCuisine(c.id)}
            />
          ))}
        </ScrollView>

        {/* Restaurants */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Nearby Restaurants</Text>
          <Text style={styles.restoCount}>{sortedFilteredRestaurants.length} available</Text>
        </View>

        {sortedFilteredRestaurants.length === 0 ? (
          <View style={styles.emptyMenu}>
            <Text style={styles.emptyMenuTxt}>
              {restaurants.length === 0
                ? "No restaurants added yet.\nCheck back soon!"
                : activeCuisine !== 'all'
                  ? "No restaurants found for this category."
                  : `Your address is outside of active delivery zones for nearby restaurants.\nPlease select a different address.`}
            </Text>
          </View>
        ) : (
          sortedFilteredRestaurants.map((resto: any) => (
            <RestaurantCard
              key={resto.id}
              resto={resto}
              onPress={() => navigation.navigate('RestaurantDetail', { restaurantData: resto })}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA', paddingBottom: 35 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  loaderTxt: { marginTop: 12, color: '#888', fontSize: 14, fontWeight: '600' },
  fillImg: { width: '100%', height: '100%' },

  // Header
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: '#1A1A1A' },
  headerSub: { fontSize: 12, color: '#999', marginTop: 2 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 22, color: '#333' },
  cartBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD8C4' },
  cartIcon: { fontSize: 18 },
  cartBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#FF4500', borderRadius: 9, minWidth: 18, height: 18, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#fff' },
  cartBadgeTxt: { color: '#fff', fontSize: 10, fontWeight: '900' },

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
  banner: {
    margin: 16, borderRadius: 20, backgroundColor: '#1A1A1A',
    flexDirection: 'row', padding: 20, alignItems: 'center',
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.2, shadowRadius: 12,
  },
  bannerTag: { fontSize: 11, color: '#FF8C69', fontWeight: '700', marginBottom: 6, textTransform: 'uppercase' },
  bannerTitle: { fontSize: 20, fontWeight: '900', color: '#fff', lineHeight: 26, marginBottom: 8 },
  bannerSub: { fontSize: 11, color: '#888' },
  bannerText: { flex: 1 },
  bannerEmoji: { fontSize: 60, marginLeft: 10 },

  // Section
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { marginHorizontal: 16, marginTop: 8, marginBottom: 12, fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  restoCount: { fontSize: 12, color: '#888', fontWeight: '700' },

  // Cuisines
  cuisineRow: { paddingLeft: 16, paddingRight: 8, paddingBottom: 8 },
  cuisineChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 25, marginRight: 10,
    backgroundColor: '#F0F2F5', borderWidth: 1.5, borderColor: 'transparent',
  },
  cuisineChipActive: { backgroundColor: '#FFF5F0', borderColor: '#FF4500' },
  cuisineEmoji: { fontSize: 16, marginRight: 6 },
  cuisineTxt: { fontSize: 13, fontWeight: '700', color: '#666' },
  cuisineTxtActive: { color: '#FF4500' },

  // Restaurant Card
  restoCard: {
    marginHorizontal: 16, marginBottom: 14, borderRadius: 20,
    backgroundColor: '#fff', overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
    borderWidth: 1, borderColor: '#F0F0F0',
  },
  restoCover: {
    height: 100, backgroundColor: '#1A1A1A',
    justifyContent: 'center', alignItems: 'center',
  },
  restoCoverEmoji: { fontSize: 50 },
  restoTag: { position: 'absolute', top: 10, left: 12, backgroundColor: '#FF4500', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  restoTagTxt: { color: '#fff', fontSize: 11, fontWeight: '800' },
  closedPill: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.95)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, elevation: 4 },
  closedPillTxt: { color: '#FF4500', fontSize: 13, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  restoInfo: { padding: 14 },
  restoTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  restoName: { fontSize: 16, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  ratingStar: { fontSize: 12, marginRight: 3 },
  ratingValue: { fontSize: 13, fontWeight: '800', color: '#F59E0B' },
  restoCuisine: { fontSize: 12, color: '#888', marginBottom: 10 },
  restoMetaRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metaChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F5F6FA', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  metaIcon: { fontSize: 12, marginRight: 4 },
  metaTxt: { fontSize: 12, fontWeight: '600', color: '#555' },
  locationRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', padding: 8, borderRadius: 10 },
  pinIcon: { fontSize: 14, marginRight: 6 },
  locationTxt: { fontSize: 12, color: '#2563EB', fontWeight: '600', flex: 1 },

  // Restaurant Detail
  restoDetailBanner: {
    backgroundColor: '#1A1A1A', padding: 24, alignItems: 'center',
    margin: 16, borderRadius: 20,
  },
  restoDetailEmoji: { fontSize: 64, marginBottom: 12 },
  restoDetailName: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4 },
  restoDetailCuisine: { fontSize: 13, color: '#888', textAlign: 'center', marginBottom: 12 },
  restoDetailMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
  restoDetailRating: { fontSize: 13, color: '#F59E0B', fontWeight: '700' },
  restoDetailTime: { fontSize: 13, color: '#aaa', fontWeight: '700' },
  restoDetailFee: { fontSize: 13, color: '#aaa', fontWeight: '700' },
  restoDetailDot: { color: '#555' },
  restoLocationCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 14, padding: 12, gap: 10, width: '100%',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  restoLocationIcon: { fontSize: 20 },
  restoLocationLabel: { fontSize: 11, color: '#888', fontWeight: '600', marginBottom: 2 },
  restoLocationAddr: { fontSize: 13, color: '#fff', fontWeight: '700' },

  // Menu
  menuSectionTitle: { marginHorizontal: 16, marginVertical: 14, fontSize: 17, fontWeight: '800', color: '#1A1A1A' },
  menuCard: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 12,
    backgroundColor: '#fff', borderRadius: 18, padding: 12,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6,
    borderWidth: 1, borderColor: '#F5F5F5',
  },
  menuImgWrap: { width: 80, height: 80, borderRadius: 14, backgroundColor: '#F7F8FA', marginRight: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  menuEmoji: { fontSize: 32 },
  menuInfo: { flex: 1, justifyContent: 'space-between' },
  menuName: { fontSize: 15, fontWeight: '700', color: '#1A1A1A' },
  menuDesc: { fontSize: 12, color: '#999', marginVertical: 4 },
  menuBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuPrice: { fontSize: 15, fontWeight: '900', color: '#FF4500' },
  menuAddBtn: { backgroundColor: '#FF4500', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 },
  menuAddTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },

  emptyMenu: { padding: 40, alignItems: 'center' },
  emptyMenuTxt: { color: '#999', fontSize: 14 },
  restoCardClosed: { opacity: 0.65 },
});
