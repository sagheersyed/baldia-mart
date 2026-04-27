import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { brandsApi, productsApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { isBusinessOpen } from '../utils/helpers';

import HomeHeader from '../components/home/HomeHeader';
import HomeSearchBar from '../components/home/HomeSearchBar';
import HomeSkeleton from '../components/home/HomeSkeleton';
import StoreCard from '../components/home/StoreCard';
import {
  AppText, AppBadge, EmptyState, ErrorState, SectionHeader,
} from '../components/ui';
import { theme } from '../theme/theme';

type ListRow =
  | { kind: 'chips' }
  | { kind: 'sectionHeader'; title: string; subtitle?: string; onSeeAll?: () => void }
  | { kind: 'popularRail' }
  | { kind: 'brand'; brand: any };

export default function BrandsScreen({ navigation }: any) {
  const { getCartCount, setActiveMode } = useCart();
  const { isFavourite, toggleFavourite, reload: reloadFavs } = useFavourites();

  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  useFocusEffect(useCallback(() => {
    setActiveMode('mart');
    reloadFavs();
  }, [setActiveMode, reloadFavs]));

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [brandsRes, prodRes] = await Promise.all([
        brandsApi.getAll('mart').catch(() => ({ data: [] })),
        productsApi.getAll().catch(() => ({ data: [] })),
      ]);
      const allBrands = (brandsRes.data || []).filter((b: any) => b.isActive !== false);
      const allProds = (prodRes.data || []).filter((p: any) => p.isActive !== false);
      const brandsWithCount = allBrands.map((b: any) => ({
        ...b,
        productCount: allProds.filter((p: any) => p.brandId === b.id).length,
      }));
      setBrands(brandsWithCount);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load brands.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // ── Categories chips (derived from brand.category) ──
  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(brands.map((b: any) => b.category).filter(Boolean)))];
  }, [brands]);

  const filteredBrands = useMemo(() => {
    if (activeCategory === 'All') return brands;
    return brands.filter((b: any) => b.category === activeCategory);
  }, [brands, activeCategory]);

  const popularBrands = useMemo(
    () => [...brands]
      .filter(b => isBusinessOpen(b.openingTime, b.closingTime))
      .sort((a, b) => (b.productCount || 0) - (a.productCount || 0))
      .slice(0, 8),
    [brands],
  );

  const data = useMemo<ListRow[]>(() => {
    const rows: ListRow[] = [{ kind: 'chips' }];
    if (popularBrands.length) {
      rows.push({ kind: 'sectionHeader', title: 'Popular Brands' });
      rows.push({ kind: 'popularRail' });
    }
    rows.push({
      kind: 'sectionHeader',
      title: activeCategory === 'All' ? 'All shops' : activeCategory,
      subtitle: `${filteredBrands.length} ${filteredBrands.length === 1 ? 'shop' : 'shops'} available`,
    });
    filteredBrands.forEach(b => rows.push({ kind: 'brand', brand: b }));
    return rows;
  }, [popularBrands, filteredBrands, activeCategory]);

  // ── Renderers ──
  const renderRow: ListRenderItem<ListRow> = useCallback(({ item }) => {
    switch (item.kind) {
      case 'chips':
        return (
          <View style={styles.chipsWrap}>
            <FlatList
              data={categories}
              keyExtractor={(c) => c}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}
              renderItem={({ item: c }) => {
                const active = activeCategory === c;
                return (
                  <Pressable
                    onPress={() => setActiveCategory(c)}
                    style={[
                      styles.chip,
                      active ? { backgroundColor: theme.colors.textPrimary, borderColor: theme.colors.textPrimary } : null,
                    ]}
                  >
                    <AppText
                      variant="captionStrong"
                      color={active ? '#fff' : theme.colors.textPrimary}
                    >
                      {c}
                    </AppText>
                  </Pressable>
                );
              }}
            />
          </View>
        );
      case 'sectionHeader':
        return <SectionHeader title={item.title} subtitle={item.subtitle} onAction={item.onSeeAll} />;
      case 'popularRail':
        return (
          <FlatList
            data={popularBrands}
            keyExtractor={(b) => b.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.lg }}
            renderItem={({ item: b }) => (
              <StoreCard
                store={b}
                variant="wide"
                onPress={() => navigation.navigate('BrandDetail', { brandId: b.id })}
                isFavourite={isFavourite(b.id, 'restaurants')}
                onToggleFavourite={() => toggleFavourite({
                  id: b.id, name: b.name, imageUrl: b.imageUrl || b.logoUrl,
                }, 'restaurants')}
              />
            )}
          />
        );
      case 'brand':
        return (
          <StoreCard
            store={item.brand}
            variant="list"
            onPress={() => navigation.navigate('BrandDetail', { brandId: item.brand.id })}
            isFavourite={isFavourite(item.brand.id, 'restaurants')}
            onToggleFavourite={() => toggleFavourite({
              id: item.brand.id, name: item.brand.name,
              imageUrl: item.brand.imageUrl || item.brand.logoUrl,
            }, 'restaurants')}
            meta={item.brand.productCount ? `${item.brand.productCount} products` : undefined}
          />
        );
    }
  }, [categories, activeCategory, popularBrands, navigation, isFavourite, toggleFavourite]);

  const keyExtractor = useCallback((item: ListRow, index: number) => {
    if (item.kind === 'brand') return `b-${item.brand.id}`;
    if (item.kind === 'sectionHeader') return `h-${item.title}-${index}`;
    return `${item.kind}-${index}`;
  }, []);

  // ── Render ──
  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeHeader
          locationLabel="Browsing top shops"
          cartCount={getCartCount('mart')}
          variant="mart"
          onLocationPress={() => navigation.navigate('SavedAddresses')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onCartPress={() => navigation.navigate('Cart')}
          onFavouritesPress={() => navigation.navigate('Favourites')}
        />
        <HomeSearchBar onPress={() => navigation.navigate('Search', { mode: 'mart' })} />
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !brands.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeHeader
          locationLabel="Browsing top shops"
          cartCount={getCartCount('mart')}
          variant="mart"
          onLocationPress={() => navigation.navigate('SavedAddresses')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onCartPress={() => navigation.navigate('Cart')}
          onFavouritesPress={() => navigation.navigate('Favourites')}
        />
        <ErrorState onRetry={() => loadData(true)} message={error} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        locationLabel="Browsing top shops"
        cartCount={getCartCount('mart')}
        variant="mart"
        onLocationPress={() => navigation.navigate('SavedAddresses')}
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onCartPress={() => navigation.navigate('Cart')}
        onFavouritesPress={() => navigation.navigate('Favourites')}
      />
      <HomeSearchBar onPress={() => navigation.navigate('Search', { mode: 'mart' })} />

      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={9}
        ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: theme.colors.divider }} />}
        ListEmptyComponent={
          <EmptyState icon="storefront-outline" title="No shops yet" subtitle="Check back soon — we're onboarding new partners." />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 110 },
  chipsWrap: { paddingVertical: theme.spacing.sm },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    marginRight: 8,
  },
});
