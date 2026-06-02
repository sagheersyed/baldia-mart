import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Pressable, Image, ActivityIndicator,
  RefreshControl, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  moduleEventsApi, productsApi, pharmaApi, normalizeUrl, menuItemsApi,
} from '../api/api';
import { useCartStore } from '../store/cartStore';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import AppText from '../components/ui/AppText';
import ProductCard, { ProductCardProduct } from '../components/home/ProductCard';
import { theme } from '../theme/theme';

const { width: SCREEN_W } = Dimensions.get('window');
const BANNER_H = 220;

export default function EventDetailsScreen({ route, navigation }: any) {
  const { eventId } = route.params || {};
  const [event, setEvent] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const { activeMode, setActiveMode } = useCartStore();
  const { martCart, foodCart, pharmaCart, addToCart, updateQuantity, getCartCount } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();

  const isPharma = event?.section === 'pharma';
  const isFood = event?.section === 'food';
  const ACCENT = isPharma ? theme.colors.pharma : (isFood ? theme.colors.food : theme.colors.primary);
  
  const sectionMode = isPharma ? 'pharma' : (isFood ? 'food' : 'mart');
  const cartCount = getCartCount(sectionMode);

  // Compute cart quantities
  const cartQuantities = useMemo(() => {
    const q: Record<string, number> = {};
    const cart = isPharma ? pharmaCart : (isFood ? foodCart : martCart);
    cart.forEach((item: any) => { q[item.id] = item.quantity; });
    return q;
  }, [martCart, foodCart, pharmaCart, isPharma, isFood]);

  const fetchEvent = useCallback(async () => {
    try {
      const res = await moduleEventsApi.getById(eventId);
      const ev = res.data;
      setEvent(ev);
      return ev;
    } catch (e) {
      console.warn('[EventDetails] error fetching event', e);
      return null;
    }
  }, [eventId]);

  const fetchItems = useCallback(async (ev: any) => {
    if (!ev?.itemIds?.length) {
      setItems([]);
      return;
    }

    try {
      const idsString = ev.itemIds.join(',');
      if (ev.section === 'pharma') {
        const res = await pharmaApi.searchMedicines('', 1, 50, { ids: idsString });
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setItems(raw);
      } else if (ev.section === 'food') {
        const res = await menuItemsApi.getByIds(idsString);
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setItems(raw);
      } else {
        const res = await productsApi.list({ ids: idsString, limit: 50 } as any);
        const raw = Array.isArray(res.data) ? res.data : (res.data?.data || []);
        setItems(raw);
      }
    } catch (e) {
      console.warn('[EventDetails] error fetching items', e);
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const ev = await fetchEvent();
    if (ev) await fetchItems(ev);
    setLoading(false);
    setRefreshing(false);
  }, [fetchEvent, fetchItems]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const onRefresh = () => { setRefreshing(true); loadAll(); };

  const tags = useMemo(() => {
    if (!event?.tags) return [];
    return event.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }, [event?.tags]);

  // Cart operations
  const handleAdd = useCallback((prod: any) => {
    if ((prod.stock ?? prod.stockQuantity ?? 1) <= 0) return;
    setActiveMode(sectionMode);
    addToCart(prod, sectionMode);
  }, [addToCart, sectionMode, setActiveMode]);

  const handleIncrement = useCallback((prod: any) => {
    setActiveMode(sectionMode);
    addToCart(prod, sectionMode);
  }, [addToCart, sectionMode, setActiveMode]);

  const handleDecrement = useCallback((prod: any) => {
    setActiveMode(sectionMode);
    const current = cartQuantities[prod.id] || 0;
    updateQuantity(prod.id, Math.max(0, current - 1), sectionMode);
  }, [cartQuantities, updateQuantity, sectionMode, setActiveMode]);

  const handleToggleFav = useCallback((prod: any) => {
    toggleFavourite({
      id: prod.id, name: prod.name, imageUrl: prod.imageUrl, price: prod.price || prod.mrp || 0,
      discount: prod.discount || 0, category: prod.category, brand: prod.brand,
      openingTime: prod.openingTime, closingTime: prod.closingTime,
      maxQuantityPerOrder: prod.maxQuantityPerOrder, stockQuantity: prod.stockQuantity,
      isPharma,
    }, 'products');
  }, [toggleFavourite, isPharma]);

  const isFav = useCallback((id: string) => isFavourite(id, 'products'), [isFavourite]);

  const renderItem = useCallback(({ item }: { item: any }) => {
    return (
      <View style={styles.gridItem}>
        <ProductCard
          product={item}
          cartQty={cartQuantities[item.id] || 0}
          variant="grid"
          isFavourite={isFav(item.id)}
          onAdd={() => handleAdd(item)}
          onIncrement={() => handleIncrement(item)}
          onDecrement={() => handleDecrement(item)}
          onToggleFavourite={() => handleToggleFav(item)}
          tint={ACCENT}
        />
      </View>
    );
  }, [cartQuantities, isFav, handleAdd, handleIncrement, handleDecrement, handleToggleFav, ACCENT]);

  const ListHeader = useMemo(() => {
    if (!event) return null;
    const bannerImg = normalizeUrl(event.imageUrl);

    return (
      <View style={styles.headerContainer}>
        {/* Banner */}
        <View style={styles.bannerContainer}>
          {bannerImg ? (
            <>
              <Image
                source={{ uri: bannerImg }}
                style={StyleSheet.absoluteFillObject}
                blurRadius={25}
                resizeMode="cover"
              />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />
              <Image
                source={{ uri: bannerImg }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            </>
          ) : (
            <LinearGradient
              colors={[ACCENT, ACCENT + 'AA']}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          {/* Back button overlay */}
          <Pressable
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={12}
          >
            <View style={styles.backBtnBlur}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </View>
          </Pressable>
        </View>

        {/* Event Info */}
        <View style={styles.infoSection}>
          <AppText variant="h2" style={{ marginBottom: 4 }}>{event.title}</AppText>

          {tags.length > 0 && (
            <View style={styles.tagsRow}>
              {tags.map((tag: string, i: number) => (
                <View key={i} style={[styles.tagChip, { backgroundColor: ACCENT + '15', borderColor: ACCENT + '30' }]}>
                  <AppText variant="badge" color={ACCENT} style={{ fontSize: 10, textTransform: 'capitalize' }}>
                    {tag}
                  </AppText>
                </View>
              ))}
            </View>
          )}

          {event.description && (
            <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 8, lineHeight: 20 }}>
              {event.description}
            </AppText>
          )}

          {event.startDate && event.endDate && (
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={14} color={theme.colors.textMuted} />
              <AppText variant="caption" color={theme.colors.textMuted} style={{ marginLeft: 4 }}>
                {new Date(event.startDate).toLocaleDateString()} — {new Date(event.endDate).toLocaleDateString()}
              </AppText>
            </View>
          )}
        </View>

        {/* Section Header */}
        {items.length > 0 && (
          <View style={styles.sectionHeader}>
            <AppText variant="h3">{isPharma ? 'Campaign Medicines' : isFood ? 'Campaign Dishes' : 'Campaign Products'}</AppText>
            <AppText variant="caption" color={theme.colors.textMuted}>{items.length} items</AppText>
          </View>
        )}
      </View>
    );
  }, [event, tags, items.length, ACCENT, isPharma, navigation]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ACCENT} />
          <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
            Loading event...
          </AppText>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.colors.textMuted} />
          <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
            Event not found
          </AppText>
          <Pressable
            style={[styles.retryBtn, { borderColor: theme.colors.border }]}
            onPress={() => navigation.goBack()}
          >
            <AppText variant="bodyStrong" color={theme.colors.textPrimary}>Go Back</AppText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <StatusBar barStyle="light-content" />
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        renderItem={renderItem}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={10}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ACCENT} />
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <Ionicons name="basket-outline" size={48} color={theme.colors.textMuted} />
            <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: 12 }}>
              No items in this campaign yet
            </AppText>
          </View>
        }
      />

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <Pressable
          style={[styles.floatingCart, { backgroundColor: ACCENT, shadowColor: ACCENT }]}
          onPress={() => {
            setActiveMode(sectionMode);
            navigation.navigate('Cart');
          }}
        >
          <View style={styles.cartIconBadge}>
            <Ionicons name="cart" size={24} color="#fff" />
            <View style={styles.badge}>
              <AppText variant="badge" color={ACCENT}>{cartCount}</AppText>
            </View>
          </View>
          <AppText variant="bodyStrong" color="#fff" style={{ marginLeft: 12 }}>
            View {isPharma ? 'pharma' : isFood ? 'food' : ''} cart
          </AppText>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  bannerContainer: {
    width: '100%',
    height: BANNER_H,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  backBtn: {
    position: 'absolute',
    top: 48,
    left: 16,
    zIndex: 10,
  },
  backBtnBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  headerContainer: {},
  infoSection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.divider,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listContent: { 
    paddingBottom: 110,
  },
  row: { 
    justifyContent: 'space-between', 
    paddingHorizontal: 6,
  },
  gridItem: { 
    flex: 1,
  },
  floatingCart: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 100,
  },
  cartIconBadge: {
    width: 44,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
});
