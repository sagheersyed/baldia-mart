import { useCartStore } from '../store/cartStore';

export const useCart = () => {
  const store = useCartStore();
  return {
    ...store,
    currentCart: store.getCurrentCart(),
    currentTotal: store.getCurrentTotal(),
    currentCount: store.getCurrentCount(),
  };
};
