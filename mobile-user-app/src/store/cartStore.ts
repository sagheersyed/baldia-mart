import { create } from 'zustand';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from './authStore';

const CART_KEYS = {
  mart: '@cart_mart',
  food: '@cart_food',
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

interface CartState {
  martCart: CartItem[];
  foodCart: CartItem[];
  activeMode: 'mart' | 'food';
  activeOrdersCount: number;
  hydrated: boolean;

  rehydrate: () => Promise<void>;
  setActiveMode: (mode: 'mart' | 'food') => void;
  setActiveOrdersCount: (count: number) => void;
  
  addToCart: (product: any, mode?: 'mart' | 'food') => void;
  removeFromCart: (productId: string, mode?: 'mart' | 'food') => void;
  updateQuantity: (productId: string, quantity: number, mode?: 'mart' | 'food') => void;
  clearCart: (mode?: 'mart' | 'food') => void;
  
  getCartTotal: (mode?: 'mart' | 'food') => number;
  getCartCount: (mode?: 'mart' | 'food') => number;
  
  getCurrentCart: () => CartItem[];
  getCurrentTotal: () => number;
  getCurrentCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  martCart: [],
  foodCart: [],
  activeMode: 'mart',
  activeOrdersCount: 0,
  hydrated: false,

  rehydrate: async () => {
    try {
      const [martRaw, foodRaw] = await Promise.all([
        AsyncStorage.getItem(CART_KEYS.mart),
        AsyncStorage.getItem(CART_KEYS.food),
      ]);
      set({ 
        martCart: martRaw ? JSON.parse(martRaw) : [],
        foodCart: foodRaw ? JSON.parse(foodRaw) : [],
        hydrated: true 
      });
    } catch (e) {
      console.error('[Cart] Failed to rehydrate carts:', e);
      set({ hydrated: true });
    }
  },

  setActiveMode: (mode) => set({ activeMode: mode }),
  setActiveOrdersCount: (count) => set({ activeOrdersCount: count }),

  addToCart: (product, modeOpt) => {
    const { activeMode, martCart, foodCart } = get();
    const mode = modeOpt || activeMode;
    const effectivePrice = Number(product.price) - Number(product.discount || 0);
    const limit = Number(product.maxQuantityPerOrder) || 0;
    
    const prevCart = mode === 'mart' ? martCart : foodCart;
    const existingItem = prevCart.find(item => item.id === product.id);
    
    let nextCart;
    if (existingItem) {
      if (limit > 0 && existingItem.quantity >= limit) {
        Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${limit} units for ${product.name}.`);
        return;
      }
      nextCart = prevCart.map(item =>
        item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
    } else {
      nextCart = [...prevCart, {
        id: product.id,
        name: product.name,
        price: effectivePrice,
        imageUrl: product.imageUrl,
        quantity: 1,
        restaurantId: product.restaurantId,
        restaurantName: product.restaurantName,
        prepTimeMinutes: product.prepTimeMinutes,
        maxQuantityPerOrder: product.maxQuantityPerOrder
      }];
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
    const { activeMode, martCart, foodCart } = get();
    const mode = modeOpt || activeMode;
    const prevCart = mode === 'mart' ? martCart : foodCart;
    
    const nextCart = prevCart.filter(item => item.id !== productId);
    
    if (mode === 'mart') {
      set({ martCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.mart, JSON.stringify(nextCart)).catch(() => {});
    } else {
      set({ foodCart: nextCart });
      AsyncStorage.setItem(CART_KEYS.food, JSON.stringify(nextCart)).catch(() => {});
    }
  },

  updateQuantity: (productId, quantity, modeOpt) => {
    const { activeMode, martCart, foodCart, removeFromCart } = get();
    const mode = modeOpt || activeMode;
    
    if (quantity <= 0) {
      removeFromCart(productId, mode);
      return;
    }
    
    const prevCart = mode === 'mart' ? martCart : foodCart;
    const item = prevCart.find(i => i.id === productId);
    
    if (item && item.maxQuantityPerOrder > 0 && quantity > item.maxQuantityPerOrder) {
      Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${item.maxQuantityPerOrder} units.`);
      return;
    }
    
    const nextCart = prevCart.map(i =>
      i.id === productId ? { ...i, quantity } : i
    );
    
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
      } else {
        set({ foodCart: [] });
        AsyncStorage.removeItem(CART_KEYS.food).catch(() => {});
      }
    } else {
      set({ martCart: [], foodCart: [], activeOrdersCount: 0 });
      Promise.all([
        AsyncStorage.removeItem(CART_KEYS.mart),
        AsyncStorage.removeItem(CART_KEYS.food),
      ]).catch(() => {});
    }
  },

  getCartTotal: (modeOpt) => {
    const { activeMode, martCart, foodCart } = get();
    const cart = (modeOpt || activeMode) === 'mart' ? martCart : foodCart;
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  getCartCount: (modeOpt) => {
    const { activeMode, martCart, foodCart } = get();
    const cart = (modeOpt || activeMode) === 'mart' ? martCart : foodCart;
    return cart.reduce((count, item) => count + item.quantity, 0);
  },

  getCurrentCart: () => {
    const { activeMode, martCart, foodCart } = get();
    return activeMode === 'mart' ? martCart : foodCart;
  },
  
  getCurrentTotal: () => get().getCartTotal(get().activeMode),
  getCurrentCount: () => get().getCartCount(get().activeMode),
}));

// Subscribe to Auth changes to clear cart on logout
useAuthStore.subscribe((state, prevState) => {
  if (prevState.userToken && !state.userToken) {
    useCartStore.getState().clearCart();
  }
});
