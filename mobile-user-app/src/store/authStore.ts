import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setAuthToken, authApi, registerSignOutCallback } from '../api/api';

interface AuthState {
  userToken: string | null;
  userData: any | null;
  isLoading: boolean;
  loadStorageData: () => Promise<void>;
  signIn: (token: string, user?: any) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserData: (data: any) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userToken: null,
  userData: null,
  isLoading: true,

  loadStorageData: async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const savedUser = await AsyncStorage.getItem('userData');

      if (token) {
        setAuthToken(token);
        set({ userToken: token });
        if (savedUser) {
          set({ userData: JSON.parse(savedUser) });
        }

        // Background verify
        try {
          const res = await authApi.getMe();
          set({ userData: res.data });
          await AsyncStorage.setItem('userData', JSON.stringify(res.data));
        } catch (e: any) {
          console.log('Background auth verify failed:', e);
          if (e.response?.status === 401) {
            await get().signOut();
          }
        }
      }
    } catch (e) {
      console.error('Failed to load auth data', e);
    } finally {
      set({ isLoading: false });
    }
  },

  signIn: async (token: string, user?: any) => {
    try {
      setAuthToken(token);
      set({ userToken: token });
      await AsyncStorage.setItem('userToken', token);

      if (user) {
        set({ userData: user });
        await AsyncStorage.setItem('userData', JSON.stringify(user));
      } else {
        const res = await authApi.getMe();
        set({ userData: res.data });
        await AsyncStorage.setItem('userData', JSON.stringify(res.data));
      }
    } catch (e) {
      console.error('SignIn error', e);
    }
  },

  signOut: async () => {
    try {
      setAuthToken(null);
      set({ userToken: null, userData: null });
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
      
      // Clear persistent favorites
      await Promise.all([
        AsyncStorage.removeItem('@fav_restaurants'),
        AsyncStorage.removeItem('@fav_products'),
      ]);
    } catch (e) {
      console.error('SignOut error', e);
    }
  },

  updateUserData: (data: any) => {
    set({ userData: data });
    AsyncStorage.setItem('userData', JSON.stringify(data));
  }
}));

// Global signout interceptor
registerSignOutCallback(() => useAuthStore.getState().signOut());
