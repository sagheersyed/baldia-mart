import axios from 'axios';

// For Android Emulator, use 10.0.2.2. For iOS/Local, use localhost.
// Replace with your local machine's IP (e.g., 192.168.1.10) for physical devices.
const BASE_URL = 'http://10.0.2.2:3000/api/v1';

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
  login: (firebaseToken: string) => api.post('/auth/login', {}, {
    headers: { Authorization: `Bearer ${firebaseToken}` }
  }),
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
  updateStatus: (orderId: string, status: string) => api.put(`/orders/${orderId}/status`, { status }),
};
