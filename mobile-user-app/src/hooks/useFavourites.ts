import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { favoritesApi } from '../api/api';
import { useAuth } from '../context/AuthContext';

const KEYS = {
  restaurants: '@fav_restaurants',
  products: '@fav_products',
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
};

export type FavType = 'restaurants' | 'products';

export function useFavourites() {
  const [restaurants, setRestaurants] = useState<FavItem[]>([]);
  const [products, setProducts] = useState<FavItem[]>([]);
  const { userToken } = useAuth();

  const load = useCallback(async () => {
    try {
      // 1. Load from local cache first for instant UI
      const [rRaw, pRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.restaurants),
        AsyncStorage.getItem(KEYS.products),
      ]);
      const localR = rRaw ? JSON.parse(rRaw) : [];
      const localP = pRaw ? JSON.parse(pRaw) : [];
      setRestaurants(localR);
      setProducts(localP);

      // 2. If logged in, sync with DB
      if (userToken) {
        const res = await favoritesApi.getAll();
        if (res.data) {
          const dbItems = res.data;
          const dbR = dbItems.filter((i: any) => i.type === 'restaurant');
          const dbP = dbItems.filter((i: any) => i.type === 'product');

          // Deduplicate
          const uniqueR = Array.from(new Map(dbR.map((r: any) => [r.id, r])).values()) as FavItem[];
          const uniqueP = Array.from(new Map(dbP.map((p: any) => [p.id, p])).values()) as FavItem[];

          // If local has more, sync local to DB
          if ((localR.length > 0 || localP.length > 0) && dbItems.length === 0) {
            const syncItems = [
                ...localR.map((r: any) => ({ type: 'restaurant', targetId: r.id })),
                ...localP.map((p: any) => ({ type: 'product', targetId: p.id })),
            ];
            await favoritesApi.sync(syncItems);
          } else {
            // Update local state and cache from DB
            setRestaurants(uniqueR);
            setProducts(uniqueP);
            await Promise.all([
              AsyncStorage.setItem(KEYS.restaurants, JSON.stringify(uniqueR)),
              AsyncStorage.setItem(KEYS.products, JSON.stringify(uniqueP)),
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
      const list = type === 'restaurants' ? restaurants : products;
      return list.some((item) => item.id === id);
    },
    [restaurants, products],
  );

  const toggleFavourite = useCallback(
    async (item: FavItem, type: FavType) => {
      const key = KEYS[type];
      const current = type === 'restaurants' ? restaurants : products;
      const exists = current.some((i) => i.id === item.id);
      const next = exists
        ? current.filter((i) => i.id !== item.id)
        : [...current, item];

      if (type === 'restaurants') setRestaurants(next);
      else setProducts(next);

      try {
        await AsyncStorage.setItem(key, JSON.stringify(next));
        if (userToken) {
           // Call API to toggle in DB
           await favoritesApi.toggle(type === 'restaurants' ? 'restaurant' : 'product', item.id);
        }
      } catch (e) {
        console.error('[useFavourites] save/toggle error', e);
      }
    },
    [restaurants, products, userToken],
  );

  // Sync saved favourites with live API data (refreshes name, image, rating)
  const syncFromApi = useCallback(
    async (allRestaurants: FavItem[], allProducts: FavItem[]) => {
      try {
        const [rRaw, pRaw] = await Promise.all([
          AsyncStorage.getItem(KEYS.restaurants),
          AsyncStorage.getItem(KEYS.products),
        ]);
        const savedR: FavItem[] = rRaw ? JSON.parse(rRaw) : [];
        const savedP: FavItem[] = pRaw ? JSON.parse(pRaw) : [];

        const updatedR = savedR
          .map((fav) => allRestaurants.find((r) => r.id === fav.id) ?? fav)
          .filter(Boolean) as FavItem[];

        const updatedP = savedP
          .map((fav) => {
            const live = allProducts.find((p) => p.id === fav.id);
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

        setRestaurants(updatedR);
        setProducts(updatedP);
        await AsyncStorage.setItem(KEYS.restaurants, JSON.stringify(updatedR));
        await AsyncStorage.setItem(KEYS.products, JSON.stringify(updatedP));
      } catch (e) {
        console.error('[useFavourites] syncFromApi error', e);
      }
    },
    [],
  );

  const clearFavourites = useCallback(async () => {
    setRestaurants([]);
    setProducts([]);
    try {
      await Promise.all([
        AsyncStorage.removeItem(KEYS.restaurants),
        AsyncStorage.removeItem(KEYS.products),
      ]);
    } catch (e) {
      console.error('[useFavourites] clear error', e);
    }
  }, []);

  return { restaurants, products, isFavourite, toggleFavourite, reload: load, syncFromApi, clearFavourites };
}
