import { create } from 'zustand';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';
import { normalizeUrl } from '../api/api';

const CART_KEYS = {
  mart: '@cart_mart',
  food: '@cart_food',
  pharma: '@cart_pharma',
};

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  restaurantId?: string;
  restaurantName?: string;
  prepTimeMinutes?: number;
  maxQuantityPerOrder?: number;
}

export interface PharmaCartItem {
  id: string; // medicineId
  name: string;
  mrp: number;
  sellingPrice: number;
  quantity: number;
  imageUrl?: string;
  requiresPrescription: boolean;
  dosageForm?: string;
  strength?: string;
  packSize?: string;
  categoryId?: string;
  maxQuantityPerOrder?: number;
}

interface CartState {
  martCart: CartItem[];
  foodCart: CartItem[];
  pharmaCart: PharmaCartItem[];
  activeMode: 'mart' | 'food' | 'pharma';
  activeOrdersCount: number;
  hydrated: boolean;

  rehydrate: () => Promise<void>;
  setActiveMode: (mode: 'mart' | 'food' | 'pharma') => void;
  setActiveOrdersCount: (count: number) => void;

  // ── Unified Cart Operations ──────────────────────────────────
  addToCart: (product: any, mode?: 'mart' | 'food' | 'pharma') => void;
  removeFromCart: (productId: string, mode?: 'mart' | 'food' | 'pharma') => void;
  updateQuantity: (productId: string, quantity: number, mode?: 'mart' | 'food' | 'pharma') => void;
  clearCart: (mode?: 'mart' | 'food' | 'pharma') => void;

  getCartTotal: (mode?: 'mart' | 'food' | 'pharma') => number;
  getCartCount: (mode?: 'mart' | 'food' | 'pharma') => number;
  getItemCount: (productId: string, mode?: 'mart' | 'food' | 'pharma') => number;

  getCurrentCart: () => (CartItem | PharmaCartItem)[];
  getCurrentTotal: () => number;
  getCurrentCount: () => number;

  // ── Pharma ───────────────────────────────────────────────────
  addToPharmaCart: (medicine: PharmaCartItem) => void;
  removeFromPharmaCart: (medicineId: string) => void;
  updatePharmaQuantity: (medicineId: string, quantity: number) => void;
  clearPharmaCart: () => void;
  getPharmaCartTotal: () => number;
  getPharmaCartCount: () => number;
  hasPharmaRxItems: () => boolean;
}

const savePharmaCart = (cart: PharmaCartItem[]) =>
  AsyncStorage.setItem(CART_KEYS.pharma, JSON.stringify(cart)).catch(() => {});

export const useCartStore = create<CartState>((set, get) => ({
  martCart: [],
  foodCart: [],
  pharmaCart: [],
  activeMode: 'mart',
  activeOrdersCount: 0,
  hydrated: false,

  rehydrate: async () => {
    try {
      const [martRaw, foodRaw, pharmaRaw] = await Promise.all([
        AsyncStorage.getItem(CART_KEYS.mart),
        AsyncStorage.getItem(CART_KEYS.food),
        AsyncStorage.getItem(CART_KEYS.pharma),
      ]);
      set({
        martCart: martRaw ? JSON.parse(martRaw) : [],
        foodCart: foodRaw ? JSON.parse(foodRaw) : [],
        pharmaCart: pharmaRaw ? JSON.parse(pharmaRaw) : [],
        hydrated: true,
      });
    } catch (e) {
      console.error('[Cart] Failed to rehydrate carts:', e);
      set({ hydrated: true });
    }
  },

  setActiveMode: (mode) => set({ activeMode: mode }),
  setActiveOrdersCount: (count) => set({ activeOrdersCount: count }),

  // ── Unified Cart Operations ──────────────────────────────────
  addToCart: (product, modeOpt) => {
    const { activeMode, martCart, foodCart, pharmaCart } = get();
    const mode = modeOpt || activeMode;

    // Resolve details from potentially nested objects (CMS patterns)
    const id = product.id;
    const name = product.name || product.medicine?.name || product.product?.name || product.item?.name || 'Unknown';
    const rawImage = 
      product.imageUrl || 
      product.image_url || 
      product.medicine?.imageUrl || 
      product.medicine?.image_url || 
      product.product?.imageUrl || 
      product.product?.image_url || 
      product.image || 
      '';
    const imageUrl = normalizeUrl(rawImage) || '';
    const limit = Number(product.maxQuantityPerOrder || product.medicine?.maxQuantityPerOrder || product.product?.maxQuantityPerOrder) || 0;

    if (mode === 'pharma') {
      const existing = pharmaCart.find((i) => i.id === id);
      let next: PharmaCartItem[];
      
      if (existing) {
        if (limit > 0 && existing.quantity >= limit) {
          Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${limit} units for ${name}.`);
          return;
        }
        next = pharmaCart.map((i) => (i.id === id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        next = [
          ...pharmaCart,
          {
            id: id,
            name: name,
            mrp: Number(product.mrp || product.medicine?.mrp || 0),
            sellingPrice: Number(
              product.sellingPrice || 
              product.selling_price || 
              product.price || 
              product.medicine?.mrp || 
              product.mrp || 0
            ) || Number(product.mrp || product.medicine?.mrp || 0),
            quantity: 1,
            imageUrl: imageUrl,
            requiresPrescription: !!(product.requiresPrescription || product.medicine?.requiresPrescription),
            dosageForm: product.dosageForm || product.medicine?.dosageForm,
            strength: product.strength || product.medicine?.strength,
            packSize: product.packSize || product.medicine?.packSize,
            categoryId: product.categoryId || product.medicine?.categoryId,
            maxQuantityPerOrder: limit,
          },
        ];
      }
      set({ pharmaCart: next });
      savePharmaCart(next);
      return;
    }

    const basePrice = Number(
      product.price || 
      product.sellingPrice || 
      product.selling_price || 
      product.product?.price || 
      product.medicine?.mrp || 
      product.mrp || 
      0
    );
    const discount = Number(product.discount || product.medicine?.discount || product.product?.discount || 0);
    const effectivePrice = basePrice - discount;

    const prevCart = mode === 'mart' ? martCart : foodCart;
    const existingItem = prevCart.find((item) => item.id === id);

    let nextCart;
    if (existingItem) {
      if (limit > 0 && existingItem.quantity >= limit) {
        Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${limit} units for ${name}.`);
        return;
      }
      nextCart = prevCart.map((item) =>
        item.id === id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      nextCart = [
        ...prevCart,
        {
          id: id,
          name: name,
          price: effectivePrice,
          imageUrl: imageUrl,
          quantity: 1,
          restaurantId: product.restaurantId,
          restaurantName: product.restaurantName,
          prepTimeMinutes: product.prepTimeMinutes,
          maxQuantityPerOrder: limit,
        },
      ];
    }

    if (mode === 'mart') {
      set({ martCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.mart, JSON.stringify(nextCart)).catch(() => {});
    } else {
      set({ foodCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.food, JSON.stringify(nextCart)).catch(() => {});
    }
  },

  removeFromCart: (productId, modeOpt) => {
    const { activeMode, martCart, foodCart, pharmaCart } = get();
    const mode = modeOpt || activeMode;

    if (mode === 'pharma') {
      const next = pharmaCart.filter((i) => i.id !== productId);
      set({ pharmaCart: next });
      savePharmaCart(next);
      return;
    }

    const prevCart = mode === 'mart' ? martCart : foodCart;
    const nextCart = prevCart.filter((item) => item.id !== productId);

    if (mode === 'mart') {
      set({ martCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.mart, JSON.stringify(nextCart)).catch(() => {});
    } else {
      set({ foodCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.food, JSON.stringify(nextCart)).catch(() => {});
    }
  },

  updateQuantity: (productId, quantity, modeOpt) => {
    const { activeMode, martCart, foodCart, pharmaCart, removeFromCart } = get();
    const mode = modeOpt || activeMode;

    if (quantity <= 0) {
      removeFromCart(productId, mode);
      return;
    }

    if (mode === 'pharma') {
      const item = pharmaCart.find((i) => i.id === productId);
      if (item && item.maxQuantityPerOrder && item.maxQuantityPerOrder > 0 && quantity > item.maxQuantityPerOrder) {
        Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${item.maxQuantityPerOrder} units.`);
        return;
      }
      const next = pharmaCart.map((i) => (i.id === productId ? { ...i, quantity } : i));
      set({ pharmaCart: next });
      savePharmaCart(next);
      return;
    }

    const prevCart = mode === 'mart' ? martCart : foodCart;
    const item = prevCart.find((i) => i.id === productId);

    if (item && (item.maxQuantityPerOrder ?? 0) > 0 && quantity > (item.maxQuantityPerOrder ?? 0)) {
      Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${item.maxQuantityPerOrder} units.`);
      return;
    }

    const nextCart = prevCart.map((i) => (i.id === productId ? { ...i, quantity } : i));

    if (mode === 'mart') {
      set({ martCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.mart, JSON.stringify(nextCart)).catch(() => {});
    } else {
      set({ foodCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.food, JSON.stringify(nextCart)).catch(() => {});
    }
  },

  clearCart: (modeOpt) => {
    if (modeOpt) {
      if (modeOpt === 'mart') {
        set({ martCart: [] });
        AsyncStorage.removeItem(CART_KEYS.mart).catch(() => {});
      } else if (modeOpt === 'food') {
        set({ foodCart: [] });
        AsyncStorage.removeItem(CART_KEYS.food).catch(() => {});
      } else if (modeOpt === 'pharma') {
        set({ pharmaCart: [] });
        AsyncStorage.removeItem(CART_KEYS.pharma).catch(() => {});
      }
    } else {
      set({ martCart: [], foodCart: [], pharmaCart: [], activeOrdersCount: 0 });
      Promise.all([
        AsyncStorage.removeItem(CART_KEYS.mart),
        AsyncStorage.removeItem(CART_KEYS.food),
        AsyncStorage.removeItem(CART_KEYS.pharma),
      ]).catch(() => {});
    }
  },

  getCartTotal: (modeOpt) => {
    const { activeMode, martCart, foodCart, pharmaCart } = get();
    const mode = modeOpt || activeMode;
    if (mode === 'pharma') return pharmaCart.reduce((t, i) => t + i.sellingPrice * i.quantity, 0);
    const cart = mode === 'mart' ? martCart : foodCart;
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getCartCount: (modeOpt) => {
    const { activeMode, martCart, foodCart, pharmaCart } = get();
    const mode = modeOpt || activeMode;
    if (mode === 'pharma') return pharmaCart.reduce((c, i) => c + i.quantity, 0);
    const cart = mode === 'mart' ? martCart : foodCart;
    return cart.reduce((count, item) => count + item.quantity, 0);
  },

  getItemCount: (productId, modeOpt) => {
    const { activeMode, martCart, foodCart, pharmaCart } = get();
    const mode = modeOpt || activeMode;
    if (mode === 'pharma') {
      const item = pharmaCart.find((i) => i.id === productId);
      return item ? item.quantity : 0;
    }
    const cart = mode === 'mart' ? martCart : foodCart;
    const item = cart.find((i) => i.id === productId);
    return item ? item.quantity : 0;
  },

  getCurrentCart: () => {
    const { activeMode, martCart, foodCart, pharmaCart } = get();
    if (activeMode === 'pharma') return pharmaCart;
    return activeMode === 'mart' ? martCart : foodCart;
  },
  getCurrentTotal: () => get().getCartTotal(),
  getCurrentCount: () => get().getCartCount(),

  // ── Pharma Cart ──────────────────────────────────────────────
  addToPharmaCart: (medicine) => {
    const { pharmaCart } = get();
    const existing = pharmaCart.find((i) => i.id === medicine.id);
    let next: PharmaCartItem[];
    if (existing) {
      next = pharmaCart.map((i) => (i.id === medicine.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      next = [...pharmaCart, { ...medicine, quantity: 1 }];
    }
    set({ pharmaCart: next });
    savePharmaCart(next);
  },

  removeFromPharmaCart: (medicineId) => {
    const next = get().pharmaCart.filter((i) => i.id !== medicineId);
    set({ pharmaCart: next });
    savePharmaCart(next);
  },

  updatePharmaQuantity: (medicineId, quantity) => {
    if (quantity < 1) {
      get().removeFromPharmaCart(medicineId);
      return;
    }
    const { pharmaCart } = get();
    const item = pharmaCart.find(i => i.id === medicineId);
    if (item && item.maxQuantityPerOrder && item.maxQuantityPerOrder > 0 && quantity > item.maxQuantityPerOrder) {
      Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${item.maxQuantityPerOrder} units for ${item.name}.`);
      return;
    }
    const next = pharmaCart.map((i) => (i.id === medicineId ? { ...i, quantity } : i));
    set({ pharmaCart: next });
    savePharmaCart(next);
  },

  clearPharmaCart: () => {
    set({ pharmaCart: [] });
    AsyncStorage.removeItem(CART_KEYS.pharma).catch(() => {});
  },

  getPharmaCartTotal: () => get().pharmaCart.reduce((t, i) => t + i.sellingPrice * i.quantity, 0),

  getPharmaCartCount: () => get().pharmaCart.reduce((c, i) => c + i.quantity, 0),

  hasPharmaRxItems: () => get().pharmaCart.some((i) => i.requiresPrescription),
}));

// Subscribe to Auth changes to clear all carts on logout
useAuthStore.subscribe((state, prevState) => {
  if (prevState.userToken && !state.userToken) {
    const store = useCartStore.getState();
    store.clearCart();
    store.clearPharmaCart();
  }
});
