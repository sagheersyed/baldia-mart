import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, ActivityIndicator, Pressable,
  ScrollView, TextInput, Keyboard,
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
import { AppText, AppIconButton, EmptyState, SkeletonBlock } from '../components/ui';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { theme } from '../theme/theme';

const RECENT_KEY = '@recent_searches';
const RECENT_MAX = 10;
const TRENDING_FALLBACK_MART = ['Milk', 'Eggs', 'Bread', 'Atta', 'Cooking Oil', 'Sugar', 'Chicken', 'Rice'];
const TRENDING_FALLBACK_FOOD = ['Pizza', 'Biryani', 'Burger', 'Karahi', 'Desserts', 'Drinks'];

type Tab = 'all' | 'products' | 'shops' | 'restaurants' | 'categories';
type Mode = 'mart' | 'food';

const MART_TABS: { id: Tab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'products', label: 'Products' },
  { id: 'shops', label: 'Brands' },
  { id: 'categories', label: 'Categories' },
];

const FOOD_TABS: { id: Tab; label: string }[] = [
  { id: 'restaurants', label: 'Restaurants' },
];

export default function SearchScreen({ navigation, route }: any) {
  const initialMode: Mode = route?.params?.mode === 'food' ? 'food' : 'mart';
  const [mode, setMode] = useState<Mode>(initialMode);
  const [tab, setTab] = useState<Tab>(initialMode === 'food' ? 'restaurants' : 'all');
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

  const inputRef = useRef<TextInput>(null);
  const { martCart, foodCart, addToCart, updateQuantity } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();
  const debounceRef = useRef<any>(null);

  const cartQuantities = useMemo(() => {
    const cart = mode === 'mart' ? martCart : foodCart;
    const q: Record<string, number> = {};
    cart.forEach((it: any) => { q[it.id] = it.quantity; });
    return q;
  }, [martCart, foodCart, mode]);

  useEffect(() => {
    AsyncStorage.getItem(RECENT_KEY).then(raw => {
      if (raw) try { setRecent(JSON.parse(raw)); } catch {}
    });
    setTimeout(() => inputRef.current?.focus(), 150);
  }, []);

  const loadMeta = useCallback(async () => {
    setLoadingMeta(true);
    try {
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

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setProducts([]); setShopsResults([]); setRestaurantsResults([]);
      setLoadingProducts(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoadingProducts(true);
      try {
        if (mode === 'food') {
          const rRes = await restaurantsApi.search(trimmed, 1, 30).catch(() => ({ data: { data: [] } }));
          const rData: any = rRes.data || {};
          setRestaurantsResults(Array.isArray(rData) ? rData : (rData.data || []));
          setProducts([]); setShopsResults([]);
        } else {
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
  }, [query, mode]);

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

  const q = query.trim().toLowerCase();
  const filteredCategories = useMemo(
    () => q.length < 2 ? [] : categories.filter((c: any) => (c.name || '').toLowerCase().includes(q)),
    [categories, q],
  );

  const showSuggestions = query.trim().length < 2;
  const accent = mode === 'food' ? theme.colors.food : theme.colors.primary;

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
        tint={accent}
      />
    </View>
  ), [cartQuantities, isFavourite, handleAdd, handleIncrement, handleDecrement, handleFav, accent]);

  const renderShop = useCallback(({ item }: { item: any }) => (
    <StoreCard
      store={item}
      variant="list"
      onPress={() => navigation.navigate('BrandDetail', { brandId: item.id })}
      isFavourite={isFavourite(item.id, 'brands')}
      onToggleFavourite={() => toggleFavourite(
        { id: item.id, name: item.name, imageUrl: item.imageUrl || item.logoUrl },
        'brands',
      )}
    />
  ), [navigation, isFavourite, toggleFavourite]);

  const renderRestaurant = useCallback(({ item }: { item: any }) => (
    <StoreCard
      store={{ ...item, hasDeal: item.hasDeal || item.discountPercent > 0 }}
      variant="list"
      onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
      isFavourite={isFavourite(item.id, 'restaurants')}
      onToggleFavourite={() => toggleFavourite(
        { id: item.id, name: item.name, imageUrl: item.imageUrl, cuisineType: item.cuisineType, rating: item.rating },
        'restaurants',
      )}
    />
  ), [navigation, isFavourite, toggleFavourite]);

  const renderCategory = useCallback(({ item }: { item: any }) => {
    const img = normalizeUrl(item.imageUrl || item.iconUrl);
    return (
      <Pressable
        onPress={() => navigation.navigate('ProductListing', { mode: 'category', id: item.id, title: item.name })}
        style={({ pressed }) => [styles.catRow, pressed ? { opacity: 0.8 } : null]}
      >
        <View style={styles.catThumb}>
          {img
            ? <Image source={{ uri: img }} style={styles.fill} contentFit="cover" cachePolicy="memory-disk" />
            : <Ionicons name="grid" size={22} color={theme.colors.textSecondary} />
          }
        </View>
        <AppText variant="title" style={{ flex: 1 }} numberOfLines={1}>{item.name}</AppText>
        <Ionicons name="chevron-forward" size={16} color={theme.colors.textSecondary} />
      </Pressable>
    );
  }, [navigation]);

  // ── Suggestions view ──
  const SuggestionsView = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Recent searches */}
      {recent.length > 0 && (
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <AppText variant="title">Recent searches</AppText>
            <Pressable onPress={clearRecent} hitSlop={8}>
              <AppText variant="captionStrong" color={accent}>Clear all</AppText>
            </Pressable>
          </View>
          <View style={styles.chipWrap}>
            {recent.map(term => (
              <Pressable
                key={term}
                style={styles.chip}
                onPress={() => { setQuery(term); inputRef.current?.blur(); }}
              >
                <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
                <AppText variant="caption" style={{ marginLeft: 4 }}>{term}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Trending */}
      <View style={styles.block}>
        <View style={styles.blockHeader}>
          <AppText variant="title">🔥 Trending</AppText>
        </View>
        <View style={styles.chipWrap}>
          {loadingMeta
            ? [1, 2, 3, 4, 5].map(i => <SkeletonBlock key={i} width={80} height={32} radius={99} />)
            : trending.map(term => (
              <Pressable
                key={term}
                style={[styles.chip, styles.chipTrending]}
                onPress={() => { setQuery(term); inputRef.current?.blur(); }}
              >
                <AppText variant="captionStrong" color={accent}>{term}</AppText>
              </Pressable>
            ))
          }
        </View>
      </View>

      {/* Popular brands/restaurants */}
      {!loadingMeta && popularShops.length > 0 && (
        <View style={styles.block}>
          <View style={styles.blockHeader}>
            <AppText variant="title">
              {mode === 'food' ? '🍽️ Popular Restaurants' : '🏪 Popular Brands'}
            </AppText>
          </View>
          <FlatList
            data={popularShops.slice(0, 8)}
            keyExtractor={(b) => b.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 8, gap: 12 }}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <StoreCard
                store={item}
                variant="wide"
                onPress={() => {
                  if (mode === 'food') navigation.navigate('RestaurantDetail', { restaurantId: item.id });
                  else navigation.navigate('BrandDetail', { brandId: item.id });
                }}
              />
            )}
          />
        </View>
      )}
    </ScrollView>
  );

  // ── Results list ──
  const ResultsList = () => {
    if (mode === 'food') {
      return (
        <FlatList
          key="food-restaurants"
          data={restaurantsResults}
          keyExtractor={(r) => r.id}
          renderItem={renderRestaurant}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            loadingProducts ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator size="small" color={accent} />
                <AppText variant="caption" color={theme.colors.textSecondary}> Searching restaurants…</AppText>
              </View>
            ) : restaurantsResults.length > 0 ? (
              <AppText variant="captionStrong" style={styles.resultCount}>
                {restaurantsResults.length} restaurant{restaurantsResults.length !== 1 ? 's' : ''}
              </AppText>
            ) : null
          }
          ListEmptyComponent={
            !loadingProducts ? (
              <EmptyState icon="restaurant-outline" title="No restaurants found" subtitle={`Nothing matched "${query}"`} />
            ) : null
          }
        />
      );
    }

    if (tab === 'shops') {
      return (
        <FlatList
          key="mart-shops"
          data={shopsResults}
          keyExtractor={(b) => b.id}
          renderItem={renderShop}
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            loadingProducts
              ? <View style={styles.loadingRow}><ActivityIndicator size="small" color={accent} /></View>
              : <EmptyState icon="storefront-outline" title="No brands found" subtitle={`Nothing matched "${query}"`} />
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
          keyboardShouldPersistTaps="handled"
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={<EmptyState icon="grid-outline" title="No categories" subtitle={`Nothing matched "${query}"`} />}
        />
      );
    }

    // 'all' or 'products' — 2-col product grid
    const showOthers = tab === 'all';
    return (
      <FlatList
        key="mart-products-grid"
        data={tab === 'all' ? products.slice(0, 30) : products}
        keyExtractor={(item) => item.id}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        initialNumToRender={8}
        maxToRenderPerBatch={10}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <View>
            {showOthers && shopsResults.length > 0 && (
              <View style={styles.inlineSection}>
                <AppText variant="title" style={styles.inlineSectionTitle}>Brands</AppText>
                {shopsResults.slice(0, 3).map(item => (
                  <View key={item.id}>{renderShop({ item } as any)}</View>
                ))}
                {shopsResults.length > 3 && (
                  <Pressable onPress={() => setTab('shops')} style={styles.seeAll}>
                    <AppText variant="captionStrong" color={accent}>See all {shopsResults.length} brands →</AppText>
                  </Pressable>
                )}
              </View>
            )}
            {showOthers && filteredCategories.length > 0 && (
              <View style={styles.inlineSection}>
                <AppText variant="title" style={styles.inlineSectionTitle}>Categories</AppText>
                {filteredCategories.slice(0, 3).map(item => (
                  <View key={item.id}>{renderCategory({ item } as any)}</View>
                ))}
              </View>
            )}
            {products.length > 0 && (
              <AppText variant="captionStrong" style={styles.resultCount}>
                {products.length} product{products.length !== 1 ? 's' : ''}
              </AppText>
            )}
          </View>
        }
        ListEmptyComponent={
          loadingProducts
            ? <View style={styles.loadingRow}><ActivityIndicator size="small" color={accent} /><AppText variant="caption" color={theme.colors.textSecondary}> Searching…</AppText></View>
            : <EmptyState icon="search-outline" title="No results found" subtitle={`Nothing matched "${query}"`} />
        }
      />
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      {/* ── Search bar header ── */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={theme.colors.textPrimary} />
        </Pressable>

        <View style={[styles.searchBox, { borderColor: accent }]}>
          <Ionicons name="search" size={18} color={accent} style={{ marginLeft: 12 }} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={mode === 'mart' ? 'Search groceries, brands & shops' : 'Search restaurants & dishes'}
            placeholderTextColor={theme.colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => { commitRecent(query); Keyboard.dismiss(); }}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery('')} hitSlop={8} style={{ marginRight: 10 }}>
              <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>

      {/* ── Mode switch: Mart / Food ── */}
      <View style={styles.modeBar}>
        {(['mart', 'food'] as Mode[]).map(m => {
          const active = mode === m;
          const mAccent = m === 'food' ? theme.colors.food : theme.colors.primary;
          return (
            <Pressable
              key={m}
              onPress={() => {
                setMode(m);
                setTab(m === 'food' ? 'restaurants' : 'all');
                setProducts([]); setShopsResults([]); setRestaurantsResults([]);
              }}
              style={[
                styles.modePill,
                active ? { backgroundColor: mAccent, borderColor: mAccent } : null,
              ]}
            >
              <Ionicons name={m === 'mart' ? 'basket-outline' : 'restaurant-outline'} size={14} color={active ? '#fff' : theme.colors.textSecondary} />
              <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textSecondary}>
                {m === 'mart' ? 'Groceries' : 'Food'}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      {/* ── Tab chips (shown only when searching) ── */}
      {!showSuggestions && (
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} keyboardShouldPersistTaps="handled">
            {TABS.map(t => {
              const active = tab === t.id;
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setTab(t.id)}
                  style={[styles.tabChip, active ? { backgroundColor: accent, borderColor: accent } : null]}
                >
                  <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textSecondary}>
                    {t.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── Content ── */}
      {showSuggestions ? <SuggestionsView /> : <ResultsList />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  fill: { width: '100%', height: '100%' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  backBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceMuted,
    borderRadius: 12,
    borderWidth: 1.5,
    height: 44,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    paddingVertical: 0,
  },

  // Mode bar
  modeBar: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  modePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },

  // Tab bar
  tabBar: {
    paddingVertical: 8,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 99,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },

  // Suggestions
  block: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  blockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipTrending: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primaryBorder,
  },

  // Results
  listContent: { paddingVertical: 8, paddingBottom: 120 },
  gridRow: { paddingHorizontal: 8 },
  gridItem: { flex: 1 },
  sep: { height: 1, backgroundColor: theme.colors.divider, marginHorizontal: 16 },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  resultCount: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: theme.colors.textSecondary,
  },
  inlineSection: { marginBottom: 8 },
  inlineSectionTitle: { paddingHorizontal: 16, paddingVertical: 10 },
  seeAll: { paddingHorizontal: 16, paddingVertical: 8 },

  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.colors.surface,
    gap: 12,
  },
  catThumb: {
    width: 48, height: 48,
    borderRadius: 10,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
});
