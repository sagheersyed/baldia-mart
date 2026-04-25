import { create } from 'zustand';
import { settingsApi, socket, connectSocket } from '../api/api';

interface Settings {
  delivery_base_fee: number;
  delivery_threshold_km: number;
  delivery_per_km_fee: number;
  delivery_max_radius_km: number;
  store_status: string;
  contact_phone: string;
  contact_email: string;
  social_facebook: string;
  social_instagram: string;
  feature_show_mart: boolean;
  feature_show_restaurants: boolean;
  feature_show_brands: boolean;
  feature_chat_enabled: boolean;
  feature_rashan_enabled: boolean;
  chat_enable_replies: boolean;
  chat_enable_images: boolean;
  auth_customer_mpin_enabled: boolean;
  auth_customer_otp_enabled: boolean;
  auth_customer_google_enabled: boolean;
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  initSocketListeners: () => void;
}

let socketInitialized = false;
let _settingsUpdatedHandler: (() => void) | null = null;

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: null,
  loading: true,

  refreshSettings: async () => {
    try {
      const res = await settingsApi.getPublicSettings();
      set({ settings: res.data });
    } catch (error) {
      console.error('[SettingsStore] Failed to fetch settings:', error);
    } finally {
      set({ loading: false });
    }
  },

  initSocketListeners: () => {
    if (socketInitialized) return;
    socketInitialized = true;
    
    connectSocket();

    _settingsUpdatedHandler = async () => {
      console.log('[SettingsStore] Received settings_updated, refreshing...');
      try {
        const res = await settingsApi.getPublicSettings();
        set({ settings: res.data });
      } catch (error) {
         console.error('[SettingsStore] Failed to fetch settings on socket event:', error);
      }
    };

    socket.off('settings_updated', _settingsUpdatedHandler as any);
    socket.on('settings_updated', _settingsUpdatedHandler as any);
  }
}));
