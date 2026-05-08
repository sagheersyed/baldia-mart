import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import { ENV } from '../config/env';

export const socket = io(ENV.SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 2000,
  reconnectionDelayMax: 10000,
  timeout: 10000,
  extraHeaders: {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36'
  }
});

// Debug socket lifecycle
socket.on('connect_error', (err) => {
  console.warn('[Socket] ❌ connect_error:', err.message, '| URL:', ENV.SOCKET_URL);
});
socket.on('disconnect', (reason) => {
  console.warn('[Socket] Disconnected:', reason);
});

export const connectSocket = () => {
  if (!socket.connected) {
    console.log('[Socket] Connecting to', ENV.SOCKET_URL);
    socket.connect();
  }
};

/**
 * Normalizes image and file URLs.
 * Replaces localhost with the correct IP and handles relative paths.
 */
export const normalizeUrl = (url: string | null | undefined): string | null => {
  if (!url) return null;
  const serverBase = ENV.SOCKET_URL;
  if (url.startsWith('http')) {
    return url.replace('http://localhost', serverBase).replace('https://localhost', serverBase);
  }
  if (url.startsWith('/')) {
    return `${serverBase}${url}`;
  }
  return url;
};

export const normalizePhone = (phone: string): string => {
  if (!phone) return phone;
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '+92' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('+')) {
    if (cleaned.length === 10) cleaned = '+92' + cleaned;
    else cleaned = '+' + cleaned;
  }
  return cleaned;
};

const api = axios.create({
  baseURL: ENV.BASE_URL,
  timeout: 15000,
  headers: {
    'ngrok-skip-browser-warning': 'true',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// ── Global 401 interceptor — auto sign-out on token expiry ──
let _signOutCallback: (() => void) | null = null;
export const registerSignOutCallback = (cb: () => void) => { _signOutCallback = cb; };

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401 && _signOutCallback) {
      _signOutCallback();
    }
    return Promise.reject(err);
  }
);

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    socket.auth = { token: `Bearer ${token}` };
    AsyncStorage.setItem('userToken', token);
    // Ensure future handshakes include auth; reconnect only if already connected.
    if (socket.connected) socket.disconnect();
    connectSocket();
  } else {
    delete api.defaults.headers.common['Authorization'];
    socket.auth = {};
    if (socket.connected) socket.disconnect();
    AsyncStorage.removeItem('userToken');
    connectSocket(); // Reconnect to continue receiving public events
  }
};

export const authApi = {
  getConfig: () => api.get('/auth/config'),
  checkStatus: (phoneNumber: string, role: string) => api.post('/auth/check-status', { phoneNumber: normalizePhone(phoneNumber), role }),
  setupMpin: (mpin: string) => api.post('/auth/setup-mpin', { mpin }),
  loginMpin: (phoneNumber: string, mpin: string) => api.post('/auth/login-mpin', { phoneNumber: normalizePhone(phoneNumber), mpin }),
  registerMpin: (phoneNumber: string, mpin: string) => api.post('/auth/register-mpin', { phoneNumber: normalizePhone(phoneNumber), mpin }),
  login: (firebaseToken: string) =>
    api.post('/auth/login', {}, { headers: { Authorization: `Bearer ${firebaseToken}` } }),
  getMe: () => api.get('/auth/me'),
  sendOtp: (phoneNumber: string) => api.post('/auth/send-otp', { phoneNumber: normalizePhone(phoneNumber) }),
  verifyOtp: (phoneNumber: string, otpCode: string) =>
    api.post('/auth/verify-otp', { phoneNumber: normalizePhone(phoneNumber), otpCode }),
};

export const usersApi = {
  updateMe: (data: { name?: string; phoneNumber?: string; email?: string; fcmToken?: string }) => api.patch('/users/me', data),
};

export const addressesApi = {
  getAll: () => api.get('/addresses'),
  create: (data: any) => api.post('/addresses', data),
  delete: (id: string) => api.delete(`/addresses/${id}`),
  update: (id: string, data: any) => api.patch(`/addresses/${id}`, data),
  setDefault: (id: string) => api.patch(`/addresses/${id}/default`),
};

export const categoriesApi = {
  getAll: (section?: string) => api.get(`/categories${section ? `?section=${section}` : ''}`),
};

export const brandsApi = {
  getAll: (section?: string) => api.get(`/brands${section ? `?section=${section}` : ''}`),
  getById: (id: string) => api.get(`/brands/${id}`),
  search: (q: string, section?: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (section) params.set('section', section);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return api.get(`/brands/search?${params.toString()}`);
  },
};

export type ProductSort =
  | 'newest'
  | 'price_asc'
  | 'price_desc'
  | 'popular'
  | 'discount'
  | 'rating';

export interface ProductListParams {
  page?: number;
  limit?: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  featured?: boolean;
  bestSeller?: boolean;
  deal?: boolean;
}

export interface PaginatedProducts {
  data: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const buildProductQuery = (params: ProductListParams = {}): string => {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.categoryId) qs.set('categoryId', params.categoryId);
  if (params.brandId) qs.set('brandId', params.brandId);
  if (params.sort) qs.set('sort', params.sort);
  if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice));
  if (params.inStock) qs.set('inStock', 'true');
  if (params.featured) qs.set('featured', 'true');
  if (params.bestSeller) qs.set('bestSeller', 'true');
  if (params.deal) qs.set('deal', 'true');
  const str = qs.toString();
  return str ? `?${str}` : '';
};

export const productsApi = {
  // Backwards-compatible legacy list (returns array OR paginated shape)
  getAll: async (page?: number, limit?: number) => {
    const qs = page && limit ? `?page=${page}&limit=${limit}` : '';
    const res = await api.get(`/products${qs}`);
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.data) res.data = res.data.data;
    return res;
  },
  getByCategory: async (catId: string, page?: number, limit?: number) => {
    const qs = page && limit ? `?page=${page}&limit=${limit}` : '';
    const res = await api.get(`/products/category/${catId}${qs}`);
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.data) res.data = res.data.data;
    return res;
  },
  getByBrand: async (brandId: string, page?: number, limit?: number) => {
    const qs = page && limit ? `?page=${page}&limit=${limit}` : '';
    const res = await api.get(`/products/brand/${brandId}${qs}`);
    if (res.data && typeof res.data === 'object' && !Array.isArray(res.data) && res.data.data) res.data = res.data.data;
    return res;
  },

  // ── New universal listing (always paginated shape) ──
  list: (params: ProductListParams = {}) =>
    api.get<PaginatedProducts>(`/products${buildProductQuery(params)}`),

  search: (q: string, page = 1, limit = 20) =>
    api.get<PaginatedProducts>(`/products/search?q=${encodeURIComponent(q)}&page=${page}&limit=${limit}`),

  getFeatured: (page = 1, limit = 20) =>
    api.get<PaginatedProducts>(`/products/featured?page=${page}&limit=${limit}`),

  getBestSellers: (page = 1, limit = 20) =>
    api.get<PaginatedProducts>(`/products/best-sellers?page=${page}&limit=${limit}`),

  getDeals: (page = 1, limit = 20) =>
    api.get<PaginatedProducts>(`/products/deals?page=${page}&limit=${limit}`),

  getNewest: (page = 1, limit = 20) =>
    api.get<PaginatedProducts>(`/products/newest?page=${page}&limit=${limit}`),
};

// ── Single optimized Home Screen payload ──
export interface HomeViewAllDescriptor {
  type: 'deals' | 'flash-sale' | 'best_sellers' | 'featured' | 'newest' | 'budget' | 'category';
  id?: string;
  maxPrice?: number;
}

export interface HomeSectionPayload {
  id: string;
  title: string;
  subtitle?: string;
  type: HomeViewAllDescriptor['type'];
  layout: 'horizontal' | 'grid-2' | 'grid-3';
  viewAll?: HomeViewAllDescriptor;
  categoryId?: string;
  products: any[];
}

export interface HomePayload {
  section: 'mart' | 'food';
  zoneId: string | null;
  generatedAt: string;
  banners: any[];
  categories: any[];
  brands: any[];
  rashanEnabled: boolean;
  trending: string[];
  sections: HomeSectionPayload[];
}

export const homeApi = {
  getHome: (section: 'mart' | 'food' = 'mart', zoneId?: string) =>
    api.get<HomePayload>(`/home?section=${section}${zoneId ? `&zoneId=${zoneId}` : ''}`),
};

export const ordersApi = {
  checkout: (data: any) => api.post('/orders/checkout', data),
  getHistory: (page: number = 1, limit: number = 20) => api.get(`/orders/history?page=${page}&limit=${limit}&_t=${Date.now()}`),
  getById: (orderId: string) => api.get(`/orders/${orderId}`),
  updateStatus: (orderId: string, status: string) =>
    api.put(`/orders/${orderId}/status`, { status }),
  cancelOrder: (orderId: string) => api.post(`/orders/${orderId}/cancel`),
  reorderOrder: (orderId: string) => api.post(`/orders/${orderId}/reorder`),
  removeItem: (orderId: string, itemId: string) => api.delete(`/orders/${orderId}/items/${itemId}`),
  updateQuantity: (orderId: string, itemId: string, quantity: number) =>
    api.patch(`/orders/${orderId}/items/${itemId}`, { quantity }),
  addItem: (orderId: string, productId: string, quantity: number) =>
    api.post(`/orders/${orderId}/items`, { productId, quantity }),
  updateOrderItems: (orderId: string, items: { itemId: string; quantity: number }[]) =>
    api.patch(`/orders/${orderId}/items`, { items }),
  getTimeline: (orderId: string) => api.get(`/orders/${orderId}/timeline`),
  getDeliveryFee: (addressId: string, restaurantId?: string) =>
    api.get(`/orders/preview-fee/${addressId}${restaurantId ? `?restaurantId=${restaurantId}` : ''}`),
  getChatHistory: (orderId: string) => api.get(`/orders/${orderId}/chat`),
};

export const paymentsApi = {
  initiate: (data: { orderId: string; provider: string; amount: number; mobileNumber?: string }) =>
    api.post('/payments/initiate', data),
  getStatus: (paymentId: string) => api.get(`/payments/status/${paymentId}`),
  getByOrder: (orderId: string) => api.get(`/payments/order/${orderId}`),
};

export const settingsApi = {
  getPublicSettings: () => api.get(`/settings/public?_t=${Date.now()}`),
};

export const rashanApi = {
  submitRequest: (data: any) => api.post('/orders/rashan', data),
  getMyOrders: () => api.get('/orders/rashan/my'),
  getById: (id: string) => api.get(`/orders/rashan/${id}`),
  approveQuotation: (id: string) => api.patch(`/orders/rashan/${id}/approve`),
  cancelRequest: (id: string) => api.patch(`/orders/rashan/${id}/cancel`),
  previewFee: (data: { weightTier: string; floor: number; placement: string }) =>
    api.post('/orders/rashan/fee-preview', data),
};


export const ridersApi = {
  getMe: () => api.get('/riders/me'),
  postReview: (riderId: string, data: { rating: number; comment?: string; orderId: string }) =>
    api.post(`/riders/${riderId}/reviews`, data),
};

export const bannersApi = {
  getBySection: (section: 'mart' | 'food' | 'all', zoneId?: string) =>
    api.get(`/banners?section=${section}${zoneId ? `&zoneId=${zoneId}` : ''}`),
};

export const restaurantsApi = {
  getAll: () => api.get('/restaurants'),
  getById: (id: string) => api.get(`/restaurants/${id}`),
  search: (q: string, page = 1, limit = 20) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    params.set('page', String(page));
    params.set('limit', String(limit));
    return api.get(`/restaurants/search?${params.toString()}`);
  },
};

export const menuItemsApi = {
  getAll: () => api.get('/menu-items'),
  getByRestaurant: (restaurantId: string) => api.get(`/menu-items?restaurantId=${restaurantId}`),
};

export const businessReviewsApi = {
  create: (data: {
    orderId: string;
    subOrderId?: string;
    businessId: string;
    businessType: 'restaurant' | 'brand';
    rating: number;
    comment?: string;
  }) => api.post('/business-reviews', data),
  getAll: () => api.get('/business-reviews/all'),
};

export const deliveryZonesApi = {
  getActive: () => api.get('/delivery-zones/active'),
};

export const favoritesApi = {
  getAll: () => api.get('/favorites'),
  toggle: (type: 'product' | 'restaurant' | 'brand', targetId: string) => api.post('/favorites/toggle', { type, targetId }),
  sync: (items: { type: 'product' | 'restaurant' | 'brand', targetId: string }[]) => api.post('/favorites/sync', { items }),
};
