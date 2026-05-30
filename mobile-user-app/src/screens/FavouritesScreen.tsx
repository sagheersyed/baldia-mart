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
import { useCartStore } from '../store/cartStore';

import {
  AppText, AppIconButton, EmptyState,
} from '../components/ui';
import StoreCard from '../components/home/StoreCard';
import ProductCard from '../components/home/ProductCard';
import { theme } from '../theme/theme';

const TABS = ['Restaurants', 'Products', 'Medicines'] as const;
type TabKey = typeof TABS[number];

export default function FavouritesScreen({ navigation }: any) {
  const { activeMode } = useCartStore();
  const { settings } = useSettings();
  const showMart = settings?.feature_show_mart !== false;
  const showFood = settings?.feature_show_restaurants !== false;
  const showPharma = settings?.feature_show_pharma !== false;

  const initialTab: TabKey = showFood ? 'Restaurants' : showMart ? 'Products' : 'Medicines';
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [syncing, setSyncing] = useState(false);
  const { restaurants, products, brands, toggleFavourite, reload, syncFromApi } = useFavourites();
  const { foodCart, martCart, pharmaCart, addToCart, updateQuantity } = useCart();

  // Unique Favourites theme — Indigo (independent of modules)
  const favAccent = '#6366F1';
  const favAccentLight = '#EEF2FF';
  const favAccentBorder = '#C7D2FE';

  useFocusEffect(useCallback(() => {
    let active = true;
    const sync = async () => {
      setSyncing(true);
      await reload();
      try {
        const [rRes, pRes, bRes] = await Promise.allSettled([
          restaurantsApi.getAll(),
          productsApi.getAll(),
          import('../api/api').then(m => m.brandsApi.getAll()),
        ]);
        if (!active) return;
        const liveR = rRes.status === 'fulfilled' ? rRes.value.data : [];
        const liveP = pRes.status === 'fulfilled' ? pRes.value.data : [];
        const liveB = bRes.status === 'fulfilled' ? bRes.value.data : [];
        await syncFromApi(liveR, liveP, liveB);
      } catch {
        // noop
      } finally {
        if (active) setSyncing(false);
      }
    };
    sync();
    return () => { active = false; };
  }, [reload, syncFromApi]));

  const combinedShops = useMemo(() => [...restaurants, ...brands], [restaurants, brands]);
  
  const martProducts = useMemo(() => products.filter(p => !p.isPharma), [products]);
  const pharmaProducts = useMemo(() => products.filter(p => p.isPharma), [products]);

  const displayProducts = useMemo(() => {
    if (activeTab === 'Medicines') return pharmaProducts;
    return martProducts;
  }, [activeTab, martProducts, pharmaProducts]);

  const isEmpty = activeTab === 'Restaurants' 
    ? combinedShops.length === 0 
    : displayProducts.length === 0;

  const visibleTabs = useMemo(() =>
    TABS.filter(t => 
      (t === 'Restaurants' && showFood) || 
      (t === 'Products' && showMart) || 
      (t === 'Medicines' && showPharma)
    )
  , [showFood, showMart, showPharma]);

  const headerSubtitle = activeTab === 'Restaurants'
    ? `${combinedShops.length} ${combinedShops.length === 1 ? 'place' : 'places'} saved`
    : activeTab === 'Medicines'
    ? `${pharmaProducts.length} ${pharmaProducts.length === 1 ? 'medicine' : 'medicines'} saved`
    : `${martProducts.length} ${martProducts.length === 1 ? 'product' : 'products'} saved`;

  const renderRestaurantItem = ({ item }: any) => {
    const isBrand = brands.some(b => b.id === item.id);
    return (
      <View style={{ marginBottom: theme.spacing.md }}>
        <StoreCard
          store={item}
          variant="list"
          onPress={() => navigation.navigate(isBrand ? 'BrandDetail' : 'RestaurantDetail', isBrand ? { brandId: item.id } : { restaurantId: item.id })}
          onToggleFavourite={() => toggleFavourite(item, isBrand ? 'brands' : 'restaurants')}
          isFavourite
        />
      </View>
    );
  };

  const renderProductItem = ({ item }: any) => {
    const isPharmaItem = !!item.isPharma;
    const cart = isPharmaItem ? pharmaCart : martCart;
    const sectionName = isPharmaItem ? 'pharma' : 'mart';
    const accentColor = isPharmaItem ? theme.colors.pharma : theme.colors.primary;

    const cartItem = cart.find((c: any) => c.id === item.id || c.productId === item.id);
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
      addToCart(item, sectionName);
    };

    return (
      <View style={{ flex: 1, padding: 6 }}>
        <ProductCard
          product={item}
          cartQty={cartQty}
          variant="grid"
          isFavourite
          tint={accentColor}
          onPress={isPharmaItem ? () => navigation.navigate('MedicineDetail', { medicineId: item.id }) : () => navigation.navigate('Search', { initialQuery: item.name })}
          onAdd={handleAdd}
          onIncrement={() => addToCart(item, sectionName)}
          onDecrement={() => updateQuantity(item.id, Math.max(0, cartQty - 1), sectionName)}
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
        {syncing ? <ActivityIndicator size="small" color={favAccent} /> : null}
      </View>

      {visibleTabs.length > 1 ? (
        <View style={styles.tabs}>
          {visibleTabs.map((tab) => {
            const active = activeTab === tab;
            const icon: keyof typeof Ionicons.glyphMap =
              tab === 'Restaurants' ? 'restaurant-outline' : tab === 'Medicines' ? 'medical-outline' : 'basket-outline';
            return (
              <Pressable
                key={tab}
                style={[styles.tab, active ? { backgroundColor: favAccentLight, borderWidth: 1, borderColor: favAccentBorder } : null]}
                onPress={() => setActiveTab(tab)}
              >
                <Ionicons name={icon} size={16} color={active ? favAccent : theme.colors.textSecondary} />
                <AppText variant={active ? 'bodyStrong' : 'body'} color={active ? favAccent : theme.colors.textSecondary}>
                  {tab === 'Restaurants' ? 'Restaurants & shops' : tab === 'Medicines' ? 'Medicines' : 'Mart Products'}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {isEmpty ? (
        <EmptyState
          icon={activeTab === 'Restaurants' ? 'restaurant-outline' : activeTab === 'Medicines' ? 'medical-outline' : 'basket-outline'}
          title="No favourites yet"
          subtitle={activeTab === 'Restaurants'
            ? 'Tap the heart on any restaurant or shop to save it here.'
            : activeTab === 'Medicines'
            ? 'Tap the heart on any medicine to save it here.'
            : 'Tap the heart on any product to save it here.'}
          actionLabel="Explore"
          onAction={() => navigation.navigate(activeTab === 'Restaurants' ? 'Food' : activeTab === 'Medicines' ? 'Pharma' : 'Home')}
        />
      ) : activeTab === 'Restaurants' ? (
        <FlatList
          key="restaurants-list"
          data={combinedShops}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xxl }}
          renderItem={renderRestaurantItem}
        />
      ) : (
        <FlatList
          key="products-grid"
          data={displayProducts}
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
  tabActive: { 
    // Set in JSX
  },
});
