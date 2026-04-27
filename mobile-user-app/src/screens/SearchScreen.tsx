import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Pressable, Image as RNImage,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  productsApi, restaurantsApi, brandsApi, categoriesApi, homeApi, normalizeUrl,
} from '../api/api';
import ProductCard from '../components/home/ProductCard';
import StoreCard from '../components/home/StoreCard';
import {
  AppText, AppIconButton, AppSearchBar, EmptyState, SkeletonBlock,
} from '../components/ui';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { theme } from '../theme/theme';

const RECENT_KEY = '@recent_searches';
const RECENT_MAX = 10;
const TRENDING_FALLBACK_MART = ['Milk', 'Eggs', 'Bread', 'Atta', 'Cooking Oil', 'Sugar'];
const TRENDING_FALLBACK_FOOD = ['Pizza', 'Biryani', 'Burger', 'Karahi', 'Desserts', 'Drinks'];

type Tab = 'all' | 'products' | 'shops' | 'restaurants' | 'categories';
type Mode = 'mart' | 'food';

const MART_TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'all', label: 'All', icon: 'apps' },
  { id: 'products', label: 'Products', icon: 'pricetag' },
  { id: 'shops', label: 'Brands', icon: 'storefront' },
  { id: 'categories', label: 'Categories', icon: 'grid' },
];

const FOOD_TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'restaurants', label: 'Restaurants', icon: 'restaurant' },
];

export default function SearchScreen({ navigation, route }: any) {
  const initialMode: Mode = route?.params?.mode === 'food' ? 'food' : 'mart';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [tab, setTab] = useState<Tab>(initialMode === 'food' ? 'restaurants' : 'all');

  // Active tabs depend on mode — food shows only restaurants, mart shows products/shops/categories
  const TABS = mode === 'food' ? FOOD_TABS : MART_TABS;
  const [query, setQuery] = useState('');

  const [products, setProducts] = useState<any[]>([]);
  const [shopsResults, setShopsResults] = useState<any[]>([]);
  const [restaurantsResults, setRestaurantsResults] = useState<any[]>([]);
  const [popularShops, setPopularShops] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState(true);

  const [recent, setRecent] = useState<string[]>([]);
  const [trending, setTrending] = useState<string[]>(
    initialMode === 'food' ? TRENDING_FALLBACK_FOOD : TRENDING_FALLBACK_MART,
  );

  const { martCart, foodCart, addToCart, updateQuantity } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();

  const debounceRef = useRef<any>(null);

  // Cart quantities for whichever mode is active
  const cartQuantities = useMemo(() => {
    const cart = mode === 'mart' ? martCart : foodCart;
    const q: Record<string, number> = {};
    cart.forEach((it: any) => { q[it.id] = it.quantity; });
    return q;
  }, [martCart, foodCart, mode]);

  // ── Load recent + meta (brands/restaurants/categories + trending) ──
  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then(raw => {
      if (raw) try { setRecent(JSON.parse(raw)); } catch {}
    });
  }, []);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
      // Pull lightweight discovery data only — popular shops + categories + trending.
      // Full lists are no longer loaded up-front; tab-specific results use server search.
      const [brandsRes, catsRes, homeRes] = await Promise.all([
        brandsApi.search('', mode === 'food' ? 'restaurant' : 'mart', 1, 12).catch(() => ({ data: { data: [] } })),
        categoriesApi.getAll(mode === 'food' ? 'food' : 'mart').catch(() => ({ data: [] })),
        homeApi.getHome(mode).catch(() => null),
      ]);
      const brandsData: any = brandsRes.data;
      const popular = Array.isArray(brandsData) ? brandsData : (brandsData?.data || []);
      setPopularShops(popular.filter((b: any) => b.isActive !== false));
      setCategories((catsRes.data || []).filter((c: any) => c.isActive !== false));
      const t: any = homeRes?.data?.trending;
      if (Array.isArray(t) && t.length) setTrending(t);
      else setTrending(mode === 'food' ? TRENDING_FALLBACK_FOOD : TRENDING_FALLBACK_MART);
    } finally {
      setLoadingMeta(false);
    }
  }, [mode]);

  useEffect(() => { loadMeta(); }, [loadMeta]);

  // ── Debounced server-side search across products, shops, restaurants ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProducts([]);
      setShopsResults([]);
      setRestaurantsResults([]);
      setLoadingProducts(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        if (mode === 'food') {
          // Food mode: only search restaurants
          const rRes = await restaurantsApi.search(trimmed, 1, 30).catch(() => ({ data: { data: [] } }));
          const rData: any = rRes.data || {};
          setRestaurantsResults(Array.isArray(rData) ? rData : (rData.data || []));
          setProducts([]); setShopsResults([]);
        } else {
          // Mart mode: search products + brands; no restaurants
          const [pRes, bRes] = await Promise.all([
            productsApi.search(trimmed, 1, 30).catch(() => ({ data: { data: [] } })),
            brandsApi.search(trimmed, 'mart', 1, 20).catch(() => ({ data: { data: [] } })),
          ]);
          const pData: any = pRes.data || {};
          const bData: any = bRes.data || {};
          setProducts(Array.isArray(pData) ? pData : (pData.data || []));
          setShopsResults(Array.isArray(bData) ? bData : (bData.data || []));
          setRestaurantsResults([]);
        }
      } catch {
        setProducts([]); setShopsResults([]); setRestaurantsResults([]);
      } finally {
        setLoadingProducts(false);
      }
    }, 350);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [query]);

  // ── Recent search persistence ──
  const commitRecent = useCallback(async (term: string) => {
    const t = term.trim();
    if (t.length < 2) return;
    setRecent(prev => {
      const next = [t, ...prev.filter(x => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX);
      AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const clearRecent = useCallback(async () => {
    setRecent([]);
    await AsyncStorage.removeItem(RECENT_KEY).catch(() => {});
  }, []);

  // ── Cart handlers ──
  const handleAdd = useCallback((p: any) => {
    if ((p.stock ?? p.stockQuantity ?? 1) <= 0) return;
    addToCart(p, mode);
    commitRecent(query);
  }, [addToCart, mode, commitRecent, query]);

  const handleIncrement = useCallback((p: any) => addToCart(p, mode), [addToCart, mode]);
  const handleDecrement = useCallback((p: any) => {
    const cur = cartQuantities[p.id] || 0;
    updateQuantity(p.id, Math.max(0, cur - 1), mode);
  }, [cartQuantities, updateQuantity, mode]);

  const handleFav = useCallback((p: any) => {
    toggleFavourite({
      id: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price, discount: p.discount,
      category: p.category, brand: p.brand, openingTime: p.openingTime, closingTime: p.closingTime,
      maxQuantityPerOrder: p.maxQuantityPerOrder, stockQuantity: p.stockQuantity,
    }, 'products');
  }, [toggleFavourite]);

  // ── Local-only filtered data (categories — small list, fine to filter client-side) ──
  const q = query.trim().toLowerCase();
  const matchString = (s?: string | null) => (s || '').toLowerCase().includes(q);
  const filteredShops = shopsResults;
  const filteredRestaurants = restaurantsResults;
  const filteredCategories = useMemo(
    () => q.length < 2 ? [] : categories.filter((c: any) => matchString(c.name)),
    [categories, q],
  );

  const showSuggestions = q.length < 2;
  const isSearching = !showSuggestions;

  // ── Render helpers ──
  const renderProduct = useCallback(({ item }: { item: any }) => (
    <View style={styles.gridItem}>
      <ProductCard
        product={item}
        cartQty={cartQuantities[item.id] || 0}
        variant="grid"
        isFavourite={isFavourite(item.id, 'products')}
        onAdd={() => handleAdd(item)}
        onIncrement={() => handleIncrement(item)}
        onDecrement={() => handleDecrement(item)}
        onToggleFavourite={() => handleFav(item)}
      />
    </View>
  ), [cartQuantities, isFavourite, handleAdd, handleIncrement, handleDecrement, handleFav]);

  const renderShop = useCallback(({ item }: { item: any }) => (
    <StoreCard
      store={item}
      variant="list"
      onPress={() => navigation.navigate('BrandDetail', { brandId: item.id })}
      isFavourite={isFavourite(item.id, 'restaurants')}
      onToggleFavourite={() => toggleFavourite({
        id: item.id, name: item.name, imageUrl: item.imageUrl || item.logoUrl,
      }, 'restaurants')}
    />
  ), [navigation, isFavourite, toggleFavourite]);

  const renderRestaurant = useCallback(({ item }: { item: any }) => (
    <StoreCard
      store={{ ...item, hasDeal: item.hasDeal || item.discountPercent > 0 }}
      variant="list"
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
      isFavourite={isFavourite(item.id, 'restaurants')}
      onToggleFavourite={() => toggleFavourite({
        id: item.id, name: item.name, imageUrl: item.imageUrl,
        cuisineType: item.cuisineType, rating: item.rating,
      }, 'restaurants')}
    />
  ), [navigation, isFavourite, toggleFavourite]);

  const renderCategory = useCallback(({ item }: { item: any }) => {
    const img = normalizeUrl(item.imageUrl || item.iconUrl);
    return (
      <Pressable
        onPress={() => navigation.navigate('ProductListing', {
          mode: 'category', id: item.id, title: item.name,
        })}
        style={({ pressed }) => [styles.catRow, pressed ? { opacity: 0.92 } : null]}
      >
        <View style={styles.catThumb}>
          {img ? <Image source={{ uri: img }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" /> :
            <Ionicons name="grid" size={22} color={theme.colors.textSecondary} />}
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="title" numberOfLines={1}>{item.name}</AppText>
          {item.description ? (
            <AppText variant="caption" numberOfLines={1}>{item.description}</AppText>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={theme.colors.textSecondary} />
      </Pressable>
    );
  }, [navigation]);

  // ── Suggestions view ──
  const Suggestions = () => (
    <View style={{ flex: 1 }}>
      {recent.length > 0 && (
        <View style={styles.suggestionBlock}>
          <View style={styles.suggestionHeader}>
            <AppText variant="title">Recent searches</AppText>
            <Pressable onPress={clearRecent} hitSlop={8}>
              <AppText variant="captionStrong" color={theme.colors.primary}>Clear</AppText>
            </Pressable>
          </View>
          <View style={styles.tagWrap}>
            {recent.map(term => (
              <Pressable key={term} style={styles.tag} onPress={() => setQuery(term)}>
                <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                <AppText variant="captionStrong">{term}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.suggestionBlock}>
        <AppText variant="title">Trending</AppText>
        <View style={styles.tagWrap}>
          {trending.map(term => (
            <Pressable key={term} style={[styles.tag, styles.tagTrending]} onPress={() => setQuery(term)}>
              <Ionicons name="flame" size={14} color={theme.colors.discount} />
              <AppText variant="captionStrong" color={theme.colors.discount}>{term}</AppText>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Quick discovery */}
      {!loadingMeta && popularShops.length > 0 ? (
        <View style={styles.suggestionBlock}>
          <AppText variant="title">Popular Brands</AppText>
          <FlatList
            data={popularShops.slice(0, 8)}
            keyExtractor={(b) => b.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: theme.spacing.sm }}
            renderItem={({ item }) => (
              <StoreCard
                store={item}
                variant="wide"
                onPress={() => navigation.navigate('BrandDetail', { brandId: item.id })}
              />
            )}
          />
        </View>
      ) : null}
    </View>
  );

  // ── Active list rendering (mode-aware, stable keys to avoid numColumns crash) ──
  const renderActiveList = () => {
    // Food mode: restaurants only
    if (mode === 'food') {
      return (
        <FlatList
          key="food-restaurants"
          data={restaurantsResults}
          keyExtractor={(r) => r.id}
          renderItem={renderRestaurant}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            loadingProducts ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={theme.colors.food} />
                <AppText variant="caption" color={theme.colors.textSecondary}>Searching restaurants…</AppText>
              </View>
            ) : restaurantsResults.length > 0 ? (
              <AppText variant="title" style={styles.sectionTitle}>
                {restaurantsResults.length} restaurant{restaurantsResults.length !== 1 ? 's' : ''}
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            !loadingProducts ? (
              <EmptyState
                icon="restaurant-outline"
                title="No restaurants found"
                subtitle={`No restaurants match "${query}".`}
              />
            ) : null
          }
        />
      );
    }

    // Mart mode tabs
    if (tab === 'shops') {
      return (
        <FlatList
          key="mart-shops"
          data={filteredShops}
          keyExtractor={(b) => b.id}
          renderItem={renderShop}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingProducts ? (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            ) : <EmptyState icon="storefront-outline" title="No brands found" subtitle={`No brands match "${query}".`} />
          }
        />
      );
    }
    if (tab === 'categories') {
      return (
        <FlatList
          key="mart-categories"
          data={filteredCategories}
          keyExtractor={(c) => c.id}
          renderItem={renderCategory}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="grid-outline" title="No categories" subtitle={`No categories match "${query}".`} />}
        />
      );
    }

    // 'all' or 'products' — uses 2-column grid; always keyed to avoid numColumns crash
    const showOthers = tab === 'all';
    return (
      <FlatList
        key="mart-products-grid"
        data={tab === 'all' ? products.slice(0, 30) : products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View>
            {showOthers && filteredShops.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="title" style={styles.sectionTitle}>Brands</AppText>
                {filteredShops.slice(0, 3).map(item => (
                  <View key={item.id}>{renderShop({ item } as any)}</View>
                ))}
                {filteredShops.length > 3 ? (
                  <Pressable onPress={() => setTab('shops')} style={styles.seeAll}>
                    <AppText variant="captionStrong" color={theme.colors.primary}>
                      See all {filteredShops.length} brands →
                    </AppText>
                  </Pressable>
                ) : null}
              </View>
            ) : null}

            {showOthers && filteredCategories.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="title" style={styles.sectionTitle}>Categories</AppText>
                {filteredCategories.slice(0, 3).map(item => (
                  <View key={item.id}>{renderCategory({ item } as any)}</View>
                ))}
              </View>
            ) : null}

            {products.length > 0 && (
              <AppText variant="title" style={styles.sectionTitle}>
                {products.length} {products.length === 1 ? 'product' : 'products'}
              </AppText>
            )}
          </View>
        }
        ListEmptyComponent={
          loadingProducts ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={theme.colors.primary} />
              <AppText variant="caption" color={theme.colors.textSecondary}>Searching…</AppText>
            </View>
          ) : (
            <EmptyState
              icon="search-outline"
              title="No results found"
              subtitle={`We couldn't find anything for "${query}".`}
            />
          )
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} onPress={() => navigation.goBack()} bg={theme.colors.surfaceMuted}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1 }}>
          <AppSearchBar
            mode="editable"
            placeholder={mode === 'mart' ? 'Search groceries, brands & shops' : 'Search restaurants & dishes'}
            value={query}
            onChangeText={setQuery}
            onSubmit={(t) => commitRecent(t)}
            autoFocus
            trailingFilter={false}
          />
        </View>
      </View>

      {/* Mode switch (Mart / Food) */}
      <View style={styles.modeRow}>
        {(['mart', 'food'] as Mode[]).map(m => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setTab(m === 'food' ? 'restaurants' : 'all');
                setProducts([]); setShopsResults([]); setRestaurantsResults([]);
              }}
              style={[styles.modePill, active ? { backgroundColor: m === 'food' ? theme.colors.food : theme.colors.primary } : null]}
            >
              <Ionicons
                name={m === 'mart' ? 'basket' : 'restaurant'}
                size={14}
                color={active ? '#fff' : theme.colors.textSecondary}
              />
              <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textSecondary}>
                {m === 'mart' ? 'Groceries' : 'Food'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* Tabs */}
      {isSearching ? (
        <View style={styles.tabsWrap}>
          <FlatList
            data={TABS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(t) => t.id}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 6 }}
            renderItem={({ item }) => {
              const active = tab === item.id;
              return (
                <Pressable
                  onPress={() => setTab(item.id)}
                  style={[styles.tab, active ? styles.tabActive : null]}
                >
                  <Ionicons name={item.icon} size={14} color={active ? theme.colors.primary : theme.colors.textSecondary} />
                  <AppText
                    variant="captionStrong"
                    color={active ? theme.colors.primary : theme.colors.textSecondary}
                  >
                    {item.label}
                  </AppText>
                </Pressable>
              );
            }}
          />
        </View>
      ) : null}

      {showSuggestions ? <Suggestions /> : renderActiveList()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fill: { width: '100%', height: '100%' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
  },

  modeRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.divider,
  },
  modePill: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },

  tabsWrap: {
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderColor: theme.colors.divider,
  },
  tab: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  tabActive: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },

  loadingWrap: { padding: 36, alignItems: 'center', gap: theme.spacing.sm },

  suggestionBlock: { paddingHorizontal: theme.spacing.lg, paddingTop: theme.spacing.lg },
  suggestionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.sm },
  tag: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  tagTrending: { backgroundColor: theme.colors.dangerLight, borderColor: theme.colors.discount },

  listContent: { paddingVertical: theme.spacing.sm, paddingBottom: 120 },
  gridRow: { paddingHorizontal: theme.spacing.sm },
  gridItem: { flex: 1 },

  section: { marginBottom: theme.spacing.lg },
  sectionTitle: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },
  separator: { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: theme.spacing.lg },
  seeAll: { paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm },

  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface, gap: theme.spacing.md,
  },
  catThumb: {
    width: 48, height: 48, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
  },
});
