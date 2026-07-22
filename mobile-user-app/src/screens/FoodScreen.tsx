import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, Animated, ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  addressesApi, bannersApi, restaurantsApi, deliveryZonesApi,
  normalizeUrl, socket, connectSocket, moduleEventsApi,
} from '../api/api';
import { useCart } from '../context/CartContext';
import { getDistanceKm, isBusinessOpen } from '../utils/helpers';

import HomeHeader from '../components/home/HomeHeader';
import HomeSearchBar from '../components/home/HomeSearchBar';
import PromoCarousel from '../components/home/PromoCarousel';
import CampaignStrip from '../components/home/CampaignStrip';
import HomeSkeleton from '../components/home/HomeSkeleton';
import {
  AppText, EmptyState, ErrorState, SectionHeader,
} from '../components/ui';
import { theme } from '../theme/theme';

// ─── Cuisines ───────────────────────────────────────────────
const CUISINES: { id: string; label: string; icon: keyof typeof Ionicons.glyphMap; bg: string; fg: string; }[] = [
  { id: 'all',     label: 'All',      icon: 'restaurant',     bg: '#FEEBEB', fg: theme.colors.food },
  { id: 'burger',  label: 'Burgers',  icon: 'fast-food',      bg: '#FEF3C7', fg: '#F59E0B' },
  { id: 'pizza',   label: 'Pizza',    icon: 'pizza',          bg: '#FEE2E2', fg: '#EF4444' },
  { id: 'biryani', label: 'Biryani',  icon: 'flame',          bg: '#FFF1E6', fg: '#FF4500' },
  { id: 'desi',    label: 'Desi',     icon: 'cafe',           bg: '#E8F8EE', fg: '#10B981' },
  { id: 'chinese', label: 'Chinese',  icon: 'reader',         bg: '#EFF6FF', fg: '#3B82F6' },
  { id: 'bbq',     label: 'BBQ',      icon: 'bonfire',        bg: '#FFF7ED', fg: '#EA580C' },
  { id: 'sweet',   label: 'Sweets',   icon: 'ice-cream',      bg: '#FDF4FF', fg: '#9333EA' },
  { id: 'drink',   label: 'Drinks',   icon: 'wine',           bg: '#E3EBFF', fg: '#3B82F6' },
];

// ─── Filters ────────────────────────────────────────────────
const SORT_OPTIONS: { id: string; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'fastest',     label: 'Fastest delivery' },
  { id: 'rating',      label: 'Top rated' },
  { id: 'fee',         label: 'Lowest fee' },
];

const TOGGLES: { id: 'free' | 'open' | 'deals'; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'free',  label: 'Free delivery', icon: 'bicycle' },
  { id: 'open',  label: 'Open now',      icon: 'time' },
  { id: 'deals', label: 'Deals',         icon: 'pricetag' },
];

// ─── Cuisine chip ────────────────────────────────────────────
const CuisineChip = React.memo(function CuisineChip({
  data, isActive, onPress,
}: { data: typeof CUISINES[number]; isActive: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.cuisineChip,
        isActive ? { backgroundColor: data.fg, borderColor: data.fg } : { backgroundColor: data.bg, borderColor: data.bg },
        pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : null,
      ]}
    >
      <Ionicons name={data.icon} size={16} color={isActive ? '#fff' : data.fg} />
      <AppText
        variant="captionStrong"
        color={isActive ? '#fff' : theme.colors.textPrimary}
      >
        {data.label}
      </AppText>
    </Pressable>
  );
});

// ─── Restaurant card helpers ──────────────────────────────────
const formatCuisine = (raw?: string) => {
  if (!raw) return '';
  return raw.split(',').map(s => s.trim()).filter(Boolean).join(' · ');
};

const getDeliveryLabel = (resto: any) => {
  if (resto.deliveryTime) return resto.deliveryTime;
  const min = Number(resto.deliveryEtaMin);
  if (min > 0) return `${min}-${min + 15} min`;
  return '25-40 min';
};

const getReviewLabel = (count?: number | null) => {
  if (!count) return '';
  if (count < 100) return `${count} reviews`;
  const rounded = Math.floor(count / 100) * 100;
  return `${rounded}+ reviews`;
};

// ─── Restaurant card ────────────────────────────────────────
const RestaurantCard = React.memo(function RestaurantCard({ resto, onPress }: any) {
  const cover = normalizeUrl(resto.coverUrl || resto.imageUrl);
  const logo = normalizeUrl(resto.logoUrl);
  const open = isBusinessOpen(resto);
  const fee = resto.deliveryFee != null ? Math.round(Number(resto.deliveryFee)) : null;
  const deliveryLabel = getDeliveryLabel(resto);
  const sponsored = !!resto.sponsored || !!resto.isAd;
  const freeDelivery = fee === 0 || !!resto.freeDelivery;
  const hasDeal = !!resto.discountText;
  const rating = Number(resto.rating) || 0;
  const cuisine = formatCuisine(resto.cuisineType);
  const reviewLabel = getReviewLabel(resto.ratingCount);

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        !open && styles.cardClosed,
        pressed ? styles.cardPressed : null,
      ]}
    >
      <View style={styles.coverWrap}>
        {cover || logo ? (
          <Image
            source={{ uri: cover || logo! }}
            style={[StyleSheet.absoluteFill, !open && styles.coverDimmed]}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={220}
          />
        ) : (
          <LinearGradient
            colors={['#C62828', '#E53935', '#FF7043']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          >
            <View style={styles.placeholder}>
              <Ionicons name="restaurant-outline" size={42} color="rgba(255,255,255,0.92)" />
            </View>
          </LinearGradient>
        )}

        <LinearGradient
          colors={['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.55)']}
          locations={[0.35, 1]}
          style={styles.coverGradient}
        />

        <View style={styles.coverTopRow}>
          <View style={styles.coverBadges}>
            {hasDeal ? (
              <View style={styles.dealPill}>
                <AppText variant="badge" color="#fff" style={styles.dealText}>
                  {resto.discountText || 'DEAL'}
                </AppText>
              </View>
            ) : null}
            {freeDelivery ? (
              <View style={styles.freePill}>
                <AppText variant="badge" color={theme.colors.success} style={styles.dealText}>
                  FREE DELIVERY
                </AppText>
              </View>
            ) : null}
            {sponsored ? (
              <View style={styles.adPill}>
                <AppText variant="badge" color="#fff" style={styles.dealText}>Ad</AppText>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.coverBottomRow}>
          {logo ? (
            <View style={styles.logoCircle}>
              <Image
                source={{ uri: logo }}
                style={styles.logoImg}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
            </View>
          ) : (
            <View style={styles.logoSpacer} />
          )}

          {!open ? (
            <View style={styles.closedPill}>
              <Ionicons name="moon-outline" size={11} color="#fff" />
              <AppText variant="badge" color="#fff">Closed</AppText>
            </View>
          ) : null}
        </View>
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <AppText variant="title" numberOfLines={1} style={styles.name}>
            {resto.name}
          </AppText>
          {rating > 0 ? (
            <View style={styles.ratingChip}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <AppText variant="captionStrong" color={theme.colors.textHeader} style={styles.ratingValue}>
                {rating.toFixed(1)}
              </AppText>
            </View>
          ) : null}
        </View>

        {cuisine ? (
          <AppText variant="caption" numberOfLines={1} color={theme.colors.textSecondary} style={styles.cuisine}>
            {cuisine}
          </AppText>
        ) : null}

        {reviewLabel ? (
          <AppText variant="caption" color={theme.colors.textMuted} style={styles.reviews}>
            {reviewLabel}
          </AppText>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color={theme.colors.food} />
            <AppText variant="captionStrong" color={theme.colors.textPrimary}>
              {deliveryLabel}
            </AppText>
          </View>

          {(freeDelivery || fee != null) ? (
            <>
              <View style={styles.metaDot} />
              {freeDelivery ? (
                <View style={styles.metaItem}>
                  <Ionicons name="bicycle-outline" size={14} color={theme.colors.success} />
                  <AppText variant="captionStrong" color={theme.colors.success}>
                    Free delivery
                  </AppText>
                </View>
              ) : (
                <View style={styles.metaItem}>
                  <Ionicons name="bicycle-outline" size={14} color={theme.colors.textSecondary} />
                  <AppText variant="captionStrong" color={theme.colors.textPrimary}>
                    Rs.{fee}
                  </AppText>
                </View>
              )}
            </>
          ) : null}

          {resto.proLabel ? (
            <>
              <View style={styles.metaDot} />
              <View style={styles.proChip}>
                <Ionicons name="flash" size={11} color={theme.colors.pro} />
                <AppText variant="badge" color={theme.colors.pro} style={{ fontSize: 9 }}>
                  {resto.proLabel}
                </AppText>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
});

// ════════════════════════════════════════════════════════════
type ListRow =
  | { kind: 'banners' }
  | { kind: 'cuisines' }
  | { kind: 'toggles' }
  | { kind: 'campaigns' }
  | { kind: 'sectionHeader'; title: string; subtitle?: string }
  | { kind: 'restaurant'; resto: any };

export default function FoodScreen({ navigation }: any) {
  const { setActiveMode, getCartCount } = useCart();
  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activeCuisine, setActiveCuisine] = useState('all');
  const [activeSort, setActiveSort] = useState<string>('recommended');
  const [toggles, setToggles] = useState<{ free: boolean; open: boolean; deals: boolean }>({
    free: false, open: false, deals: false,
  });

  const [address, setAddress] = useState<any>(null);
  const [activeZones, setActiveZones] = useState<any[]>([]);

  const scrollY = useRef(new Animated.Value(0)).current;

  // ── Loaders ──
  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [restRes, addrRes, zonesRes] = await Promise.all([
        restaurantsApi.getAll().catch(() => ({ data: [] })),
        addressesApi.getAll().catch(() => ({ data: [] })),
        deliveryZonesApi.getActive().catch(() => ({ data: [] })),
      ]);

      const addrs = addrRes.data || [];
      const currentAddr = addrs.find((a: any) => a.isDefault) || addrs[0] || null;
      const zones = zonesRes.data || [];

      let zoneId: string | undefined;
      if (currentAddr?.latitude && currentAddr?.longitude) {
        const matching = zones.find((z: any) =>
          getDistanceKm(
            Number(currentAddr.latitude), Number(currentAddr.longitude),
            Number(z.centerLat), Number(z.centerLng),
          ) <= Number(z.radiusKm),
        );
        zoneId = matching?.id;
      }

      const [bannerRes, campaignRes] = await Promise.all([
        bannersApi.getBySection('food', zoneId).catch(() => ({ data: [] })),
        moduleEventsApi.getAll('food').catch(() => ({ data: [] })),
      ]);

      setRestaurants((restRes.data || []).filter((r: any) => r.isActive !== false));
      setBanners(bannerRes.data || []);
      setCampaigns(campaignRes.data || []);
      setAddress(currentAddr);
      setActiveZones(zones);
    } catch (e: any) {
      console.warn('[Food] failed to load', e?.message || e);
      setError(e?.response?.data?.message || e?.message || 'Failed to load food.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    setActiveMode('food');
    loadData(restaurants.length === 0);
  }, [loadData, setActiveMode]));

  useEffect(() => {
    connectSocket();
    const onBannersUpdated = async () => {
      if (!navigation.isFocused()) return;
      try {
        const [bRes, cRes] = await Promise.all([
          bannersApi.getBySection('food'),
          moduleEventsApi.getAll('food'),
        ]);
        setBanners(bRes.data || []);
        setCampaigns(cRes.data || []);
      } catch {}
    };
    socket.on('bannersUpdated', onBannersUpdated);
    return () => { socket.off('bannersUpdated', onBannersUpdated); };
  }, [navigation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // ── Filtering + sorting ──
  const filteredSorted = useMemo(() => {
    return [...restaurants]
      .filter((r: any) => {
        // Cuisine
        if (activeCuisine !== 'all'
          && !(r.cuisineType?.toLowerCase().includes(activeCuisine.toLowerCase()))
          && !(r.tags || []).some((t: string) => t.toLowerCase().includes(activeCuisine.toLowerCase()))) {
          return false;
        }
        // Toggles
        if (toggles.open && !isBusinessOpen(r)) return false;
        if (toggles.free && !(Number(r.deliveryFee) === 0 || r.freeDelivery)) return false;
        if (toggles.deals && !r.discountText && !r.hasDeal) return false;

        // Zone filter (preserved)
        if (activeZones.length > 0 && address?.latitude && address?.longitude) {
          const userZones = activeZones.filter(z =>
            getDistanceKm(Number(address.latitude), Number(address.longitude), Number(z.centerLat), Number(z.centerLng)) <= Number(z.radiusKm),
          );
          if (userZones.length === 0) return false;
          if (!r.latitude || !r.longitude) return false;
          const isRestoInUserZone = userZones.some(z =>
            getDistanceKm(Number(r.latitude), Number(r.longitude), Number(z.centerLat), Number(z.centerLng)) <= Number(z.radiusKm),
          );
          if (!isRestoInUserZone) return false;
        }
        return true;
      })
      .sort((a: any, b: any) => {
        const aOpen = isBusinessOpen(a);
        const bOpen = isBusinessOpen(b);
        if (aOpen !== bOpen) return aOpen ? -1 : 1;

        if (activeSort === 'rating') return Number(b.rating || 0) - Number(a.rating || 0);
        if (activeSort === 'fastest') {
          const aMin = Number(a.deliveryEtaMin || 30);
          const bMin = Number(b.deliveryEtaMin || 30);
          return aMin - bMin;
        }
        if (activeSort === 'fee') {
          return Number(a.deliveryFee || 0) - Number(b.deliveryFee || 0);
        }
        return Number(b.rating || 0) - Number(a.rating || 0);
      });
  }, [restaurants, activeCuisine, activeSort, toggles, activeZones, address]);

  // ── List composition ──
  const dealsRestaurants = useMemo(
    () => filteredSorted.filter(r => r.discountText || r.hasDeal).slice(0, 6),
    [filteredSorted],
  );

  const data = useMemo<ListRow[]>(() => {
    const rows: ListRow[] = [
      { kind: 'banners' },
      { kind: 'cuisines' },
      { kind: 'toggles' },
    ];
    if (campaigns.length > 0) {
      rows.push({ kind: 'campaigns' });
    }
    if (dealsRestaurants.length) {
      rows.push({ kind: 'sectionHeader', title: 'Deals near you', subtitle: 'Limited-time discounts' });
      dealsRestaurants.forEach(r => rows.push({ kind: 'restaurant', resto: r }));
    }
    rows.push({
      kind: 'sectionHeader',
      title: 'All restaurants',
      subtitle: `${filteredSorted.length} available • Sort: ${SORT_OPTIONS.find(s => s.id === activeSort)?.label}`,
    });
    filteredSorted.forEach(r => rows.push({ kind: 'restaurant', resto: r }));
    return rows;
  }, [filteredSorted, dealsRestaurants, activeSort, campaigns]);

  // ── Banner navigation ──
  const handleBannerPress = useCallback((b: any) => {
    if (!b) return;
    if (b.linkType === 'restaurant' && b.linkId) {
      const resto = restaurants.find((r: any) => r.id === b.linkId);
      navigation.navigate('RestaurantDetail', { restaurantId: b.linkId, restaurantData: resto });
    } else if (b.linkType === 'category' && b.linkId) {
      setActiveCuisine(b.linkId);
    } else if (b.linkType === 'brand' && b.linkId) {
      navigation.navigate('BrandDetail', { brandId: b.linkId });
    } else if (b.linkType === 'event' && b.linkId) {
      navigation.navigate('EventDetails', { eventId: b.linkId });
    } else {
      navigation.navigate('Search', { mode: 'food' });
    }
  }, [navigation, restaurants]);

  const cycleSort = useCallback(() => {
    const idx = SORT_OPTIONS.findIndex(s => s.id === activeSort);
    setActiveSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].id);
  }, [activeSort]);

  const renderRow: ListRenderItem<ListRow> = useCallback(({ item }) => {
    switch (item.kind) {
      case 'banners':
        return <PromoCarousel banners={banners} onPress={handleBannerPress} />;
      case 'cuisines':
        return (
          <FlatList
            data={CUISINES}
            keyExtractor={(c) => c.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cuisineRow}
            renderItem={({ item: c }) => (
              <CuisineChip
                data={c}
                isActive={activeCuisine === c.id}
                onPress={() => setActiveCuisine(c.id)}
              />
            )}
          />
        );
      case 'toggles':
        return (
          <View style={styles.togglesWrap}>
            <Pressable onPress={cycleSort} style={styles.sortBtn}>
              <Ionicons name="swap-vertical" size={14} color={theme.colors.textPrimary} />
              <AppText variant="captionStrong" color={theme.colors.textPrimary}>
                {SORT_OPTIONS.find(s => s.id === activeSort)?.label}
              </AppText>
            </Pressable>
            {TOGGLES.map(t => {
              const active = toggles[t.id];
              return (
                <Pressable
                  key={t.id}
                  onPress={() => setToggles(s => ({ ...s, [t.id]: !s[t.id] }))}
                  style={[
                    styles.togglePill,
                    active ? { backgroundColor: theme.colors.food, borderColor: theme.colors.food } : null,
                  ]}
                >
                  <Ionicons name={t.icon} size={14} color={active ? '#fff' : theme.colors.textSecondary} />
                  <AppText
                    variant="captionStrong"
                    color={active ? '#fff' : theme.colors.textPrimary}
                  >
                    {t.label}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        );
      case 'campaigns':
        return (
          <CampaignStrip
            events={campaigns}
            onPress={(ev) => navigation.navigate('EventDetails', { eventId: ev.id })}
          />
        );
      case 'sectionHeader':
        return <SectionHeader title={item.title} subtitle={item.subtitle} />;
      case 'restaurant':
        return (
          <RestaurantCard
            resto={item.resto}
            onPress={() =>
              navigation.navigate('RestaurantDetail', {
                restaurantId: item.resto.id,
                restaurantData: item.resto,
              })
            }
          />
        );
    }
  }, [banners, campaigns, activeCuisine, activeSort, toggles, cycleSort, handleBannerPress, navigation]);

  const keyExtractor = useCallback((item: ListRow, index: number) => {
    if (item.kind === 'restaurant') return `r-${item.resto.id}`;
    if (item.kind === 'sectionHeader') return `h-${item.title}-${index}`;
    return `${item.kind}-${index}`;
  }, []);

  // ── Header & search ──
  const cartCount = getCartCount('food');
  const locationLabel = address
    ? (address.label || (address.streetAddress || '').slice(0, 28) || 'Set delivery address')
    : 'Set delivery address';

  if (loading && !restaurants.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeHeader
          locationLabel={locationLabel}
          cartCount={cartCount}
          variant="food"
          greeting="What are you craving today?"
          onLocationPress={() => navigation.navigate('SavedAddresses')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onCartPress={() => navigation.navigate('Cart')}
          onFavouritesPress={() => navigation.navigate('Favourites')}
        >
          <HomeSearchBar
            variant="food"
            onPress={() => navigation.navigate('Search', { mode: 'food' })}
            onFilter={() => {}}
            floating={false}
            inHeader={true}
          />
        </HomeHeader>
        <HomeSkeleton />
      </SafeAreaView>
    );
  }

  if (error && !restaurants.length) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <HomeHeader
          locationLabel={locationLabel}
          cartCount={cartCount}
          variant="food"
          onLocationPress={() => navigation.navigate('SavedAddresses')}
          onNotificationsPress={() => navigation.navigate('Notifications')}
          onCartPress={() => navigation.navigate('Cart')}
          onFavouritesPress={() => navigation.navigate('Favourites')}
        />
        <ErrorState message={error} onRetry={() => loadData(true)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HomeHeader
        locationLabel={locationLabel}
        cartCount={cartCount}
        variant="food"
        onLocationPress={() => navigation.navigate('SavedAddresses')}
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onCartPress={() => navigation.navigate('Cart')}
        onFavouritesPress={() => navigation.navigate('Favourites')}
      >
        <HomeSearchBar
          variant="food"
          onPress={() => navigation.navigate('Search', { mode: 'food' })}
          onFilter={cycleSort}
          floating={false}
          inHeader={true}
        />
      </HomeHeader>

      <Animated.FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderRow as any}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        initialNumToRender={5}
        maxToRenderPerBatch={6}
        windowSize={9}
        removeClippedSubviews
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <EmptyState
            icon="restaurant-outline"
            title="No restaurants found"
            subtitle="Try a different cuisine or address."
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.food}
            colors={[theme.colors.food]}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingBottom: 110 },

  // Cuisine chips
  cuisineRow: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.pill,
    borderWidth: 1.5,
    marginRight: theme.spacing.sm,
  },

  // Filter / toggles
  togglesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },

  // Restaurant card
  card: {
    marginHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    backgroundColor: theme.colors.surface,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    ...theme.shadows.md,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  cardClosed: {
    opacity: 0.92,
  },
  coverWrap: {
    height: 176,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    position: 'relative',
  },
  coverDimmed: {
    opacity: 0.55,
  },
  coverGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverTopRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    padding: 12,
  },
  coverBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  coverBottomRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  dealPill: {
    backgroundColor: theme.colors.food,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  freePill: {
    backgroundColor: '#fff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  adPill: {
    backgroundColor: 'rgba(15,23,42,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  dealText: {
    fontSize: 9,
    letterSpacing: 0.4,
    fontWeight: '800',
  },
  logoCircle: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#fff',
    ...theme.shadows.sm,
  },
  logoSpacer: {
    width: 48,
  },
  logoImg: {
    width: '100%',
    height: '100%',
  },
  closedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(15,23,42,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },

  info: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: theme.colors.surface,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  name: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.25,
    color: theme.colors.textHeader,
  },
  ratingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
  ratingValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  cuisine: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 2,
  },
  reviews: {
    fontSize: 11,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: theme.colors.textMuted,
  },
  proChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: theme.colors.proLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.radius.pill,
  },
});
