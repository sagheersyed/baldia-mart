import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { brandsApi, productsApi, categoriesApi, pharmaApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { isBusinessOpen } from '../utils/helpers';

import ProductCard from '../components/home/ProductCard';
import HomeSkeleton from '../components/home/HomeSkeleton';
import {
  AppText, AppBadge, AppIconButton, EmptyState, ErrorState, FavouriteButton,
} from '../components/ui';
import { useTheme } from '../context/ThemeContext';

type Row =
  | { kind: 'hero' }
  | { kind: 'tabs' }
  | { kind: 'productRow'; left: any; right: any | null };

export default function BrandDetailScreen({ navigation, route }: any) {
  const { brandId } = route.params;
  const { theme } = useTheme();
  const { martCart, pharmaCart, addToCart, updateQuantity, getCartCount, setActiveMode } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();

  const [brand, setBrand] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPharma = route.params?.section === 'pharma' || brand?.section === 'pharma';

  useFocusEffect(useCallback(() => {
    setActiveMode(isPharma ? 'pharma' : 'mart');
  }, [setActiveMode, isPharma]));

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const isPharmaMode = route.params?.section === 'pharma';
      const [brandRes, prodsRes, catsRes] = await Promise.all([
        brandsApi.getById(brandId),
        isPharmaMode
          ? pharmaApi.searchMedicines('', 1, 50, { brandId })
          : productsApi.getByBrand(brandId),
        isPharmaMode
          ? pharmaApi.getCategories()
          : categoriesApi.getAll(),
      ]);
      setBrand(brandRes.data);
      const brandProds = Array.isArray(prodsRes.data) ? prodsRes.data : (prodsRes.data?.data || []);
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
  }, [brandId, route.params]);

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
    const cart = isPharma ? pharmaCart : martCart;
    return cart.find((c: any) => c.productId === id || c.id === id)?.quantity || 0;
  }, [martCart, pharmaCart, isPharma]);

  const brandClosed = brand && !isBusinessOpen(brand.openingTime, brand.closingTime);
  const cover = normalizeUrl(brand?.coverUrl || brand?.imageUrl);
  const logo = normalizeUrl(brand?.logoUrl || brand?.imageUrl);
  const isFav = isFavourite(brandId, 'restaurants');

  const renderRow: ListRenderItem<Row> = useCallback(({ item }) => {
    const accentColor = isPharma ? theme.colors.pharma : theme.colors.primary;

    if (item.kind === 'hero') {
      return (
        <View style={styles.hero}>
          <View style={styles.heroImg}>
            {cover || logo ? (
              <Image source={{ uri: cover || logo! }} style={StyleSheet.absoluteFill} contentFit="cover" cachePolicy="memory-disk" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.heroPlaceholder, isPharma && { backgroundColor: theme.colors.pharma }]}>
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
                  onPress={() => navigation.navigate(isPharma ? 'PharmaCart' : 'Cart')}
                >
                  <Ionicons name="bag-handle" size={18} color={accentColor} />
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
                <AppBadge label={`${brand.productCount} items`} variant={isPharma ? 'success' : 'primary'} />
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
      const activeAccent = isPharma ? theme.colors.pharma : theme.colors.primary;
      return (
        <View style={[styles.tabsWrap, { backgroundColor: theme.colors.surface, borderColor: theme.colors.divider }]}>
          <FlatList
            data={[{ id: null, name: 'All' }, ...categories]}
            keyExtractor={(c) => c.id || 'all'}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
            renderItem={({ item: cat }) => {
              const active = selectedCatId === cat.id || (!selectedCatId && cat.id === null);
              return (
                <Pressable
                  onPress={() => setSelectedCatId(cat.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? activeAccent : theme.colors.surfaceMuted,
                      borderColor: active ? activeAccent : theme.colors.border,
                    },
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
    const sectionName = isPharma ? 'pharma' : 'mart';
    return (
      <View style={styles.gridRow}>
        <View style={styles.gridCol}>
          <ProductCard
            product={item.left}
            cartQty={cartQty(item.left.id)}
            variant="grid"
            tint={accentColor}
            isFavourite={isFavourite(item.left.id, 'products')}
            onPress={isPharma ? () => navigation.navigate('MedicineDetail', { medicineId: item.left.id }) : undefined}
            onAdd={() => addToCart(item.left, sectionName)}
            onIncrement={() => addToCart(item.left, sectionName)}
            onDecrement={() => updateQuantity(item.left.id, Math.max(0, cartQty(item.left.id) - 1), sectionName)}
            onToggleFavourite={() => toggleFavourite({
              id: item.left.id, name: item.left.name, imageUrl: item.left.imageUrl,
              price: item.left.price || item.left.mrp || 0, discount: item.left.discount || 0,
              category: item.left.category, brand: item.left.brand,
              openingTime: item.left.openingTime, closingTime: item.left.closingTime,
              maxQuantityPerOrder: item.left.maxQuantityPerOrder,
              stockQuantity: item.left.stockQuantity,
              isPharma: isPharma,
            }, 'products')}
          />
        </View>
        <View style={styles.gridCol}>
          {item.right ? (
            <ProductCard
              product={item.right}
              cartQty={cartQty(item.right.id)}
              variant="grid"
              tint={accentColor}
              isFavourite={isFavourite(item.right.id, 'products')}
              onPress={isPharma ? () => navigation.navigate('MedicineDetail', { medicineId: item.right.id }) : undefined}
              onAdd={() => addToCart(item.right, sectionName)}
              onIncrement={() => addToCart(item.right, sectionName)}
              onDecrement={() => updateQuantity(item.right.id, Math.max(0, cartQty(item.right.id) - 1), sectionName)}
              onToggleFavourite={() => toggleFavourite({
                id: item.right.id, name: item.right.name, imageUrl: item.right.imageUrl,
                price: item.right.price || item.right.mrp || 0, discount: item.right.discount || 0,
                category: item.right.category, brand: item.right.brand,
                openingTime: item.right.openingTime, closingTime: item.right.closingTime,
                maxQuantityPerOrder: item.right.maxQuantityPerOrder,
                stockQuantity: item.right.stockQuantity,
                isPharma: isPharma,
              }, 'products')}
            />
          ) : <View style={{ flex: 1 }} />}
        </View>
      </View>
    );
  }, [
    cover, logo, brand, brandId, brandClosed, isFav, isPharma,
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

  const cartTotalQty = getCartCount(isPharma ? 'pharma' : 'mart');

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
            tintColor={isPharma ? theme.colors.pharma : theme.colors.primary}
            colors={[isPharma ? theme.colors.pharma : theme.colors.primary]}
          />
        }
      />

      {cartTotalQty > 0 ? (
        <View style={styles.stickyCta}>
          <Pressable
            onPress={() => navigation.navigate(isPharma ? 'PharmaCart' : 'Cart')}
            style={({ pressed }) => [
              styles.stickyBtn,
              { backgroundColor: isPharma ? theme.colors.pharma : theme.colors.primary },
              pressed ? { opacity: 0.9 } : null,
            ]}
          >
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
  container: { flex: 1, backgroundColor: '#F4F6FB' },
  listContent: { paddingBottom: 120 },

  hero: { backgroundColor: '#FFFFFF', marginBottom: 24 },
  heroImg: {
    width: '100%',
    height: 220,
    backgroundColor: '#FF5A1F',
    overflow: 'hidden',
  },
  heroPlaceholder: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#FF5A1F' },
  heroTopBar: {
    position: 'absolute',
    top: 12, left: 12, right: 12,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  closedPill: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 999,
  },
  brandInfo: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 8,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  tabsWrap: {
    paddingVertical: 8,
    marginBottom: 8,
    borderTopWidth: 1, borderBottomWidth: 1,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },

  gridRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
  },
  gridCol: { flex: 1 },

  // Sticky cart CTA
  stickyCta: {
    position: 'absolute',
    left: 16, right: 16,
    bottom: 16,
  },
  stickyBtn: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  stickyBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
