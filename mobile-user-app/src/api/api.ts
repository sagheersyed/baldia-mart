import axios from 'axios';

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
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
};

export const authApi = {
  login: (firebaseToken: string) =>
    api.post('/auth/login', {}, { headers: { Authorization: `Bearer ${firebaseToken}` } }),
  getMe: () => api.get('/auth/me'),
  sendOtp: (phoneNumber: string) => api.post('/auth/send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, otpCode: string) =>
    api.post('/auth/verify-otp', { phoneNumber, otpCode }),
};

export const usersApi = {
  updateMe: (data: { name?: string; phoneNumber?: string; email?: string }) => api.patch('/users/me', data),
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
  updateStatus: (orderId: string, status: string) =>
    api.put(`/orders/${orderId}/status`, { status }),
};
