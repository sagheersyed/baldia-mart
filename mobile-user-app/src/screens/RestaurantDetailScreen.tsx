import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import {
  View, StyleSheet, FlatList, RefreshControl, Pressable, ListRenderItem,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import { restaurantsApi, menuItemsApi, normalizeUrl } from '../api/api';
import { useCart } from '../context/CartContext';
import { useFavourites } from '../hooks/useFavourites';
import { formatRatingCount, isBusinessOpen } from '../utils/helpers';

import HomeSkeleton from '../components/home/HomeSkeleton';
import {
  AppText, AppBadge, AppIconButton, FavouriteButton, PriceText, QuantityStepper,
  EmptyState, ErrorState,
} from '../components/ui';
import { theme } from '../theme/theme';

type Row =
  | { kind: 'hero' }
  | { kind: 'info' }
  | { kind: 'tabs' }
  | { kind: 'sectionHeader'; title: string; count: number }
  | { kind: 'menuItem'; item: any };

const MenuItemRow = memo(function MenuItemRow({
  item, cartQty, onAdd, onIncrement, onDecrement, restaurantClosed,
}: {
  item: any;
  cartQty: number;
  onAdd: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
  restaurantClosed: boolean;
}) {
  const finalPrice = Number(item.price) - Number(item.discount || 0);
  const oldPrice = Number(item.discount || 0) > 0 ? Number(item.price) : undefined;
  const itemClosed = !isBusinessOpen(item.openingTime, item.closingTime);
  const isClosed = restaurantClosed || itemClosed;
  const blocked = isClosed || (item.stockQuantity != null && item.stockQuantity <= 0);
  const imgUri = normalizeUrl(item.imageUrl);

  return (
    <View style={[styles.menuRow, blocked ? { opacity: 0.6 } : null]}>
      <View style={{ flex: 1, gap: 4 }}>
        {item.category ? (
          <AppText variant="overline" color={theme.colors.food}>
            {item.category}
          </AppText>
        ) : null}
        <AppText variant="bodyStrong" numberOfLines={2}>{item.name}</AppText>
        {item.description ? (
          <AppText variant="caption" numberOfLines={2}>{item.description}</AppText>
        ) : null}
        {item.prepTimeMinutes ? (
          <View style={styles.prepRow}>
            <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
            <AppText variant="caption">{item.prepTimeMinutes} min</AppText>
          </View>
        ) : null}
        <PriceText
          price={finalPrice}
          oldPrice={oldPrice}
          align="horizontal"
          size="md"
          style={{ marginTop: 4 }}
        />
      </View>

      <View style={styles.menuImgWrap}>
        {imgUri ? (
          <Image
            source={{ uri: imgUri }}
            style={styles.fill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View style={[styles.fill, styles.menuImgPlaceholder]}>
            <Ionicons name="restaurant" size={28} color={theme.colors.textSecondary} />
          </View>
        )}

        {isClosed ? (
          <View style={styles.closedOverlay}>
            <AppText variant="badge" color="#fff">CLOSED</AppText>
          </View>
        ) : null}

        <View style={styles.addCtaWrap}>
          {cartQty > 0 ? (
            <QuantityStepper
              quantity={cartQty}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              disabled={blocked}
              size="sm"
              tint={theme.colors.food}
            />
          ) : (
            <Pressable
              onPress={onAdd}
              disabled={blocked}
              style={({ pressed }) => [
                styles.addBtn,
                blocked ? { backgroundColor: theme.colors.borderStrong } : null,
                pressed ? { transform: [{ scale: 0.95 }] } : null,
              ]}
              hitSlop={6}
            >
              <Ionicons name="add" size={18} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
});

export default function RestaurantDetailScreen({ route, navigation }: any) {
  const { restaurantId, restaurantData } = route.params || {};
  const { foodCart, addToCart, updateQuantity, getCartCount, setActiveMode } = useCart();
  const { isFavourite, toggleFavourite } = useFavourites();

  useFocusEffect(useCallback(() => { setActiveMode('food'); }, [setActiveMode]));

  const [restaurant, setRestaurant] = useState<any>(restaurantData || null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(!restaurantData);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const isOpen = isBusinessOpen(restaurant?.openingTime, restaurant?.closingTime);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const [restRes, menuRes] = await Promise.all([
        restaurantData ? Promise.resolve({ data: restaurantData }) : restaurantsApi.getById(restaurantId),
        menuItemsApi.getByRestaurant(restaurantData?.id || restaurantId),
      ]);
      if (restRes.data) setRestaurant(restRes.data);
      setMenuItems(menuRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load restaurant.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, restaurantData]);

  useEffect(() => { loadData(true); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData(false);
  }, [loadData]);

  // ── Cart helpers ──
  const cartQty = useCallback((id: string) =>
    foodCart.find((c: any) => c.id === id)?.quantity || 0, [foodCart]);

  const handleAdd = useCallback((item: any) => {
    if (!isOpen) return;
    addToCart({
      ...item,
      restaurantId: restaurant?.id || restaurantId,
      restaurantName: restaurant?.name || 'Restaurant',
      prepTimeMinutes: item.prepTimeMinutes,
      maxQuantityPerOrder: item.maxQuantityPerOrder,
    }, 'food');
  }, [isOpen, addToCart, restaurant, restaurantId]);

  const handleDecrement = useCallback((item: any) => {
    const cur = cartQty(item.id);
    updateQuantity(item.id, Math.max(0, cur - 1), 'food');
  }, [cartQty, updateQuantity]);

  // ── Categories ──
  const categories = useMemo(() => {
    return Array.from(new Set(menuItems.map(i => i.category).filter(Boolean))) as string[];
  }, [menuItems]);

  const filteredItems = useMemo(() => {
    return selectedCategory ? menuItems.filter(i => i.category === selectedCategory) : menuItems;
  }, [menuItems, selectedCategory]);

  // ── Build rows: hero, info, tabs (sticky), section header(s) + items ──
  const data = useMemo<Row[]>(() => {
    const rows: Row[] = [{ kind: 'hero' }, { kind: 'info' }, { kind: 'tabs' }];

    if (selectedCategory) {
      rows.push({ kind: 'sectionHeader', title: selectedCategory, count: filteredItems.length });
      filteredItems.forEach(item => rows.push({ kind: 'menuItem', item }));
    } else if (categories.length === 0) {
      rows.push({ kind: 'sectionHeader', title: 'Full menu', count: filteredItems.length });
      filteredItems.forEach(item => rows.push({ kind: 'menuItem', item }));
    } else {
      categories.forEach(cat => {
        const sub = menuItems.filter(i => i.category === cat);
        rows.push({ kind: 'sectionHeader', title: cat, count: sub.length });
        sub.forEach(item => rows.push({ kind: 'menuItem', item }));
      });
    }
    return rows;
  }, [filteredItems, selectedCategory, categories, menuItems]);

  // Sticky index = position of 'tabs' row
  const stickyHeaderIndices = useMemo(() => [data.findIndex(r => r.kind === 'tabs')], [data]);

  const cover = normalizeUrl(restaurant?.coverUrl || restaurant?.imageUrl);
  const logo  = normalizeUrl(restaurant?.logoUrl || restaurant?.imageUrl);
  const isFav = restaurant && isFavourite(restaurant.id, 'restaurants');

  const renderRow: ListRenderItem<Row> = useCallback(({ item }) => {
    if (item.kind === 'hero') {
      return (
        <View style={styles.hero}>
          {cover ? (
            <Image source={{ uri: cover }} style={styles.coverImg} contentFit="cover" cachePolicy="memory-disk" />
          ) : (
            <View style={[styles.coverImg, styles.coverPlaceholder]}>
              <Ionicons name="restaurant" size={48} color="#fff" />
            </View>
          )}
          <LinearGradient
            colors={['rgba(15,23,42,0.05)', 'rgba(15,23,42,0.55)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTopBar}>
            <AppIconButton size={36} bg="rgba(255,255,255,0.9)" onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
            </AppIconButton>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AppIconButton
                size={36}
                bg="rgba(255,255,255,0.9)"
                onPress={() => navigation.navigate('Cart')}
              >
                <Ionicons name="bag-handle" size={18} color={theme.colors.food} />
              </AppIconButton>
              {restaurant ? (
                <FavouriteButton
                  active={!!isFav}
                  size={36}
                  onPress={() => toggleFavourite({
                    id: restaurant.id, name: restaurant.name, logoUrl: restaurant.logoUrl,
                    imageUrl: restaurant.imageUrl, cuisineType: restaurant.cuisineType, rating: restaurant.rating,
                  }, 'restaurants')}
                />
              ) : null}
            </View>
          </View>

          {!isOpen ? (
            <View style={styles.closedPill}>
              <AppText variant="badge" color="#fff">CURRENTLY CLOSED</AppText>
            </View>
          ) : null}
        </View>
      );
    }

    if (item.kind === 'info') {
      return (
        <View style={styles.infoCard}>
          <View style={styles.infoTitleRow}>
            {logo ? (
              <Image source={{ uri: logo }} style={styles.logo} contentFit="cover" />
            ) : null}
            <View style={{ flex: 1 }}>
              <AppText variant="h2" numberOfLines={1}>{restaurant?.name}</AppText>
              {restaurant?.cuisineType ? (
                <AppText variant="caption">{restaurant.cuisineType}</AppText>
              ) : null}
            </View>
          </View>

          <View style={styles.metaRow}>
            {restaurant?.rating > 0 ? (
              <View style={styles.metaPill}>
                <Ionicons name="star" size={12} color={theme.colors.warning} />
                <AppText variant="captionStrong">
                  {Number(restaurant.rating).toFixed(1)}
                  {formatRatingCount(restaurant.ratingCount)}
                </AppText>
              </View>
            ) : null}
            {restaurant?.deliveryTime ? (
              <View style={styles.metaPill}>
                <Ionicons name="time-outline" size={12} color={theme.colors.textSecondary} />
                <AppText variant="captionStrong">{restaurant.deliveryTime}</AppText>
              </View>
            ) : null}
            {restaurant?.deliveryFee != null ? (
              <View style={styles.metaPill}>
                <Ionicons name="bicycle" size={12} color={theme.colors.textSecondary} />
                <AppText variant="captionStrong">Rs. {Math.round(Number(restaurant.deliveryFee))}</AppText>
              </View>
            ) : null}
            {restaurant?.openingHours ? (
              <View style={styles.metaPill}>
                <Ionicons name="business-outline" size={12} color={theme.colors.textSecondary} />
                <AppText variant="captionStrong">{restaurant.openingHours}</AppText>
              </View>
            ) : null}
          </View>

          {restaurant?.location ? (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={theme.colors.textSecondary} />
              <AppText variant="caption" numberOfLines={1}>{restaurant.location}</AppText>
            </View>
          ) : null}

          {restaurant?.description ? (
            <AppText variant="body" color={theme.colors.textSecondary} style={{ marginTop: theme.spacing.sm }}>
              {restaurant.description}
            </AppText>
          ) : null}

          {!isOpen ? (
            <View style={styles.warnBanner}>
              <Ionicons name="alert-circle" size={18} color={theme.colors.danger} />
              <View style={{ flex: 1 }}>
                <AppText variant="bodyStrong" color={theme.colors.danger}>Currently closed</AppText>
                <AppText variant="caption">
                  {restaurant?.openingHours || `${restaurant?.openingTime} – ${restaurant?.closingTime}`}
                </AppText>
              </View>
            </View>
          ) : null}
        </View>
      );
    }

    if (item.kind === 'tabs') {
      return (
        <View style={styles.tabsWrap}>
          <FlatList
            data={[null, ...categories]}
            keyExtractor={(c) => c || 'all'}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: theme.spacing.lg, gap: 8 }}
            renderItem={({ item: cat }) => {
              const active = (cat === selectedCategory) || (!cat && !selectedCategory);
              return (
                <Pressable
                  onPress={() => setSelectedCategory(cat as any)}
                  style={[
                    styles.chip,
                    active ? { backgroundColor: theme.colors.food, borderColor: theme.colors.food } : null,
                  ]}
                >
                  <AppText
                    variant="captionStrong"
                    color={active ? '#fff' : theme.colors.textPrimary}
                  >
                    {cat || 'All'}
                  </AppText>
                </Pressable>
              );
            }}
          />
        </View>
      );
    }

    if (item.kind === 'sectionHeader') {
      return (
        <View style={styles.sectionHeader}>
          <AppText variant="title">{item.title}</AppText>
          <AppText variant="caption">{item.count} items</AppText>
        </View>
      );
    }

    return (
      <MenuItemRow
        item={item.item}
        cartQty={cartQty(item.item.id)}
        onAdd={() => handleAdd(item.item)}
        onIncrement={() => handleAdd(item.item)}
        onDecrement={() => handleDecrement(item.item)}
        restaurantClosed={!isOpen}
      />
    );
  }, [
    cover, logo, restaurant, isFav, isOpen,
    categories, selectedCategory, navigation,
    cartQty, handleAdd, handleDecrement, toggleFavourite,
  ]);

  const keyExtractor = useCallback((item: Row, index: number) => {
    if (item.kind === 'menuItem') return `m-${item.item.id}`;
    if (item.kind === 'sectionHeader') return `h-${item.title}-${index}`;
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

  const cartCount = getCartCount('food');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <FlatList
        data={data}
        keyExtractor={keyExtractor}
        renderItem={renderRow}
        stickyHeaderIndices={stickyHeaderIndices}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        ListEmptyComponent={
          <EmptyState icon="restaurant-outline" title="Menu coming soon" subtitle="This restaurant hasn't published items yet." />
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

      {cartCount > 0 ? (
        <View style={styles.stickyCta}>
          <Pressable onPress={() => navigation.navigate('Cart')} style={({ pressed }) => [
            styles.stickyBtn, pressed ? { opacity: 0.92 } : null,
          ]}>
            <View style={styles.stickyBadge}>
              <AppText variant="bodyStrong" color="#fff">{cartCount}</AppText>
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
  fill: { width: '100%', height: '100%' },

  // Hero
  hero: {
    width: '100%',
    height: 220,
    backgroundColor: theme.colors.food,
    overflow: 'hidden',
  },
  coverImg: { width: '100%', height: '100%' },
  coverPlaceholder: {
    backgroundColor: theme.colors.food,
    alignItems: 'center', justifyContent: 'center',
  },
  heroTopBar: {
    position: 'absolute', top: theme.spacing.md, left: theme.spacing.md, right: theme.spacing.md,
    flexDirection: 'row', justifyContent: 'space-between',
  },
  closedPill: {
    position: 'absolute', top: '40%', alignSelf: 'center',
    backgroundColor: 'rgba(15,23,42,0.85)',
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: theme.radius.pill,
  },

  // Info card
  infoCard: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.sm,
    marginTop: -16,
    borderTopLeftRadius: theme.radius.xl,
    borderTopRightRadius: theme.radius.xl,
  },
  infoTitleRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  logo: { width: 52, height: 52, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceMuted },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: theme.colors.surfaceMuted,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: theme.radius.pill,
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: theme.spacing.xs },
  warnBanner: {
    marginTop: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    backgroundColor: theme.colors.dangerLight,
    borderColor: theme.colors.dangerBorder,
    borderWidth: 1,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },

  // Tabs (sticky)
  tabsWrap: {
    paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1, borderBottomWidth: 1,
    borderColor: theme.colors.divider,
  },
  chip: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1, borderColor: theme.colors.border,
  },

  // Section header
  sectionHeader: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },

  // Menu rows
  menuRow: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.divider,
    gap: theme.spacing.md,
  },
  prepRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  menuImgWrap: {
    width: 110, height: 110,
    borderRadius: theme.radius.md,
    overflow: 'hidden',
    backgroundColor: theme.colors.surfaceMuted,
    position: 'relative',
  },
  menuImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  closedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center', justifyContent: 'center',
  },

  addCtaWrap: {
    position: 'absolute',
    bottom: -10,
    right: -6,
  },
  addBtn: {
    width: 36, height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.food,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
    ...theme.shadows.food,
  },

  // Sticky cart CTA
  stickyCta: {
    position: 'absolute',
    left: theme.spacing.lg, right: theme.spacing.lg,
    bottom: theme.spacing.lg,
  },
  stickyBtn: {
    backgroundColor: theme.colors.food,
    borderRadius: theme.radius.pill,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.md,
    ...theme.shadows.food,
  },
  stickyBadge: {
    minWidth: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 8,
  },
});
