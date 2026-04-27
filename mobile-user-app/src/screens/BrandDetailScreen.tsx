import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { brandsApi, productsApi, categoriesApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { isBusinessOpen } from '../utils/helpers';

import ProductCard from '../components/home/ProductCard';
import HomeSkeleton from '../components/home/HomeSkeleton';
import {
  AppText, AppBadge, AppIconButton, EmptyState, ErrorState, FavouriteButton,
} from '../components/ui';
import { theme } from '../theme/theme';

type Row =
  | { kind: 'hero' }
  | { kind: 'tabs' }
  | { kind: 'productRow'; left: any; right: any | null };

export default function BrandDetailScreen({ navigation, route }: any) {
  const { brandId } = route.params;
  const { martCart, addToCart, updateQuantity, getCartCount, setActiveMode } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();

  const [brand, setBrand] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    setActiveMode('mart');
  }, [setActiveMode]));

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [brandRes, prodsRes, catsRes] = await Promise.all([
        brandsApi.getById(brandId),
        productsApi.getByBrand(brandId),
        categoriesApi.getAll(),
      ]);
      setBrand(brandRes.data);
      const brandProds = prodsRes.data || [];
      setProducts(brandProds);

      const brandCatIds = Array.from(new Set(brandProds.map((p: any) => p.categoryId)));
      const brandCats = (catsRes.data || []).filter((c: any) => brandCatIds.includes(c.id));
      setCategories(brandCats);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load brand.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [brandId]);

  useEffect(() => { loadData(true); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  const filteredProducts = useMemo(() => {
    return selectedCatId ? products.filter(p => p.categoryId === selectedCatId) : products;
  }, [products, selectedCatId]);

  // ── Build row data: a 'hero' row, then a 'tabs' row, then product rows (2 per row) ──
  const data = useMemo<Row[]>(() => {
    const rows: Row[] = [{ kind: 'hero' }, { kind: 'tabs' }];
    for (let i = 0; i < filteredProducts.length; i += 2) {
      rows.push({
        kind: 'productRow',
        left: filteredProducts[i],
        right: filteredProducts[i + 1] ?? null,
      });
    }
    return rows;
  }, [filteredProducts]);

  const cartQty = useCallback((id: string) => {
    return martCart.find((c: any) => c.productId === id || c.id === id)?.quantity || 0;
  }, [martCart]);

  const brandClosed = brand && !isBusinessOpen(brand.openingTime, brand.closingTime);
  const cover = normalizeUrl(brand?.coverUrl || brand?.imageUrl);
  const logo  = normalizeUrl(brand?.logoUrl || brand?.imageUrl);
  const isFav = isFavourite(brandId, 'restaurants');

  const renderRow: ListRenderItem<Row> = useCallback(({ item }) => {
    if (item.kind === 'hero') {
      return (
        <View style={styles.hero}>
          <View style={styles.heroImg}>
            {cover || logo ? (
              <Image source={{ uri: cover || logo! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder]}>
                <Ionicons name="storefront" size={48} color="#fff" />
              </View>
            )}
            <LinearGradient
              colors={['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.65)']}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.heroTopBar}>
              <AppIconButton size={36} bg="rgba(255,255,255,0.9)" onPress={() => navigation.goBack()}>
                <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
              </AppIconButton>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <FavouriteButton
                  active={isFav}
                  onPress={() => toggleFavourite({
                    id: brandId, name: brand?.name, imageUrl: brand?.imageUrl || brand?.logoUrl,
                  }, 'restaurants')}
                />
                <AppIconButton
                  size={32}
                  bg="rgba(255,255,255,0.9)"
                  onPress={() => navigation.navigate('Cart')}
                >
                  <Ionicons name="bag-handle" size={18} color={theme.colors.primary} />
                </AppIconButton>
              </View>
            </View>
            {brandClosed ? (
              <View style={styles.closedPill}>
                <AppText variant="badge" color="#fff">CURRENTLY CLOSED</AppText>
              </View>
            ) : null}
          </View>

          <View style={styles.brandInfo}>
            <View style={styles.titleRow}>
              <View style={{ flex: 1 }}>
                <AppText variant="h2" numberOfLines={1}>{brand?.name}</AppText>
                {brand?.category ? (
                  <AppText variant="caption">{brand.category}</AppText>
                ) : null}
              </View>
              {brand?.productCount != null ? (
                <AppBadge label={`${brand.productCount} items`} variant="primary" />
              ) : null}
            </View>
            <View style={styles.metaRow}>
              {brand?.openingTime && brand?.closingTime ? (
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={theme.colors.textSecondary} />
                  <AppText variant="caption">{brand.openingTime} – {brand.closingTime}</AppText>
                </View>
              ) : null}
              {brand?.deliveryTime ? (
                <View style={styles.metaItem}>
                  <Ionicons name="bicycle" size={14} color={theme.colors.textSecondary} />
                  <AppText variant="caption">{brand.deliveryTime}</AppText>
                </View>
              ) : null}
            </View>
          </View>
        </View>
      );
    }

    if (item.kind === 'tabs') {
      return (
        <View style={styles.tabsWrap}>
          <FlatList
            data={[{ id: null, name: 'All' }, ...categories]}
            keyExtractor={(c) => c.id || 'all'}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}
            renderItem={({ item: cat }) => {
              const active = selectedCatId === cat.id || (!selectedCatId && cat.id === null);
              return (
                <Pressable
                  onPress={() => setSelectedCatId(cat.id)}
                  style={[
                    styles.chip,
                    active ? { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary } : null,
                  ]}
                >
                  <AppText
                    variant="captionStrong"
                    color={active ? '#fff' : theme.colors.textPrimary}
                  >
                    {cat.name}
                  </AppText>
                </Pressable>
              );
            }}
          />
        </View>
      );
    }

    // productRow
    return (
      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <ProductCard
            product={item.left}
            cartQty={cartQty(item.left.id)}
            variant="grid"
            isFavourite={isFavourite(item.left.id, 'products')}
            onPress={() => {}}
            onAdd={() => addToCart(item.left, 'mart')}
            onIncrement={() => addToCart(item.left, 'mart')}
            onDecrement={() => updateQuantity(item.left.id, Math.max(0, cartQty(item.left.id) - 1), 'mart')}
            onToggleFavourite={() => toggleFavourite({
              id: item.left.id, name: item.left.name, imageUrl: item.left.imageUrl,
              price: item.left.price, discount: item.left.discount,
              category: item.left.category, brand: item.left.brand,
              openingTime: item.left.openingTime, closingTime: item.left.closingTime,
              maxQuantityPerOrder: item.left.maxQuantityPerOrder,
              stockQuantity: item.left.stockQuantity,
            }, 'products')}
          />
        </View>
        <View style={styles.gridCol}>
          {item.right ? (
            <ProductCard
              product={item.right}
              cartQty={cartQty(item.right.id)}
              variant="grid"
              isFavourite={isFavourite(item.right.id, 'products')}
              onPress={() => {}}
              onAdd={() => addToCart(item.right, 'mart')}
              onIncrement={() => addToCart(item.right, 'mart')}
              onDecrement={() => updateQuantity(item.right.id, Math.max(0, cartQty(item.right.id) - 1), 'mart')}
              onToggleFavourite={() => toggleFavourite({
                id: item.right.id, name: item.right.name, imageUrl: item.right.imageUrl,
                price: item.right.price, discount: item.right.discount,
                category: item.right.category, brand: item.right.brand,
                openingTime: item.right.openingTime, closingTime: item.right.closingTime,
                maxQuantityPerOrder: item.right.maxQuantityPerOrder,
                stockQuantity: item.right.stockQuantity,
              }, 'products')}
            />
          ) : <View style={{ flex: 1 }} />}
        </View>
      </View>
    );
  }, [
    cover, logo, brand, brandId, brandClosed, isFav,
    categories, selectedCatId,
    cartQty, isFavourite, addToCart, updateQuantity, toggleFavourite, navigation,
  ]);

  const keyExtractor = useCallback((item: Row, index: number) => {
    if (item.kind === 'productRow') return `r-${item.left.id}`;
    return `${item.kind}-${index}`;
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ErrorState message={error} onRetry={() => loadData(true)} />
      </SafeAreaView>
    );
  }

  const cartTotalQty = getCartCount('mart');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState icon="basket-outline" title="No products found" subtitle="Try a different category." />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.primary}
            colors={[theme.colors.primary]}
          />
        }
      />

      {cartTotalQty > 0 ? (
        <View style={styles.stickyCta}>
          <Pressable onPress={() => navigation.navigate('Cart')} style={({ pressed }) => [
            styles.stickyBtn, pressed ? { opacity: 0.9 } : null,
          ]}>
            <View style={styles.stickyBadge}>
              <AppText variant="bodyStrong" color="#fff">{cartTotalQty}</AppText>
            </View>
            <AppText variant="title" color="#fff">View cart</AppText>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 120 },

  hero: { backgroundColor: theme.colors.surface, marginBottom: theme.spacing.huge },
  heroImg: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.primary,
    overflow: 'hidden',
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary },
  heroTopBar: {
    position: 'absolute',
    top: theme.spacing.md, left: theme.spacing.md, right: theme.spacing.md,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  closedPill: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  brandInfo: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  tabsWrap: {
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    marginBottom: theme.spacing.sm,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: theme.colors.divider,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.sm,
  },
  gridCol: { flex: 1 },

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
