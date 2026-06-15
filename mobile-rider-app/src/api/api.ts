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

socket.on('connect_error', (err) => {
  console.warn('[RiderSocket] ❌ connect_error:', err.message);
});
socket.on('disconnect', (reason) => {
  console.warn('[RiderSocket] Disconnected:', reason);
});

export const connectSocket = () => {
  if (!socket.connected) {
    console.log('[RiderSocket] Connecting to', ENV.SOCKET_URL);
    socket.connect();
  }
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

export const api = axios.create({
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
    AsyncStorage.setItem('riderToken', token);
    if (socket.connected) socket.disconnect();
    connectSocket();
  } else {
    delete api.defaults.headers.common['Authorization'];
    socket.auth = {};
    if (socket.connected) socket.disconnect();
    AsyncStorage.removeItem('riderToken');
    connectSocket(); // Reconnect to continue receiving public events
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
  updateStatus: (orderId: string, status: string, coldChainPhotoUrl?: string) =>
    api.patch(`/orders/${orderId}/rider-status`, { status, coldChainPhotoUrl }),
  updateSubOrderStatus: (subOrderId: string, status: string) =>
    api.patch(`/orders/sub-orders/${subOrderId}/status`, { status }),
  removeItem: (orderId: string, itemId: string, reason?: string) => 
    api.delete(`/orders/${orderId}/items/${itemId}`, { data: { reason } }),
  releaseOrder: (orderId: string, reason: string) => 
    api.post(`/orders/${orderId}/release`, { reason }),
  getHistory: () => api.get('/orders/history/rider'),
  getChatHistory: (orderId: string) => api.get(`/orders/${orderId}/chat`),
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
  getPublicSettings: () => api.get(`/settings/public?_t=${Date.now()}`),
};

export const walletsApi = {
  getMyWallet: () => api.get('/wallets/my-wallet'),
};

export const financeApi = {
  getRiderSummary: () => api.get('/finance/rider/summary'),
  getRiderStatement: () => api.get('/finance/rider/statement'),
};
