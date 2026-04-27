import React, { useCallback, useState, useMemo } from 'react';
import {
  View, StyleSheet, FlatList, Alert, Pressable, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { useFavourites } from '../hooks/useFavourites';
import { restaurantsApi, productsApi } from '../api/api';
import { useCart } from '../context/CartContext';
import { useSettings } from '../context/SettingsContext';
import { isBusinessOpen } from '../utils/helpers';

import {
  AppText, AppIconButton, EmptyState,
} from '../components/ui';
import StoreCard from '../components/home/StoreCard';
import ProductCard from '../components/home/ProductCard';
import { theme } from '../theme/theme';

const TABS = ['Restaurants', 'Products'] as const;
type TabKey = typeof TABS[number];

export default function FavouritesScreen({ navigation }: any) {
  const { settings } = useSettings();
  const showMart = settings?.feature_show_mart !== false;
  const showFood = settings?.feature_show_restaurants !== false;

  const initialTab: TabKey = showFood ? 'Restaurants' : 'Products';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [syncing, setSyncing] = useState(false);
  const { restaurants, products, toggleFavourite, reload, syncFromApi } = useFavourites();
  const { foodCart, martCart, addToCart, updateQuantity } = useCart();

  useFocusEffect(useCallback(() => {
    let active = true;
    const sync = async () => {
      setSyncing(true);
      await reload();
      try {
        const [rRes, pRes] = await Promise.allSettled([
          restaurantsApi.getAll(),
          productsApi.getAll(),
        ]);
        if (!active) return;
        const liveR = rRes.status === 'fulfilled' ? rRes.value.data : [];
        const liveP = pRes.status === 'fulfilled' ? pRes.value.data : [];
        await syncFromApi(liveR, liveP);
      } catch {
        // noop
      } finally {
        if (active) setSyncing(false);
      }
    };
    sync();
    return () => { active = false; };
  }, [reload, syncFromApi]));

  const isEmpty = activeTab === 'Restaurants' ? restaurants.length === 0 : products.length === 0;

  const visibleTabs = useMemo(() =>
    TABS.filter(t => (t === 'Restaurants' && showFood) || (t === 'Products' && showMart))
  , [showFood, showMart]);

  const headerSubtitle = activeTab === 'Restaurants'
    ? `${restaurants.length} ${restaurants.length === 1 ? 'restaurant' : 'restaurants'} saved`
    : `${products.length} ${products.length === 1 ? 'product' : 'products'} saved`;

  const renderRestaurantItem = ({ item }: any) => (
    <View style={{ marginBottom: theme.spacing.md }}>
      <StoreCard
        store={item}
        variant="list"
        onPress={() => navigation.navigate('RestaurantDetail', { restaurantId: item.id })}
        onToggleFavourite={() => toggleFavourite(item, 'restaurants')}
        isFavourite
      />
    </View>
  );

  const renderProductItem = ({ item }: any) => {
    const cartItem = martCart.find((c: any) => c.id === item.id) || foodCart.find((c: any) => c.id === item.id);
    const cartQty = cartItem?.quantity || 0;

    const isProductOpen = isBusinessOpen(item.openingTime, item.closingTime);
    const isBrandOpen = item.brand ? isBusinessOpen(item.brand.openingTime, item.brand.closingTime) : true;
    const isCatOpen = item.category ? isBusinessOpen(item.category.openingTime, item.category.closingTime) : true;
    const isEffectiveOpen = isProductOpen && isBrandOpen && isCatOpen;

    const handleAdd = () => {
      if (!isEffectiveOpen) return;
      if (item.maxQuantityPerOrder > 0 && cartQty >= item.maxQuantityPerOrder) {
        Alert.alert('Limit reached', `Maximum allowed per order is ${item.maxQuantityPerOrder} for ${item.name}.`);
        return;
      }
      addToCart(item, 'mart');
    };

    return (
      <View style={{ flex: 1, padding: 6 }}>
        <ProductCard
          product={item}
          cartQty={cartQty}
          variant="grid"
          isFavourite
          onPress={() => navigation.navigate('Search', { initialQuery: item.name })}
          onAdd={handleAdd}
          onIncrement={() => addToCart(item, 'mart')}
          onDecrement={() => updateQuantity(item.id, Math.max(0, cartQty - 1), 'mart')}
          onToggleFavourite={() => toggleFavourite(item, 'products')}
        />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <AppIconButton size={36} bg={theme.colors.surfaceMuted} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={theme.colors.textPrimary} />
        </AppIconButton>
        <View style={{ flex: 1 }}>
          <AppText variant="h2">My favourites</AppText>
          <AppText variant="caption">{headerSubtitle}</AppText>
        </View>
        {syncing ? <ActivityIndicator size="small" color={theme.colors.primary} /> : null}
      </View>

      {visibleTabs.length > 1 ? (
        <View style={styles.tabs}>
          {visibleTabs.map((tab) => {
            const active = activeTab === tab;
            const icon: keyof typeof Ionicons.glyphMap =
              tab === 'Restaurants' ? 'restaurant-outline' : 'basket-outline';
            return (
              <Pressable
                key={tab}
                style={[styles.tab, active ? styles.tabActive : null]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons name={icon} size={16} color={active ? theme.colors.primary : theme.colors.textSecondary} />
                <AppText variant={active ? 'bodyStrong' : 'body'} color={active ? theme.colors.primary : theme.colors.textSecondary}>
                  {tab === 'Restaurants' ? 'Restaurants & shops' : 'Products'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={activeTab === 'Restaurants' ? 'restaurant-outline' : 'basket-outline'}
          title="No favourites yet"
          subtitle={activeTab === 'Restaurants'
            ? 'Tap the heart on any restaurant or shop to save it here.'
            : 'Tap the heart on any product to save it here.'}
          actionLabel="Explore"
          onAction={() => navigation.navigate(activeTab === 'Restaurants' ? 'Food' : 'Home')}
        />
      ) : activeTab === 'Restaurants' ? (
        <FlatList
          key="restaurants-list"
          data={restaurants}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
          renderItem={renderRestaurantItem}
        />
      ) : (
        <FlatList
          key="products-grid"
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{ paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: theme.spacing.xxl }}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          renderItem={renderProductItem}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg, paddingVertical: theme.spacing.sm,
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },

  tabs: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.sm,
    borderBottomWidth: 1, borderBottomColor: theme.colors.divider,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: theme.radius.pill,
    backgroundColor: theme.colors.surfaceMuted,
  },
  tabActive: { backgroundColor: theme.colors.primaryLight, borderWidth: 1, borderColor: theme.colors.primaryBorder },
});
