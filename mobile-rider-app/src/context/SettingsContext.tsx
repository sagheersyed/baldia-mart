import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { settingsApi, socket, connectSocket } from '../api/api';

interface Settings {
  delivery_base_fee: number;
  delivery_threshold_km: number;
  delivery_per_km_fee: number;
  delivery_max_radius_km: number;
  store_status: string;
  contact_phone: string;
  contact_email: string;
  feature_show_mart: boolean;
  feature_show_restaurants: boolean;
  feature_chat_enabled: boolean;
  chat_enable_replies: boolean;
  chat_enable_images: boolean;
  auth_rider_mpin_enabled: boolean;
  auth_rider_otp_enabled: boolean;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

// ─── Stable handler refs ───────────────────────────────────────────────────
let _riderRefreshSettings: (() => Promise<void>) | null = null;

async function _onRiderSettingsUpdated() {
  console.log('[RiderSettings] settings_updated received — refreshing...');
  if (_riderRefreshSettings) await _riderRefreshSettings();
}

function _onRiderSocketConnect() {
  console.log('[RiderSettings] Socket connected — registering settings_updated listener');
  socket.off('settings_updated', _onRiderSettingsUpdated);
  socket.on('settings_updated', _onRiderSettingsUpdated);
}
// ───────────────────────────────────────────────────────────────────────────

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await settingsApi.getPublicSettings();
      setSettings(res.data);
    } catch (error) {
      console.error('[RiderSettings] Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Keep stable reference for the module-level handler
    _riderRefreshSettings = refreshSettings;
    return () => { _riderRefreshSettings = null; };
  }, []);

  useEffect(() => {
    refreshSettings();
    AsyncStorage.getItem('riderToken').then(token => {
      if (token) connectSocket();
    });

    // Register on connect (fires every time socket reconnects)
    socket.off('connect', _onRiderSocketConnect);
    socket.on('connect', _onRiderSocketConnect);

    // Register immediately if already connected
    if (socket.connected) {
      _onRiderSocketConnect();
    }

    return () => {
      socket.off('connect', _onRiderSocketConnect);
      socket.off('settings_updated', _onRiderSettingsUpdated);
    };
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
