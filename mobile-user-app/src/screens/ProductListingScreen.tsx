import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, ActivityIndicator,
  Modal, ScrollView, TextInput, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import {
  productsApi, ProductSort, ProductListParams, brandsApi, connectSocket, socket, pharmaApi,
} from '../api/api';
import { useCartStore } from '../store/cartStore';
import ProductCard, { ProductCardProduct } from '../components/home/ProductCard';
import HomeSkeleton from '../components/home/HomeSkeleton';
import {
  AppText, AppButton, AppIconButton, AppBadge, EmptyState, ErrorState, SkeletonBlock,
} from '../components/ui';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { theme } from '../theme/theme';

type ListingType =
  | 'category'
  | 'deals'
  | 'flash-sale'
  | 'best_sellers'
  | 'featured'
  | 'newest'
  | 'budget'
  | 'brand'
  | 'search';

interface ProductListingRouteParams {
  type: ListingType;
  categoryId?: string;
  brandId?: string;
  search?: string;
  maxPrice?: number;
  title?: string;
}

const SORT_OPTIONS: { id: ProductSort; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'newest',     label: 'Newest',         icon: 'sparkles-outline' },
  { id: 'popular',    label: 'Popular',        icon: 'flame-outline' },
  { id: 'price_asc',  label: 'Price: Low–High',icon: 'trending-up-outline' },
  { id: 'price_desc', label: 'Price: High–Low',icon: 'trending-down-outline' },
  { id: 'discount',   label: 'Biggest deal',   icon: 'pricetag-outline' },
  { id: 'rating',     label: 'Top rated',      icon: 'star-outline' },
];

const PAGE_LIMIT = 20;

export default function ProductListingScreen({ navigation, route }: any) {
  const params: ProductListingRouteParams = route?.params || { type: 'newest' };

  const [items, setItems] = useState<ProductCardProduct[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<ProductSort>(
    params.type === 'deals' || params.type === 'flash-sale' ? 'discount' :
    params.type === 'best_sellers' ? 'popular' : 'newest',
  );
  const [minPrice, setMinPrice] = useState<string>('');
  const [maxPrice, setMaxPrice] = useState<string>(params.maxPrice ? String(params.maxPrice) : '');
  const [inStock, setInStock] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(params.type === 'deals' || params.type === 'flash-sale');
  const [brandFilter, setBrandFilter] = useState<string | undefined>(params.brandId);
  const [brandsList, setBrandsList] = useState<any[]>([]);

  const { martCart, foodCart, pharmaCart, addToCart, updateQuantity, getCartCount } = useCart();
  const { activeMode } = useCartStore();
  const { isFavourite, toggleFavourite } = useFavourites();

  const cartQuantities = useMemo(() => {
    const q: Record<string, number> = {};
    const cart = activeMode === 'pharma' ? pharmaCart : (activeMode === 'food' ? foodCart : martCart);
    cart.forEach((item: any) => { q[item.id] = item.quantity; });
    return q;
  }, [martCart, foodCart, pharmaCart, activeMode]);

  const accent = activeMode === 'food' ? theme.colors.food : activeMode === 'pharma' ? theme.colors.pharma : theme.colors.primary;
  const accentLight = activeMode === 'food' ? theme.colors.foodLight : activeMode === 'pharma' ? theme.colors.pharmaLight : theme.colors.primaryLight;

  // ── Build query params from current state ──
  const buildParams = useCallback((targetPage: number): ProductListParams => {
    const base: ProductListParams = {
      page: targetPage,
      limit: PAGE_LIMIT,
      sort,
      brandId: brandFilter,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : (params.maxPrice ?? undefined),
      inStock: inStock || undefined,
      deal: dealsOnly || undefined,
    };

    switch (params.type) {
      case 'category':    base.categoryId = params.categoryId; break;
      case 'brand':       base.brandId = params.brandId || brandFilter; break;
      case 'deals':
      case 'flash-sale':  base.deal = true; break;
      case 'best_sellers':base.bestSeller = true; break;
      case 'featured':    base.featured = true; break;
      case 'budget':      base.maxPrice = base.maxPrice ?? params.maxPrice ?? 100; break;
      case 'search':      base.search = params.search; break;
      default: break;
    }
    return base;
  }, [sort, brandFilter, minPrice, maxPrice, inStock, dealsOnly, params]);

  const fetchPage = useCallback(async (targetPage: number, mode: 'replace' | 'append') => {
    try {
      const isAppend = mode === 'append';
      if (isAppend) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      let res: any;
      if (activeMode === 'pharma') {
        if (params.type === 'category' && params.categoryId) {
          res = await pharmaApi.getByCategory(params.categoryId, targetPage, PAGE_LIMIT);
        } else {
          // Fetch medicines via unified search endpoint
          const q = params.search || '';
          res = await pharmaApi.searchMedicines(q, targetPage, PAGE_LIMIT);
        }
      } else {
        if (params.type === 'search' && params.search) {
          res = await productsApi.search(params.search, targetPage, PAGE_LIMIT);
        } else {
          res = await productsApi.list(buildParams(targetPage));
        }
      }

      const payload = res.data || {};
      const data = Array.isArray(payload) ? payload : (payload.data || []);
      const newTotal = payload.total ?? data.length;
      const newTotalPages = payload.totalPages ?? Math.ceil(newTotal / PAGE_LIMIT);

      setItems(prev => isAppend ? [...prev, ...data] : data);
      setPage(targetPage);
      setTotal(newTotal);
      setTotalPages(newTotalPages);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [params.type, params.search, buildParams]);

  useEffect(() => { fetchPage(1, 'replace'); }, [fetchPage]);

  // ── Real-time stock patching for visible products ──
  useEffect(() => {
    connectSocket();
    const onProductsUpdated = (payload: any) => {
      if (!navigation.isFocused()) return;
      if (payload?.event === 'stock_updated' && payload.productId) {
        setItems(prev => prev.map((p: any) =>
          p.id === payload.productId
            ? { ...p, stockQuantity: payload.stock, stock: payload.stock }
            : p,
        ));
      }
    };
    socket.on('productsUpdated', onProductsUpdated);
    return () => { socket.off('productsUpdated', onProductsUpdated); };
  }, [navigation]);

  useEffect(() => {
    brandsApi.getAll(activeMode === 'pharma' ? 'pharma' : 'mart').then(res => {
      setBrandsList(Array.isArray(res.data) ? res.data : []);
    }).catch(() => setBrandsList([]));
  }, [activeMode]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPage(1, 'replace');
  }, [fetchPage]);

  const onEndReached = useCallback(() => {
    if (loadingMore || loading) return;
    if (page >= totalPages) return;
    fetchPage(page + 1, 'append');
  }, [page, totalPages, loadingMore, loading, fetchPage]);

  // ── Cart handlers ──
  const handleAdd = useCallback((p: any) => {
    if ((p.stock ?? p.stockQuantity ?? 1) <= 0) return;
    addToCart(p, activeMode);
  }, [addToCart, activeMode]);

  const handleIncrement = useCallback((p: any) => addToCart(p, activeMode), [addToCart, activeMode]);

  const handleDecrement = useCallback((p: any) => {
    const cur = cartQuantities[p.id] || 0;
    updateQuantity(p.id, Math.max(0, cur - 1), activeMode);
  }, [cartQuantities, updateQuantity, activeMode]);

  const handleFav = useCallback((p: any) => {
    toggleFavourite({
      id: p.id, name: p.name, imageUrl: p.imageUrl, price: p.price || p.mrp || 0, discount: p.discount || 0,
      category: p.category, brand: p.brand, openingTime: p.openingTime, closingTime: p.closingTime,
      maxQuantityPerOrder: p.maxQuantityPerOrder, stockQuantity: p.stockQuantity,
      isPharma: activeMode === 'pharma',
    }, 'products');
  }, [toggleFavourite, activeMode]);

  const isFav = useCallback((id: string) => isFavourite(id, 'products'), [isFavourite]);

  const renderItem = useCallback(({ item }: { item: any }) => (
    <View style={styles.gridItem}>
      <ProductCard
        product={item}
        cartQty={cartQuantities[item.id] || 0}
        variant="grid"
        isFavourite={isFav(item.id)}
        onAdd={() => handleAdd(item)}
        onIncrement={() => handleIncrement(item)}
        onDecrement={() => handleDecrement(item)}
        onToggleFavourite={() => handleFav(item)}
      />
    </View>
  ), [cartQuantities, isFav, handleAdd, handleIncrement, handleDecrement, handleFav]);

  const cartCount = getCartCount(activeMode);
  const activeFiltersCount =
    (brandFilter && params.type !== 'brand' ? 1 : 0) +
    (minPrice ? 1 : 0) +
    ((maxPrice && (!params.maxPrice || Number(maxPrice) !== params.maxPrice)) ? 1 : 0) +
    (inStock ? 1 : 0) +
    ((dealsOnly && params.type !== 'deals' && params.type !== 'flash-sale') ? 1 : 0);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={styles.headerCenter}>
          <AppText variant="title" numberOfLines={1}>{params.title || 'Products'}</AppText>
          {total > 0 ? (
            <AppText variant="caption">{total} item{total === 1 ? '' : 's'}</AppText>
          ) : null}
        </View>
        <Pressable onPress={() => setShowFilters(true)} style={[styles.filterBtn, { backgroundColor: accentLight, borderColor: accent + '33' }]}>
          <Ionicons name="options-outline" size={18} color={accent} />
          {activeFiltersCount > 0 ? (
            <View style={[styles.filterDot, { backgroundColor: accent }]}>
              <AppText variant="badge" color="#fff" style={{ fontSize: 9 }}>{activeFiltersCount}</AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Sort chips */}
      <View style={styles.chipsRow}>
        <FlatList
          data={SORT_OPTIONS}
          keyExtractor={(s) => s.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}
          renderItem={({ item }) => {
            const active = sort === item.id;
            return (
              <Pressable
                onPress={() => { setSort(item.id); fetchPage(1, 'replace'); }}
                style={[styles.chip, active ? { backgroundColor: accent, borderColor: accent } : null]}
              >
                <Ionicons name={item.icon} size={14} color={active ? '#fff' : theme.colors.textSecondary} />
                <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textPrimary}>
                  {item.label}
                </AppText>
              </Pressable>
            );
          }}
        />
      </View>

      {/* Body */}
      {loading && items.length === 0 ? (
        <View style={styles.skeletonWrap}>
          <View style={styles.skeletonRow}>
            {[...Array(2)].map((_, i) => (
              <View key={i} style={styles.skeletonCol}>
                <SkeletonBlock width="100%" height={116} radius={theme.radius.md} />
                <SkeletonBlock width="80%" height={14} style={{ marginTop: 8 }} />
                <SkeletonBlock width="50%" height={14} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
          <View style={styles.skeletonRow}>
            {[...Array(2)].map((_, i) => (
              <View key={i} style={styles.skeletonCol}>
                <SkeletonBlock width="100%" height={116} radius={theme.radius.md} />
                <SkeletonBlock width="80%" height={14} style={{ marginTop: 8 }} />
                <SkeletonBlock width="50%" height={14} style={{ marginTop: 6 }} />
              </View>
            ))}
          </View>
        </View>
      ) : error && items.length === 0 ? (
        <ErrorState message={error} onRetry={() => fetchPage(1, 'replace')} />
      ) : items.length === 0 ? (
        <EmptyState
          title="No products found"
          subtitle="Try adjusting filters or come back later."
          icon="basket-outline"
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={accent} style={{ marginVertical: 18 }} />
            ) : page >= totalPages && items.length > PAGE_LIMIT ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <AppText variant="caption" color={theme.colors.textSecondary}>You've reached the end</AppText>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={accent}
              colors={[accent]}
            />
          }
        />
      )}

      {/* Sticky cart CTA */}
      {cartCount > 0 ? (
        <View style={styles.stickyCta}>
          <Pressable onPress={() => navigation.navigate('Cart')} style={({ pressed }) => [
            styles.stickyBtn, { backgroundColor: accent }, pressed ? { opacity: 0.92 } : null,
          ]}>
            <View style={styles.stickyBadge}>
              <AppText variant="bodyStrong" color="#fff">{cartCount}</AppText>
            </View>
            <AppText variant="title" color="#fff">View cart</AppText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}

      {/* Filter Sheet */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowFilters(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <AppText variant="h2">Filters</AppText>
              <AppIconButton size={32} onPress={() => setShowFilters(false)} bg={theme.colors.surfaceMuted}>
                <Ionicons name="close" size={18} color={theme.colors.textPrimary} />
              </AppIconButton>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Sort */}
              <AppText variant="overline" style={styles.sectionLabel}>Sort by</AppText>
              <View style={styles.optionsWrap}>
                {SORT_OPTIONS.map(opt => {
                  const active = sort === opt.id;
                  return (
                    <Pressable
                      key={opt.id}
                      onPress={() => setSort(opt.id)}
                      style={[styles.optionChip, active ? { backgroundColor: accent, borderColor: accent } : null]}
                    >
                      <Ionicons name={opt.icon} size={14} color={active ? '#fff' : theme.colors.textSecondary} />
                      <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textPrimary}>
                        {opt.label}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              {/* Price range */}
              <AppText variant="overline" style={styles.sectionLabel}>Price range (Rs.)</AppText>
              <View style={styles.priceRow}>
                <TextInput
                  value={minPrice} onChangeText={setMinPrice}
                  placeholder="Min" keyboardType="numeric"
                  style={styles.priceInput}
                  placeholderTextColor={theme.colors.textMuted}
                />
                <AppText variant="body" color={theme.colors.textSecondary} style={{ marginHorizontal: 8 }}>—</AppText>
                <TextInput
                  value={maxPrice} onChangeText={setMaxPrice}
                  placeholder="Max" keyboardType="numeric"
                  style={styles.priceInput}
                  placeholderTextColor={theme.colors.textMuted}
                />
              </View>

              {/* Toggles */}
              <Pressable style={styles.toggleRow} onPress={() => setInStock(s => !s)}>
                <View>
                  <AppText variant="bodyStrong">In stock only</AppText>
                  <AppText variant="caption">Hide unavailable items</AppText>
                </View>
                <View style={[styles.toggle, inStock && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, inStock && styles.toggleKnobOn]} />
                </View>
              </Pressable>

              <Pressable style={styles.toggleRow} onPress={() => setDealsOnly(s => !s)}>
                <View>
                  <AppText variant="bodyStrong">Deals only</AppText>
                  <AppText variant="caption">Show discounted products</AppText>
                </View>
                <View style={[styles.toggle, dealsOnly && styles.toggleOn]}>
                  <View style={[styles.toggleKnob, dealsOnly && styles.toggleKnobOn]} />
                </View>
              </Pressable>

              {/* Brand select */}
              {brandsList.length > 0 && params.type !== 'brand' && (
                <>
                  <AppText variant="overline" style={styles.sectionLabel}>Brand</AppText>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 4, gap: 8 }}>
                    <Pressable
                      onPress={() => setBrandFilter(undefined)}
                      style={[styles.brandChip, !brandFilter ? { backgroundColor: accent, borderColor: accent } : null]}
                    >
                      <AppText variant="captionStrong" color={!brandFilter ? '#fff' : theme.colors.textPrimary}>All</AppText>
                    </Pressable>
                    {brandsList.map(b => {
                      const active = brandFilter === b.id;
                      return (
                        <Pressable
                          key={b.id}
                          onPress={() => setBrandFilter(b.id)}
                          style={[styles.brandChip, active ? { backgroundColor: accent, borderColor: accent } : null]}
                        >
                          <AppText variant="captionStrong" color={active ? '#fff' : theme.colors.textPrimary}>{b.name}</AppText>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              )}
            </ScrollView>

            <View style={styles.actionsRow}>
              <AppButton
                label="Reset"
                variant="secondary"
                fullWidth
                onPress={() => {
                  setSort('newest');
                  setMinPrice('');
                  setMaxPrice(params.maxPrice ? String(params.maxPrice) : '');
                  setInStock(false);
                  setDealsOnly(params.type === 'deals' || params.type === 'flash-sale');
                  setBrandFilter(params.brandId);
                }}
                style={{ flex: 1 }}
              />
              <AppButton
                label="Apply filters"
                variant="primary"
                tint={accent}
                fullWidth
                onPress={() => {
                  setShowFilters(false);
                  fetchPage(1, 'replace');
                }}
                style={{ flex: 2 }}
              />
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: theme.spacing.sm,
  },
  headerCenter: { flex: 1 },
  filterBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: theme.colors.primary + '33',
  },
  filterDot: {
    position: 'absolute', top: -4, right: -4,
    minWidth: 16, height: 16, borderRadius: 8,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 4,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#fff',
  },

  // Sort chips
  chipsRow: {
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 7,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  chipActive: { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },

  // Skeleton
  skeletonWrap: { paddingHorizontal: theme.spacing.sm, paddingTop: theme.spacing.sm },
  skeletonRow: { flexDirection: 'row', marginBottom: theme.spacing.md },
  skeletonCol: { flex: 1, padding: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, marginHorizontal: 4 },

  // Grid
  listContent: { padding: 8, paddingBottom: 140 },
  row: { justifyContent: 'space-between', paddingHorizontal: 4 },
  gridItem: { flex: 1 },

  // Filter modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
    padding: theme.spacing.lg,
    maxHeight: '88%',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40, height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.borderStrong,
    marginBottom: theme.spacing.md,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.md },
  sectionLabel: { marginTop: theme.spacing.lg, marginBottom: theme.spacing.sm },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: theme.spacing.md, paddingVertical: 8,
    borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  optionChipActive: {
    backgroundColor: theme.colors.primary, borderColor: theme.colors.primary,
  },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceInput: {
    flex: 1, height: 44, borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: theme.spacing.md,
    fontSize: 14, color: theme.colors.textPrimary,
    borderWidth: 1, borderColor: theme.colors.border,
  },

  toggleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  toggle: {
    width: 44, height: 26, borderRadius: 13,
    backgroundColor: theme.colors.borderStrong, padding: 3, justifyContent: 'center',
  },
  toggleOn: { backgroundColor: theme.colors.success },
  toggleKnob: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleKnobOn: { transform: [{ translateX: 18 }] },

  brandChip: {
    paddingHorizontal: theme.spacing.md, paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1, borderColor: theme.colors.border,
  },
  brandChipActive: { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary },

  actionsRow: { flexDirection: 'row', gap: theme.spacing.md, marginTop: theme.spacing.lg },

  // Sticky cart CTA
  stickyCta: {
    position: 'absolute',
    left: theme.spacing.lg, right: theme.spacing.lg,
    bottom: theme.spacing.lg,
  },
  stickyBtn: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.brand,
  },
  stickyBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
