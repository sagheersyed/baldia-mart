import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  brandId?: string;
};

export type FavType = 'restaurants' | 'products';

export function useFavourites() {
  const [restaurants, setRestaurants] = useState<FavItem[]>([]);
  const [products, setProducts] = useState<FavItem[]>([]);

  const load = useCallback(async () => {
    try {
      const [rRaw, pRaw] = await Promise.all([
        AsyncStorage.getItem(KEYS.restaurants),
        AsyncStorage.getItem(KEYS.products),
      ]);
      setRestaurants(rRaw ? JSON.parse(rRaw) : []);
      setProducts(pRaw ? JSON.parse(pRaw) : []);
    } catch (e) {
      console.error('[useFavourites] load error', e);
    }
  }, []);

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
      } catch (e) {
        console.error('[useFavourites] save error', e);
      }
    },
    [restaurants, products],
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
          .map((fav) => allProducts.find((p) => p.id === fav.id) ?? fav)
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

  return { restaurants, products, isFavourite, toggleFavourite, reload: load, syncFromApi };
}
