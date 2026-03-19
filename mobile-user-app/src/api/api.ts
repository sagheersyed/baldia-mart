import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// For Android Emulator, use 10.0.2.2. For iOS/Local, use localhost.
// Replace with your local machine's IP (e.g., 192.168.1.10) for physical devices.
const BASE_URL = 'http://192.168.100.142:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

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
  checkStatus: (phoneNumber: string, role: string) => api.post('/auth/check-status', { phoneNumber, role }),
  setupMpin: (mpin: string) => api.post('/auth/setup-mpin', { mpin }),
  loginMpin: (phoneNumber: string, mpin: string) => api.post('/auth/login-mpin', { phoneNumber, mpin }),
  registerMpin: (phoneNumber: string, mpin: string) => api.post('/auth/register-mpin', { phoneNumber, mpin }),
  login: (firebaseToken: string) =>
    api.post('/auth/login', {}, { headers: { Authorization: `Bearer ${firebaseToken}` } }),
  getMe: () => api.get('/auth/me'),
  sendOtp: (phoneNumber: string) => api.post('/auth/send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, otpCode: string) =>
    api.post('/auth/verify-otp', { phoneNumber, otpCode }),
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
  getAll: () => api.get('/categories'),
};

export const productsApi = {
  getAll: () => api.get('/products'),
  getByCategory: (catId: string) => api.get(`/products/category/${catId}`),
};

export const ordersApi = {
  checkout: (data: any) => api.post('/orders/checkout', data),
  getHistory: () => api.get('/orders/history'),
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
  getDeliveryFee: (addressId: string) => api.get(`/orders/preview-fee/${addressId}`),
};

export const settingsApi = {
  getPublicSettings: () => api.get('/settings/public'),
};

export const ridersApi = {
  getMe: () => api.get('/riders/me'),
  postReview: (riderId: string, data: { rating: number; comment?: string; orderId: string }) => 
    api.post(`/riders/${riderId}/reviews`, data),
};
