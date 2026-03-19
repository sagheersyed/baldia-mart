import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const SOCKET_URL = 'http://192.168.100.142:3000'; // No /api/v1 suffix
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Replace with your local machine's IP
const BASE_URL = 'http://192.168.100.142:3000/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
});

export const setAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    AsyncStorage.setItem('riderToken', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    AsyncStorage.removeItem('riderToken');
  }
};

export const authApi = {
  getConfig: () => api.get('/auth/config'),
  checkStatus: (phoneNumber: string, role: string) => api.post('/auth/check-status', { phoneNumber, role }),
  setupMpin: (mpin: string) => api.post('/auth/rider/setup-mpin', { mpin }),
  loginMpin: (phoneNumber: string, mpin: string) => api.post('/auth/rider/login-mpin', { phoneNumber, mpin }),
  registerMpin: (phoneNumber: string, mpin: string) => api.post('/auth/rider/register-mpin', { phoneNumber, mpin }),
  sendOtp: (phoneNumber: string) => api.post('/auth/rider/send-otp', { phoneNumber }),
  verifyOtp: (phoneNumber: string, otpCode: string) =>
    api.post('/auth/rider/verify-otp', { phoneNumber, otpCode }),
  login: (firebaseToken: string) => api.post('/auth/login', { firebaseToken }),
  getMe: () => api.get('/auth/me'),
};

export const ordersApi = {
  getPending: () => api.get('/orders/pending'),
  getActive: () => api.get('/orders/active'),
  acceptOrder: (orderId: string) => api.post(`/orders/${orderId}/accept`),
  getById: (orderId: string) => api.get(`/orders/${orderId}`),
  updateStatus: (orderId: string, status: string) =>
    api.patch(`/orders/${orderId}/rider-status`, { status }),
  getHistory: () => api.get('/orders/history/rider'),
};

export const ridersApi = {
  getMe: () => api.get('/riders/me'),
  getStats: () => api.get('/riders/stats'),
  uploadFile: (formData: FormData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getEarnings: () => api.get('/riders/me/earnings'),
};

export const settingsApi = {
  getPublicSettings: () => api.get('/settings/public'),
};
