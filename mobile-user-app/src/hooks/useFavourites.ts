import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { favoritesApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

const KEYS = {
  restaurants: '@fav_restaurants',
  products: '@fav_products',
  brands: '@fav_brands',
};

export type FavItem = {
  id: string;
  name: string;
  imageUrl?: string | null;
  logoUrl?: string | null;
  // Extra info for display
  cuisineType?: string;
  rating?: number;
  ratingCount?: number;
  price?: number;
  discount?: number;
  category?: any;
  brand?: any;
  brandId?: string;
  openingTime?: string | null;
  closingTime?: string | null;
  maxQuantityPerOrder?: number;
  stockQuantity?: number;
  isPharma?: boolean;
};

export type FavType = 'restaurants' | 'products' | 'brands';

export function useFavourites() {
  const [restaurants, setRestaurants] = useState<FavItem[]>([]);
  const [products, setProducts] = useState<FavItem[]>([]);
  const [brands, setBrands] = useState<FavItem[]>([]);
  const { userToken } = useAuth();

  const load = useCallback(async () => {
    try {
      // 1. Load from local cache first for instant UI
      const [rRaw, pRaw, bRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.restaurants),
        AsyncStorage.getItem(KEYS.products),
        AsyncStorage.getItem(KEYS.brands),
      ]);
      const localR = rRaw ? JSON.parse(rRaw) : [];
      const localP = pRaw ? JSON.parse(pRaw) : [];
      const localB = bRaw ? JSON.parse(bRaw) : [];
      setRestaurants(localR);
      setProducts(localP);
      setBrands(localB);

      // 2. If logged in, sync with DB
      if (userToken) {
        const res = await favoritesApi.getAll();
        if (res.data) {
          const dbItems = res.data;
          const dbR = dbItems.filter((i: any) => i.type === 'restaurant');
          const dbP = dbItems.filter((i: any) => i.type === 'product' || i.type === 'medicine').map((i: any) => ({
            ...i,
            isPharma: i.type === 'medicine',
          }));
          const dbB = dbItems.filter((i: any) => i.type === 'brand');

          // Deduplicate
          const uniqueR = Array.from(new Map(dbR.map((r: any) => [r.id, r])).values()) as FavItem[];
          const uniqueP = Array.from(new Map(dbP.map((p: any) => [p.id, p])).values()) as FavItem[];
          const uniqueB = Array.from(new Map(dbB.map((b: any) => [b.id, b])).values()) as FavItem[];

          // If local has more, sync local to DB
          if ((localR.length > 0 || localP.length > 0 || localB.length > 0) && dbItems.length === 0) {
            const syncItems = [
                ...localR.map((r: any) => ({ type: 'restaurant' as const, targetId: r.id })),
                ...localP.map((p: any) => ({ type: (p.isPharma ? 'medicine' : 'product') as any, targetId: p.id })),
                ...localB.map((b: any) => ({ type: 'brand' as const, targetId: b.id })),
            ];
            await favoritesApi.sync(syncItems);
          } else {
            // Update local state and cache from DB
            setRestaurants(uniqueR);
            setProducts(uniqueP);
            setBrands(uniqueB);
            await Promise.all([
              AsyncStorage.setItem(KEYS.restaurants, JSON.stringify(uniqueR)),
              AsyncStorage.setItem(KEYS.products, JSON.stringify(uniqueP)),
              AsyncStorage.setItem(KEYS.brands, JSON.stringify(uniqueB)),
            ]);
          }
        }
      }
    } catch (e) {
      console.error('[useFavourites] load error', e);
    }
  }, [userToken]);

  useEffect(() => {
    load();
  }, [load]);

  const isFavourite = useCallback(
    (id: string, type: FavType) => {
      const list = type === 'restaurants' ? restaurants : type === 'brands' ? brands : products;
      return list.some((item) => item.id === id);
    },
    [restaurants, products, brands],
  );

  const toggleFavourite = useCallback(
    async (item: FavItem, type: FavType) => {
      const key = KEYS[type];
      const current = type === 'restaurants' ? restaurants : type === 'brands' ? brands : products;
      const set = type === 'restaurants' ? setRestaurants : type === 'brands' ? setBrands : setProducts;
      const exists = current.some((i) => i.id === item.id);
      const updated = exists
        ? current.filter((i) => i.id !== item.id)
        : [...current, item];

      // Optimistic update
      set(updated);

      try {
        await AsyncStorage.setItem(key, JSON.stringify(updated));
        if (userToken) {
           // Call API to toggle in DB
           let apiType: 'product' | 'restaurant' | 'brand' | 'medicine' = type === 'restaurants' ? 'restaurant' : type === 'brands' ? 'brand' : 'product';
           if (apiType === 'product' && item.isPharma) {
             apiType = 'medicine';
           }
           await favoritesApi.toggle(apiType, item.id);
        }
      } catch (e: any) {
        console.warn('[useFavourites] save/toggle error, rolling back', e?.message);
        // Rollback optimistic update
        set(current);
        await AsyncStorage.setItem(key, JSON.stringify(current));
      }
    },
    [restaurants, products, brands, userToken],
  );

  // Sync saved favourites with live API data (refreshes name, image, rating)
  const syncFromApi = useCallback(
    async (allRestaurants: FavItem[], allProducts: FavItem[], allBrands?: FavItem[]) => {
      try {
        const [rRaw, pRaw, bRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.restaurants),
          AsyncStorage.getItem(KEYS.products),
          AsyncStorage.getItem(KEYS.brands),
        ]);
        const savedR: FavItem[] = rRaw ? JSON.parse(rRaw) : [];
        const savedP: FavItem[] = pRaw ? JSON.parse(pRaw) : [];
        const savedB: FavItem[] = bRaw ? JSON.parse(bRaw) : [];

        const updatedR = savedR
          .map((fav) => allRestaurants.find((r) => r.id === fav.id) ?? fav)
          .filter(Boolean) as FavItem[];

        const updatedP = savedP
          .map((fav) => {
            const items = Array.isArray(allProducts) ? allProducts : ((allProducts as any)?.data || []);
            const live = items.find((p: any) => p.id === fav.id);
            if (!live) return fav;
            return {
              ...fav,
              name: live.name,
              imageUrl: live.imageUrl,
              price: live.price,
              discount: live.discount,
              category: live.category,
              brand: live.brand,
              openingTime: live.openingTime,
              closingTime: live.closingTime,
              maxQuantityPerOrder: live.maxQuantityPerOrder,
              stockQuantity: live.stockQuantity,
            };
          })
          .filter(Boolean) as FavItem[];

        const updatedB = allBrands ? savedB
          .map((fav) => allBrands.find((b) => b.id === fav.id) ?? fav)
          .filter(Boolean) as FavItem[] : savedB;

        setRestaurants(updatedR);
        setProducts(updatedP);
        setBrands(updatedB);
        await Promise.all([
          AsyncStorage.setItem(KEYS.restaurants, JSON.stringify(updatedR)),
          AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedP)),
          AsyncStorage.setItem(KEYS.brands, JSON.stringify(updatedB)),
        ]);
      } catch (e) {
        console.error('[useFavourites] syncFromApi error', e);
      }
    },
    [],
  );

  const clearFavourites = useCallback(async () => {
    setRestaurants([]);
    setProducts([]);
    setBrands([]);
    try {
      await Promise.all([
        AsyncStorage.removeItem(KEYS.restaurants),
        AsyncStorage.removeItem(KEYS.products),
        AsyncStorage.removeItem(KEYS.brands),
      ]);
    } catch (e) {
      console.error('[useFavourites] clear error', e);
    }
  }, []);

  return { restaurants, products, brands, isFavourite, toggleFavourite, reload: load, syncFromApi, clearFavourites };
}
