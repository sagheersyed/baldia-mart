import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View, Text, StyleSheet, Image, TouchableOpacity,
  ScrollView, FlatList, ActivityIndicator, RefreshControl, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { restaurantsApi, menuItemsApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { formatRatingCount, isBusinessOpen } from '../utils/helpers';
import SkeletonLoader from '../components/SkeletonLoader';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = (SCREEN_WIDTH - 44) / 2;

// ─── Menu Item Card ───
const MenuItemCard = memo(({ item, cartQty, onAdd, restaurantClosed }: any) => {
  const finalPrice = (Number(item.price) - Number(item.discount || 0)).toFixed(0);
  const imgUri = normalizeUrl(item.imageUrl);
  const itemClosed = !isBusinessOpen(item.openingTime, item.closingTime);
  const isClosed = restaurantClosed || itemClosed;

  return (
    <View style={[styles.menuCard, isClosed && { opacity: 0.7 }]}>
      <View style={styles.menuImgWrap}>
        {imgUri
          ? <Image source={{ uri: imgUri }} style={styles.fillImg} resizeMode="cover" />
          : <View style={styles.menuImgPlaceholder}><Text style={{ fontSize: 32 }}>🍽️</Text></View>}
        {isClosed && (
          <View style={styles.oosOverlay}><Text style={styles.oosText}>CLOSED</Text></View>
        )}
        {cartQty > 0 && !isClosed && (
          <View style={styles.qtyBadge}><Text style={styles.qtyBadgeTxt}>{cartQty}</Text></View>
        )}
      </View>
      {item.category && <Text style={styles.itemCategory}>{item.category}</Text>}
      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
      {item.prepTimeMinutes && (
        <Text style={styles.prepTime}>⏱ {item.prepTimeMinutes} min</Text>
      )}
      <View style={styles.itemBottom}>
        <View>
          <Text style={styles.itemPrice}>Rs {finalPrice}</Text>
          {item.discount > 0 && <Text style={styles.itemOldPrice}>Rs {Number(item.price).toFixed(0)}</Text>}
        </View>
        <TouchableOpacity 
          style={[styles.addCircle, isClosed && styles.addCircleDisabled]} 
          onPress={() => onAdd(item)}
          disabled={isClosed}
        >
          <Text style={styles.addCircleText}>{isClosed ? '×' : '+'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

// ════════════════════════════
export default function RestaurantDetailScreen({ route, navigation }: any) {
  const { restaurantId, restaurantData } = route.params || {};
  const { foodCart, addToCart, getCartCount, setActiveMode } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();

  useFocusEffect(
    useCallback(() => {
      if (setActiveMode) setActiveMode('food');
    }, [setActiveMode])
  );

  const [restaurant, setRestaurant] = useState<any>(restaurantData || null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!restaurantData);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isOpen = isBusinessOpen(restaurant?.openingTime, restaurant?.closingTime);

  const loadData = useCallback(async () => {
    try {
      const [restRes, menuRes] = await Promise.all([
        restaurantData ? Promise.resolve({ data: restaurantData }) : restaurantsApi.getById(restaurantId),
        menuItemsApi.getByRestaurant(restaurantData?.id || restaurantId),
      ]);
      if (restRes.data) setRestaurant(restRes.data);
      setMenuItems(menuRes.data || []);
    } catch (err) {
      console.error('Failed to load restaurant detail:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, restaurantData]);

  useEffect(() => { loadData(); }, []);

  const onRefresh = useCallback(() => { setRefreshing(true); loadData(); }, [loadData]);

  const handleAddToCart = (item: any) => {
    if (!isOpen) return;
    addToCart({ 
      ...item, 
      restaurantId: restaurant?.id || restaurantId,
      restaurantName: restaurant?.name || 'Restaurant',
      prepTimeMinutes: item.prepTimeMinutes,
      maxQuantityPerOrder: item.maxQuantityPerOrder
    }, 'food');
  };

  // Group by category
  const categories = [...new Set(menuItems.map(i => i.category).filter(Boolean))];
  const filteredItems = selectedCategory
    ? menuItems.filter(i => i.category === selectedCategory)
    : menuItems;

  const cartCount = getCartCount('food');
  const logoUri = normalizeUrl(restaurant?.logoUrl);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header Skeleton */}
        <View style={styles.header}>
           <SkeletonLoader width={40} height={40} borderRadius={20} />
           <View style={styles.headerCenter}>
              <SkeletonLoader width={32} height={32} borderRadius={8} style={{ marginRight: 8 }} />
              <SkeletonLoader width={140} height={20} />
           </View>
           <SkeletonLoader width={40} height={40} borderRadius={20} style={{ marginRight: 8 }} />
           <SkeletonLoader width={40} height={40} borderRadius={20} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
           {/* Info Banner Skeleton */}
           <View style={styles.infoBanner}>
              <View style={styles.infoRow}>
                 {[...Array(3)].map((_, i) => (
                    <SkeletonLoader key={i} width={80} height={28} borderRadius={20} />
                 ))}
              </View>
              <SkeletonLoader width="90%" height={16} style={{ marginBottom: 6 }} />
              <SkeletonLoader width="100%" height={14} style={{ marginBottom: 4 }} />
              <SkeletonLoader width="100%" height={14} />
           </View>

           {/* Categories Skeleton */}
           <View style={{ flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 }}>
              {[...Array(4)].map((_, i) => (
                 <SkeletonLoader key={i} width={70} height={34} borderRadius={20} style={{ marginRight: 8 }} />
              ))}
           </View>

           {/* Grid Skeleton */}
           <View style={styles.grid}>
              {[...Array(4)].map((_, i) => (
                 <View key={i} style={[styles.menuCard, { padding: 12 }]}>
                    <SkeletonLoader width="100%" height={120} borderRadius={14} style={{ marginBottom: 10 }} />
                    <SkeletonLoader width="30%" height={10} style={{ marginBottom: 4 }} />
                    <SkeletonLoader width="80%" height={16} style={{ marginBottom: 10 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                       <SkeletonLoader width="50%" height={18} />
                       <SkeletonLoader width={32} height={32} borderRadius={16} />
                    </View>
                 </View>
              ))}
           </View>
        </ScrollView>
      </SafeAreaView>
    );
  }


  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          {logoUri && <Image source={{ uri: logoUri }} style={styles.headerLogo} resizeMode="contain" />}
          <Text style={styles.headerTitle} numberOfLines={1}>{restaurant?.name}</Text>
        </View>
        <TouchableOpacity style={styles.cartBtn} onPress={() => navigation.navigate('Cart')}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeTxt}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.heartBtn}
          onPress={() => restaurant && toggleFavourite(
            { id: restaurant.id, name: restaurant.name, logoUrl: restaurant.logoUrl, cuisineType: restaurant.cuisineType, rating: restaurant.rating },
            'restaurants'
          )}
        >
          <Text style={styles.heartBtnIcon}>
            {restaurant && isFavourite(restaurant.id, 'restaurants') ? '❤️' : '🤍'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#FF4500" />}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Restaurant Info Banner */}
        <View style={styles.infoBanner}>
          <View style={styles.infoRow}>
            {restaurant?.cuisineType && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillTxt}>👨‍🍳 {restaurant.cuisineType}</Text>
              </View>
            )}
            {restaurant?.openingHours && (
              <View style={styles.infoPill}>
                <Text style={styles.infoPillTxt}>⏰ {restaurant.openingHours}</Text>
              </View>
            )}
            {restaurant?.rating > 0 && (
              <View style={[styles.infoPill, { backgroundColor: '#FFF5E0' }]}>
                <Text style={[styles.infoPillTxt, { color: '#FF8C00' }]}>⭐ {Number(restaurant.rating).toFixed(1)}{formatRatingCount(restaurant.ratingCount)}</Text>
              </View>
            )}
          </View>
          {restaurant?.location && (
            <Text style={styles.locationTxt}>📍 {restaurant.location}</Text>
          )}
          {restaurant?.description && (
            <Text style={styles.descTxt}>{restaurant.description}</Text>
          )}

          {!isOpen && (
            <View style={styles.closedBanner}>
              <Text style={styles.closedBannerTxt}>🚫 This restaurant is currently closed</Text>
              <Text style={styles.closedReopenTxt}>Opening Hours: {restaurant?.openingHours || `${restaurant?.openingTime} - ${restaurant?.closingTime}`}</Text>
            </View>
          )}
        </View>

        {/* Category Chips */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesRow}
          >
            <TouchableOpacity
              style={[styles.catChip, !selectedCategory && styles.catChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[styles.catChipTxt, !selectedCategory && styles.catChipTxtActive]}>All</Text>
            </TouchableOpacity>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catChip, selectedCategory === cat && styles.catChipActive]}
                onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              >
                <Text style={[styles.catChipTxt, selectedCategory === cat && styles.catChipTxtActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Section Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedCategory || 'Full Menu'} · {filteredItems.length} items
          </Text>
        </View>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>🍽️</Text>
            <Text style={styles.emptyTxt}>No items in this category yet</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredItems.map(item => (
              <MenuItemCard
                key={item.id}
                item={item}
                cartQty={foodCart.find((c: any) => c.id === item.id)?.quantity || 0}
                onAdd={handleAddToCart}
                restaurantClosed={!isOpen}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F8FA' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', elevation: 4,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F5F5F5', justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 20, color: '#333', fontWeight: 'bold' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', marginHorizontal: 12 },
  headerLogo: { width: 32, height: 32, borderRadius: 8, marginRight: 8 },
  headerTitle: { fontSize: 17, fontWeight: '800', color: '#1A1A1A', flex: 1 },
  cartBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFD8C4' },
  cartIcon: { fontSize: 18 },
  cartBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: '#FF4500', borderRadius: 8, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2, borderWidth: 1.5, borderColor: '#fff' },
  cartBadgeTxt: { color: '#fff', fontSize: 9, fontWeight: '900' },

  infoBanner: { backgroundColor: '#fff', padding: 20, marginBottom: 8 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  infoPill: { backgroundColor: '#F0F9F0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  infoPillTxt: { fontSize: 12, fontWeight: '700', color: '#2D6A4F' },
  locationTxt: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 6 },
  descTxt: { fontSize: 14, color: '#555', lineHeight: 20 },

  categoriesRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  catChip: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#F0F0F0', borderRadius: 20, marginRight: 8 },
  catChipActive: { backgroundColor: '#FF4500' },
  catChipTxt: { fontSize: 13, fontWeight: '700', color: '#666' },
  catChipTxtActive: { color: '#fff' },

  section: { paddingHorizontal: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A1A' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  menuCard: {
    width: CARD_W, backgroundColor: '#fff', borderRadius: 18, padding: 12, margin: 6,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
    borderWidth: 1, borderColor: '#F5F5F5',
  },
  menuImgWrap: { width: '100%', height: 120, borderRadius: 14, overflow: 'hidden', backgroundColor: '#F7F8FA', marginBottom: 10 },
  fillImg: { width: '100%', height: '100%' },
  menuImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF5F0' },
  qtyBadge: { position: 'absolute', top: 6, right: 6, backgroundColor: '#FF4500', borderRadius: 10, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  qtyBadgeTxt: { color: '#fff', fontSize: 11, fontWeight: '900' },
  itemCategory: { fontSize: 10, color: '#FF4500', fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  prepTime: { fontSize: 10, color: '#999', fontWeight: '600', marginBottom: 4 },
  itemName: { fontSize: 13, fontWeight: '700', color: '#1A1A1A', marginBottom: 4, lineHeight: 18 },
  itemBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4 },
  itemPrice: { fontSize: 15, fontWeight: '900', color: '#FF4500' },
  itemOldPrice: { fontSize: 10, color: '#CCC', textDecorationLine: 'line-through' },
  addCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FF4500', justifyContent: 'center', alignItems: 'center', elevation: 3 },
  addCircleTxt: { color: '#fff', fontSize: 22, fontWeight: '700', lineHeight: 26 },

  emptyState: { paddingVertical: 60, alignItems: 'center' },
  emptyTxt: { fontSize: 16, color: '#999', fontWeight: '600' },

  oosOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  oosText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  closedBanner: {
    backgroundColor: '#FFF1F1',
    padding: 15,
    borderRadius: 15,
    marginTop: 15,
    borderWidth: 1,
    borderColor: '#FFE0E0',
    alignItems: 'center',
  },
  closedBannerTxt: {
    color: '#D32F2F',
    fontWeight: '900',
    fontSize: 14,
  },
  closedReopenTxt: {
    color: '#666',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  addCircleDisabled: {
    backgroundColor: '#E2E8F0',
    opacity: 0.6,
  },
  addCircleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    lineHeight: 26,
  },
  heartBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#FFF0F0', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#FFD8C4', marginLeft: 8,
  },
  heartBtnIcon: { fontSize: 20 },
});
