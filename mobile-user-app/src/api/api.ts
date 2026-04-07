import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

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
    AsyncStorage.setItem('userToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    AsyncStorage.removeItem('userToken');
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
};

export const productsApi = {
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
};

export const settingsApi = {
  getPublicSettings: () => api.get('/settings/public'),
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
  toggle: (type: 'product' | 'restaurant', targetId: string) => api.post('/favorites/toggle', { type, targetId }),
  sync: (items: { type: 'product' | 'restaurant', targetId: string }[]) => api.post('/favorites/sync', { items }),
};
