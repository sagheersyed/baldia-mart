import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Animated, ListRenderItem,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  homeApi, addressesApi, deliveryZonesApi, connectSocket, socket,
  HomePayload, HomeSectionPayload,
} from '../api/api';
import { getDistanceKm } from '../utils/helpers';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { useSettings } from '../context/SettingsContext';

import HomeHeader from '../components/home/HomeHeader';
import HomeSearchBar from '../components/home/HomeSearchBar';
import PromoCarousel from '../components/home/PromoCarousel';
import CategoryGrid from '../components/home/CategoryGrid';
import BrandStrip from '../components/home/BrandStrip';
import RashanBanner from '../components/home/RashanBanner';
import HomeSection from '../components/home/HomeSection';
import HomeSkeleton from '../components/home/HomeSkeleton';
import QuickServicesGrid, { QuickService } from '../components/home/QuickServicesGrid';
import { EmptyState, ErrorState } from '../components/ui';
import { theme } from '../theme/theme';

type HeaderItem =
  | { kind: 'banners'; banners: any[] }
  | { kind: 'services'; services: QuickService[] }
  | { kind: 'categories'; categories: any[] }
  | { kind: 'brands'; brands: any[] }
  | { kind: 'rashan' };

type ListItem = HeaderItem | { kind: 'section'; section: HomeSectionPayload };

export default function HomeScreen({ navigation }: any) {
  const settingsStore = useSettings();
  const settings = (settingsStore as any).settings || (settingsStore as any);
  const showRashan = settings?.feature_rashan_enabled === true;

  const { martCart, addToCart, updateQuantity, getCartCount, setActiveMode } = useCart();
  const { isFavourite, toggleFavourite, reload: reloadFavs } = useFavourites();

  const [home, setHome] = useState<HomePayload | null>(null);
  const [zoneId, setZoneId] = useState<string | undefined>(undefined);
  const [address, setAddress] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Load home + zone resolution ──
  const loadHome = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [addrRes, zonesRes] = await Promise.all([
        addressesApi.getAll().catch(() => ({ data: [] })),
        deliveryZonesApi.getActive().catch(() => ({ data: [] })),
      ]);

      const addrs = addrRes.data || [];
      const currentAddr = addrs.find((a: any) => a.isDefault) || addrs[0] || null;
      const zones = zonesRes.data || [];

      let resolvedZoneId: string | undefined;
      if (currentAddr?.latitude && currentAddr?.longitude) {
        const matching = zones.find((z: any) =>
          getDistanceKm(
            Number(currentAddr.latitude), Number(currentAddr.longitude),
            Number(z.centerLat), Number(z.centerLng),
          ) <= Number(z.radiusKm),
        );
        resolvedZoneId = matching?.id;
      }
      setZoneId(resolvedZoneId);
      setAddress(currentAddr);

      const res = await homeApi.getHome('mart', resolvedZoneId);
      setHome(res.data);
    } catch (e: any) {
      console.warn('[Home] failed to load home payload', e?.message || e);
      setError(e?.response?.data?.message || e?.message || 'Failed to load home.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setActiveMode('mart');
    loadHome(home === null);
    reloadFavs();
  }, [loadHome, reloadFavs, setActiveMode]));

  // ── Real-time socket: patch in-memory home payload on stock/products/banners updates ──
  useEffect(() => {
    connectSocket();

    const onProductsUpdated = (payload: any) => {
      if (payload?.event === 'stock_updated' && payload.productId) {
        setHome(prev => {
          if (!prev) return prev;
          const newSections = prev.sections.map(s => ({
            ...s,
            products: s.products.map((p: any) =>
              p.id === payload.productId
                ? { ...p, stockQuantity: payload.stock, stock: payload.stock }
                : p,
            ),
          }));
          return { ...prev, sections: newSections };
        });
        return;
      }
      loadHome(false);
    };

    const onBannersUpdated = () => loadHome(false);

    socket.on('productsUpdated', onProductsUpdated);
    socket.on('bannersUpdated', onBannersUpdated);

    return () => {
      socket.off('productsUpdated', onProductsUpdated);
      socket.off('bannersUpdated', onBannersUpdated);
    };
  }, [loadHome]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadHome(false);
  }, [loadHome]);

  // ── Cart helpers ──
  const cartQuantities = useMemo(() => {
    const q: Record<string, number> = {};
    martCart.forEach((item: any) => { q[item.id] = item.quantity; });
    return q;
  }, [martCart]);

  const handleAdd = useCallback((prod: any) => {
    if ((prod.stock ?? prod.stockQuantity ?? 1) <= 0) return;
    addToCart(prod, 'mart');
  }, [addToCart]);

  const handleIncrement = useCallback((prod: any) => addToCart(prod, 'mart'), [addToCart]);
  const handleDecrement = useCallback((prod: any) => {
    const current = cartQuantities[prod.id] || 0;
    updateQuantity(prod.id, Math.max(0, current - 1), 'mart');
  }, [cartQuantities, updateQuantity]);

  const handleToggleFav = useCallback((prod: any) => {
    toggleFavourite({
      id: prod.id, name: prod.name, imageUrl: prod.imageUrl, price: prod.price,
      discount: prod.discount, category: prod.category, brand: prod.brand,
      openingTime: prod.openingTime, closingTime: prod.closingTime,
      maxQuantityPerOrder: prod.maxQuantityPerOrder, stockQuantity: prod.stockQuantity,
    }, 'products');
  }, [toggleFavourite]);

  const isFav = useCallback((id: string) => isFavourite(id, 'products'), [isFavourite]);

  // ── Banner navigation ──
  const handleBannerPress = useCallback((b: any) => {
    if (!b) return;
    if (b.linkType === 'product' && b.linkId) navigation.navigate('ProductListing', { type: 'newest', title: 'Featured Product' });
    else if (b.linkType === 'brand' && b.linkId) navigation.navigate('BrandDetail', { brandId: b.linkId });
    else if (b.linkType === 'category' && b.linkId) navigation.navigate('ProductListing', { type: 'category', categoryId: b.linkId, title: 'Category' });
    else if (b.linkType === 'restaurant' && b.linkId) navigation.navigate('RestaurantDetail', { restaurantId: b.linkId });
  }, [navigation]);

  const handleSeeAll = useCallback((section: HomeSectionPayload) => {
    const va = section.viewAll;
    if (!va) return;
    navigation.navigate('ProductListing', {
      type: va.type, categoryId: va.id, maxPrice: va.maxPrice, title: section.title,
    });
  }, [navigation]);

  const handleCategoryPress = useCallback((cat: any) => {
    navigation.navigate('ProductListing', { type: 'category', categoryId: cat.id, title: cat.name });
  }, [navigation]);

  // ── Curated quick services ──
  const quickServices = useMemo<QuickService[]>(() => {
    const list: QuickService[] = [
      {
        id: 'deals',
        title: 'Deals & Offers',
        icon: 'pricetag',
        bg: '#FFE4E1', fg: theme.colors.discount,
        badge: 'HOT',
        onPress: () => navigation.navigate('ProductListing', { type: 'deals', title: 'Deals & Offers' }),
      },
      {
        id: 'best',
        title: 'Best Sellers',
        icon: 'trophy',
        bg: '#FFF1EA', fg: theme.colors.primary,
        onPress: () => navigation.navigate('ProductListing', { type: 'best_sellers', title: 'Best Sellers' }),
      },
      {
        id: 'fresh',
        title: 'Fresh Bazaar',
        icon: 'leaf',
        bg: '#E8F8EE', fg: '#10B981',
        onPress: () => navigation.navigate('ProductListing', { type: 'newest', title: 'Fresh Bazaar' }),
      },
      {
        id: 'budget',
        title: 'Under Rs.100',
        icon: 'cash',
        bg: '#E3EBFF', fg: '#3B82F6',
        onPress: () => navigation.navigate('ProductListing', { type: 'budget', maxPrice: 100, title: 'Under Rs.100' }),
      },
      {
        id: 'featured',
        title: 'Featured',
        icon: 'sparkles',
        bg: '#F3E8FF', fg: '#7C3AED',
        onPress: () => navigation.navigate('ProductListing', { type: 'featured', title: 'Featured' }),
      },
    ];
    if (showRashan) {
      list.push({
        id: 'rashan',
        title: 'Monthly Rashan',
        icon: 'cube',
        bg: '#1F1B47', fg: '#fff',
        onPress: () => navigation.navigate('RashanOrder'),
      });
    }
    return list;
  }, [navigation, showRashan]);

  // ── List data composition ──
  const listData = useMemo<ListItem[]>(() => {
    if (!home) return [];
    const items: ListItem[] = [];
    if (home.banners?.length) items.push({ kind: 'banners', banners: home.banners });
    items.push({ kind: 'services', services: quickServices });
    if (home.categories?.length) items.push({ kind: 'categories', categories: home.categories });
    if (home.brands?.length) items.push({ kind: 'brands', brands: home.brands });
    if (showRashan && home.rashanEnabled) items.push({ kind: 'rashan' });
    home.sections.forEach(section => items.push({ kind: 'section', section }));
    return items;
  }, [home, showRashan, quickServices]);

  const renderItem: ListRenderItem<ListItem> = useCallback(({ item }) => {
    switch (item.kind) {
      case 'banners':
        return <PromoCarousel banners={item.banners} onPress={handleBannerPress} />;
      case 'services':
        return <QuickServicesGrid services={item.services} variant="rail" />;
      case 'categories':
        return <CategoryGrid categories={item.categories} onCategoryPress={handleCategoryPress} />;
      case 'brands':
        return (
          <BrandStrip
            brands={item.brands}
            onBrandPress={(b) => navigation.navigate('BrandDetail', { brandId: b.id })}
            onSeeAll={() => navigation.navigate('BrandsList')}
          />
        );
      case 'rashan':
        return <RashanBanner onPress={() => navigation.navigate('RashanOrder')} />;
      case 'section':
        return (
          <HomeSection
            section={item.section}
            cartQuantities={cartQuantities}
            isFavourite={isFav}
            onAdd={handleAdd}
            onIncrement={handleIncrement}
            onDecrement={handleDecrement}
            onToggleFavourite={handleToggleFav}
            onSeeAll={handleSeeAll}
          />
        );
    }
  }, [
    cartQuantities, isFav, handleAdd, handleIncrement, handleDecrement,
    handleToggleFav, handleSeeAll, handleBannerPress, handleCategoryPress, navigation,
  ]);

  const keyExtractor = useCallback((item: ListItem, index: number) => {
    if (item.kind === 'section') return `section-${item.section.id}`;
    return `${item.kind}-${index}`;
  }, []);

  const cartCount = getCartCount('mart');
  const locationLabel = address
    ? (address.label || (address.streetAddress || '').slice(0, 28) || 'Set delivery address')
    : 'Set delivery address';
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning — what are we restocking today?';
    if (h < 17) return 'Good afternoon — fresh picks ready for you.';
    return 'Good evening — let\'s grab essentials before bedtime.';
  }, []);

  // ── Render ──
  if (loading && !home) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeHeader
          locationLabel={locationLabel}
          cartCount={cartCount}
          onLocationPress={() => navigation.navigate('SavedAddresses')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onCartPress={() => navigation.navigate('Cart')}
          onFavouritesPress={() => navigation.navigate('Favourites')}
          variant="mart"
          greeting={greeting}
        />
        <HomeSearchBar onPress={() => navigation.navigate('Search', { mode: 'mart' })} />
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !home) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeHeader
          locationLabel={locationLabel}
          cartCount={cartCount}
          onLocationPress={() => navigation.navigate('SavedAddresses')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onCartPress={() => navigation.navigate('Cart')}
          onFavouritesPress={() => navigation.navigate('Favourites')}
          variant="mart"
        />
        <ErrorState message={error} onRetry={() => loadHome(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        locationLabel={locationLabel}
        cartCount={cartCount}
        onLocationPress={() => navigation.navigate('SavedAddresses')}
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onCartPress={() => navigation.navigate('Cart')}
        onFavouritesPress={() => navigation.navigate('Favourites')}
        scrollY={scrollY}
        variant="mart"
        greeting={greeting}
      />
      <HomeSearchBar
        onPress={() => navigation.navigate('Search', { mode: 'mart' })}
        onFilter={() => navigation.navigate('ProductListing', { type: 'newest', title: 'All Products' })}
      />

      <Animated.FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem as any}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={4}
        maxToRenderPerBatch={4}
        windowSize={9}
        removeClippedSubviews
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          home && home.sections.length === 0
            ? (
              <EmptyState
                icon="basket-outline"
                title="Stocking up the shelves"
                subtitle="Please come back soon, more products are on the way!"
              />
            )
            : null
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
  listContent: { paddingBottom: 110, paddingTop: 0 },
});
