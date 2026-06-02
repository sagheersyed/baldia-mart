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
import { formatRatingCount, getDistanceKm, isBusinessOpen } from '../utils/helpers';

import HomeHeader from '../components/home/HomeHeader';
import HomeSearchBar from '../components/home/HomeSearchBar';
import PromoCarousel from '../components/home/PromoCarousel';
import CampaignStrip from '../components/home/CampaignStrip';
import HomeSkeleton from '../components/home/HomeSkeleton';
import {
  AppText, AppBadge, EmptyState, ErrorState, SectionHeader,
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

// ─── Restaurant card ────────────────────────────────────────
const RestaurantCard = React.memo(function RestaurantCard({ resto, onPress }: any) {
  const cover = normalizeUrl(resto.coverUrl || resto.imageUrl);
  const logo  = normalizeUrl(resto.logoUrl);
  const open  = isBusinessOpen(resto.openingTime, resto.closingTime);
  const fee   = resto.deliveryFee != null ? Math.round(Number(resto.deliveryFee)) : null;
  const eta   = resto.deliveryTime || resto.openingHours || '20-35 min';
  const sponsored = !!resto.sponsored || !!resto.isAd;
  const freeDelivery = fee === 0 || !!resto.freeDelivery;
  const hasDeal = !!resto.discountText;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed ? { opacity: 0.92 } : null]}
    >
      <View style={styles.coverWrap}>
        {cover || logo ? (
          <Image
            source={{ uri: cover || logo! }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={180}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.placeholder]}>
            <Ionicons name="restaurant" size={36} color="#fff" />
          </View>
        )}
        {!open && (
          <LinearGradient
            colors={['rgba(15,23,42,0)', 'rgba(15,23,42,0.65)']}
            style={StyleSheet.absoluteFill}
          />
        )}
        {/* Badges row */}
        <View style={styles.coverBadges}>
          {hasDeal && <AppBadge label={resto.discountText || 'DEAL'} variant="discount" />}
          {freeDelivery && <AppBadge label="FREE DELIVERY" variant="free" />}
          {sponsored && <AppBadge label="Ad" variant="neutral" />}
        </View>
        {!open && (
          <View style={styles.closedPill}>
            <AppText variant="badge" color="#fff">CURRENTLY CLOSED</AppText>
          </View>
        )}
        {logo ? (
          <View style={styles.logoCircle}>
            <Image source={{ uri: logo }} style={styles.logoImg} contentFit="cover" cachePolicy="memory-disk" />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.titleRow}>
          <AppText variant="title" numberOfLines={1} style={{ flex: 1 }}>
            {resto.name}
          </AppText>
          {Number(resto.rating) > 0 && (
            <View style={styles.rating}>
              <Ionicons name="star" size={12} color="#F59E0B" />
              <AppText variant="captionStrong" color="#B45309" style={{ marginLeft: 2 }}>
                {Number(resto.rating).toFixed(1)}
                <AppText variant="caption">{formatRatingCount(resto.ratingCount)}</AppText>
              </AppText>
            </View>
          )}
        </View>
        {resto.cuisineType ? (
          <AppText variant="caption" numberOfLines={1}>{resto.cuisineType}</AppText>
        ) : null}

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={theme.colors.textSecondary} />
            <AppText variant="caption">{eta}</AppText>
          </View>
          {fee != null && !freeDelivery && (
            <View style={styles.metaItem}>
              <Ionicons name="bicycle" size={13} color={theme.colors.textSecondary} />
              <AppText variant="caption">Rs.{fee}</AppText>
            </View>
          )}
          {resto.proLabel ? (
            <AppBadge label={resto.proLabel} variant="pro" />
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
        if (toggles.open && !isBusinessOpen(r.openingTime, r.closingTime)) return false;
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
        const aOpen = isBusinessOpen(a.openingTime, a.closingTime);
        const bOpen = isBusinessOpen(b.openingTime, b.closingTime);
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
        />
        <HomeSearchBar
          variant="food"
          onPress={() => navigation.navigate('Search', { mode: 'food' })}
          onFilter={() => {}}
        />
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
        greeting="What are you craving today?"
        onLocationPress={() => navigation.navigate('SavedAddresses')}
        onNotificationsPress={() => navigation.navigate('Notifications')}
        onCartPress={() => navigation.navigate('Cart')}
        onFavouritesPress={() => navigation.navigate('Favourites')}
        scrollY={scrollY}
      />
      <HomeSearchBar
        variant="food"
        onPress={() => navigation.navigate('Search', { mode: 'food' })}
        onFilter={cycleSort}
      />

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
    marginBottom: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.colors.divider,
    ...theme.shadows.sm,
  },
  coverWrap: {
    height: 140,
    backgroundColor: theme.colors.surfaceMuted,
    overflow: 'hidden',
  },
  placeholder: {
    backgroundColor: theme.colors.food,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverBadges: {
    position: 'absolute',
    top: 10, left: 10,
    flexDirection: 'row',
    gap: 6,
  },
  closedPill: {
    position: 'absolute',
    alignSelf: 'center',
    top: '40%',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },
  logoCircle: {
    position: 'absolute',
    bottom: 10, right: 10,
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
    ...theme.shadows.sm,
  },
  logoImg: { width: 40, height: 40, borderRadius: 20 },

  info: { padding: theme.spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: 2 },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.warningLight,
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  metaRow: {
    marginTop: theme.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.md,
  },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
