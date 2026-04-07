import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

const SOCKET_URL = 'https://00ad-175-107-236-228.ngrok-free.app'; // No /api/v1 suffix
export const socket = io(SOCKET_URL, {
  autoConnect: false,
  transports: ['websocket'],
});

// Replace with your local machine's IP
const BASE_URL = 'https://00ad-175-107-236-228.ngrok-free.app/api/v1';

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
  checkStatus: (phoneNumber: string, role: string) => api.post('/auth/check-status', { phoneNumber: normalizePhone(phoneNumber), role }),
  setupMpin: (mpin: string) => api.post('/auth/rider/setup-mpin', { mpin }),
  loginMpin: (phoneNumber: string, mpin: string) => api.post('/auth/rider/login-mpin', { phoneNumber: normalizePhone(phoneNumber), mpin }),
  registerMpin: (phoneNumber: string, mpin: string) => api.post('/auth/rider/register-mpin', { phoneNumber: normalizePhone(phoneNumber), mpin }),
  sendOtp: (phoneNumber: string) => api.post('/auth/rider/send-otp', { phoneNumber: normalizePhone(phoneNumber) }),
  verifyOtp: (phoneNumber: string, otpCode: string) =>
    api.post('/auth/rider/verify-otp', { phoneNumber: normalizePhone(phoneNumber), otpCode }),
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
  updateSubOrderStatus: (subOrderId: string, status: string) =>
    api.patch(`/orders/sub-orders/${subOrderId}/status`, { status }),
  getHistory: () => api.get('/orders/history/rider'),
};

export const ridersApi = {
  getMe: () => api.get('/riders/me'),
  getStats: () => api.get('/riders/stats'),
  updateProfile: (data: any) => api.patch('/riders/me', data),
  uploadFile: (formData: FormData) => api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getEarnings: () => api.get('/riders/me/earnings'),
};

export const settingsApi = {
  getPublicSettings: () => api.get('/settings/public'),
};
