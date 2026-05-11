import { create } from 'zustand';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';

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

    if (mode === 'pharma') {
      const existing = pharmaCart.find((i) => i.id === product.id);
      let next: PharmaCartItem[];
      if (existing) {
        next = pharmaCart.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      } else {
        // Map medicine properties to PharmaCartItem
        next = [
          ...pharmaCart,
          {
            id: product.id,
            name: product.name,
            mrp: Number(product.mrp),
            sellingPrice: Number(product.mrp) - Number(product.discount || 0),
            quantity: 1,
            imageUrl: product.imageUrl,
            requiresPrescription: !!product.requiresPrescription,
            dosageForm: product.dosageForm,
            strength: product.strength,
            packSize: product.packSize,
            categoryId: product.categoryId,
          },
        ];
      }
      set({ pharmaCart: next });
      savePharmaCart(next);
      return;
    }

    const effectivePrice = Number(product.price) - Number(product.discount || 0);
    const limit = Number(product.maxQuantityPerOrder) || 0;

    const prevCart = mode === 'mart' ? martCart : foodCart;
    const existingItem = prevCart.find((item) => item.id === product.id);

    let nextCart;
    if (existingItem) {
      if (limit > 0 && existingItem.quantity >= limit) {
        Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${limit} units for ${product.name}.`);
        return;
      }
      nextCart = prevCart.map((item) =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      nextCart = [
        ...prevCart,
        {
          id: product.id,
          name: product.name,
          price: effectivePrice,
          imageUrl: product.imageUrl,
          quantity: 1,
          restaurantId: product.restaurantId,
          restaurantName: product.restaurantName,
          prepTimeMinutes: product.prepTimeMinutes,
          maxQuantityPerOrder: product.maxQuantityPerOrder,
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
    const { pharmaCart, removeFromPharmaCart } = get();
    if (quantity <= 0) {
      removeFromPharmaCart(medicineId);
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
