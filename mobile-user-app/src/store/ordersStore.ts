import { create } from 'zustand';
import { ordersApi, labApi, pharmaApi, telemedicineApi } from '../api/api';

interface CacheEntry {
  orders: any[];
  page: number;
  totalPages: number;
  lastFetched: number;
}

interface OrdersState {
  orders: any[];
  consultations: any[];
  labBookings: any[];
  loading: boolean;
  loadingMore: boolean;
  ordersPage: number;
  ordersTotalPages: number;
  
  moduleCache: {
    [key: string]: CacheEntry;
  };
  
  fetchOrders: (force?: boolean, page?: number, moduleType?: string) => Promise<void>;
  fetchConsultations: (force?: boolean) => Promise<void>;
  fetchLabBookings: (force?: boolean) => Promise<void>;
  refreshAll: () => Promise<void>;
  updateOrderStatusLocally: (orderId: string, status: string) => void;
}

const CACHE_TIME = 60000; // 1 minute cache

export const useOrdersStore = create<OrdersState>((set, get) => ({
  orders: [],
  consultations: [],
  labBookings: [],
  loading: false,
  loadingMore: false,
  ordersPage: 1,
  ordersTotalPages: 1,
  
  moduleCache: {
    mart_food: { orders: [], page: 0, totalPages: 1, lastFetched: 0 },
    pharma: { orders: [], page: 0, totalPages: 1, lastFetched: 0 },
    rashan: { orders: [], page: 0, totalPages: 1, lastFetched: 0 },
  },

  fetchOrders: async (force = false, page = 1, moduleType = 'mart_food') => {
    const now = Date.now();
    const cache = get().moduleCache[moduleType] || { orders: [], page: 0, totalPages: 1, lastFetched: 0 };
    
    // If not forcing, on page 1, within CACHE_TIME, and have cached items: load from cache
    if (!force && page === 1 && now - cache.lastFetched < CACHE_TIME && cache.orders.length > 0) {
      set({
        orders: cache.orders,
        ordersPage: cache.page,
        ordersTotalPages: cache.totalPages
      });
      return;
    }
    
    if (page === 1) set({ loading: true });
    else set({ loadingMore: true });

    try {
      const res = await ordersApi.getHistory(page, 20, moduleType);
      const data = res.data || {};
      const rawArr = Array.isArray(data) ? data : (data.data || []);
      const arr = Array.from(new Map(rawArr.map((o: any) => [o.id, o])).values());
      const totalPages = data.totalPages || (data.total ? Math.ceil(data.total / (data.limit || 20)) : 1);

      let nextOrders = [];
      if (page === 1) {
        nextOrders = arr;
      } else {
        const existingIds = new Set(cache.orders.map(o => o.id));
        const newItems = arr.filter((o: any) => !existingIds.has(o.id));
        nextOrders = [...cache.orders, ...newItems];
      }

      set((state) => ({
        orders: nextOrders,
        ordersPage: page,
        ordersTotalPages: totalPages,
        moduleCache: {
          ...state.moduleCache,
          [moduleType]: {
            orders: nextOrders,
            page: page,
            totalPages: totalPages,
            lastFetched: page === 1 ? now : cache.lastFetched
          }
        }
      }));
    } catch (e) {
      console.warn('[OrdersStore] fetchOrders error:', e);
    } finally {
      set({ loading: false, loadingMore: false });
    }
  },

  fetchConsultations: async (force = false) => {
    set({ loading: true });
    try {
      const res = await telemedicineApi.getMyConsultations();
      set({ consultations: res.data || [] });
    } catch (e) {
      console.warn('[OrdersStore] fetchConsultations error:', e);
    } finally {
      set({ loading: false });
    }
  },

  fetchLabBookings: async (force = false) => {
    set({ loading: true });
    try {
      const res = await labApi.getMyBookings();
      set({ labBookings: res.data || [] });
    } catch (e) {
      console.warn('[OrdersStore] fetchLabBookings error:', e);
    } finally {
      set({ loading: false });
    }
  },

  refreshAll: async () => {
    set({ loading: true });
    // Reset cache timestamps
    set({
      moduleCache: {
        mart_food: { orders: [], page: 0, totalPages: 1, lastFetched: 0 },
        pharma: { orders: [], page: 0, totalPages: 1, lastFetched: 0 },
        rashan: { orders: [], page: 0, totalPages: 1, lastFetched: 0 },
      }
    });
    await Promise.allSettled([
      get().fetchOrders(true, 1, 'mart_food'),
      get().fetchConsultations(true),
      get().fetchLabBookings(true),
    ]);
    set({ loading: false });
  },

  updateOrderStatusLocally: (orderId: string, status: string) => {
    set((state) => {
      const updatedOrders = state.orders.map((o) => o.id === orderId ? { ...o, status } : o);
      // Also update in module caches
      const nextCache = { ...state.moduleCache };
      for (const key in nextCache) {
        if (nextCache[key].orders.some(o => o.id === orderId)) {
          nextCache[key] = {
            ...nextCache[key],
            orders: nextCache[key].orders.map((o) => o.id === orderId ? { ...o, status } : o)
          };
        }
      }
      return {
        orders: updatedOrders,
        moduleCache: nextCache
      };
    });
  },
}));
