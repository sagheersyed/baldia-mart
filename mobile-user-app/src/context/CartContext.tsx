import React, { createContext, useState, useContext, ReactNode } from 'react';
import { Alert } from 'react-native';

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

interface CartContext {
  martCart: CartItem[];
  foodCart: CartItem[];
  currentCart: CartItem[];
  addToCart: (product: any, mode?: 'mart' | 'food') => void;
  removeFromCart: (productId: string, mode?: 'mart' | 'food') => void;
  updateQuantity: (productId: string, quantity: number, mode?: 'mart' | 'food') => void;
  clearCart: (mode?: 'mart' | 'food') => void;
  getCartTotal: (mode?: 'mart' | 'food') => number;
  getCartCount: (mode?: 'mart' | 'food') => number;
  currentTotal: number;
  currentCount: number;
  activeMode: 'mart' | 'food';
  setActiveMode: (mode: 'mart' | 'food') => void;
}

const CartContext = createContext<CartContext | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [martCart, setMartCart] = useState<CartItem[]>([]);
  const [foodCart, setFoodCart] = useState<CartItem[]>([]);
  const [activeMode, setActiveMode] = useState<'mart' | 'food'>('mart');

  const currentCart = activeMode === 'mart' ? martCart : foodCart;

  const addToCart = (product: any, mode: 'mart' | 'food' = activeMode) => {
    console.log(`[Cart] Adding item: ${product.name} (ID: ${product.id}) | Mode: ${mode} | Limit: ${product.maxQuantityPerOrder}`);
    const effectivePrice = Number(product.price) - Number(product.discount || 0);
    const setter = mode === 'mart' ? setMartCart : setFoodCart;
    const limit = Number(product.maxQuantityPerOrder) || 0;
    
    setter(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        console.log(`[Cart] Item exists. Current Qty: ${existingItem.quantity} | Limit: ${limit}`);
        if (limit > 0 && existingItem.quantity >= limit) {
          Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${limit} units for ${product.name}.`);
          return prevCart;
        }
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      console.log(`[Cart] New item added to cart.`);
      return [...prevCart, { 
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
    });
  };

  const removeFromCart = (productId: string, mode: 'mart' | 'food' = activeMode) => {
    const setter = mode === 'mart' ? setMartCart : setFoodCart;
    setter(prevCart => prevCart.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId: string, quantity: number, mode: 'mart' | 'food' = activeMode) => {
    if (quantity <= 0) {
      removeFromCart(productId, mode);
      return;
    }
    const setter = mode === 'mart' ? setMartCart : setFoodCart;
    setter(prevCart => {
      const item = prevCart.find(i => i.id === productId);
      if (item && item.maxQuantityPerOrder > 0 && quantity > item.maxQuantityPerOrder) {
        Alert.alert('Limit Reached ✋', `Maximum allowed per order is ${item.maxQuantityPerOrder} units.`);
        return prevCart;
      }
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  };

  const clearCart = (mode: 'mart' | 'food' = activeMode) => {
    const setter = mode === 'mart' ? setMartCart : setFoodCart;
    setter([]);
  };

  const getCartTotal = (mode: 'mart' | 'food' = activeMode) => {
    const cart = mode === 'mart' ? martCart : foodCart;
    return cart.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const getCartCount = (mode: 'mart' | 'food' = activeMode) => {
    const cart = mode === 'mart' ? martCart : foodCart;
    return cart.reduce((count, item) => count + item.quantity, 0);
  };

  const currentTotal = getCartTotal(activeMode);
  const currentCount = getCartCount(activeMode);

  return (
    <CartContext.Provider value={{ 
      martCart, foodCart, currentCart, addToCart, removeFromCart, updateQuantity, clearCart, 
      getCartTotal, getCartCount, currentTotal, currentCount,
      activeMode, setActiveMode
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
