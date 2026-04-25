import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { settingsApi, socket } from '../api/api';

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

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSettings = async () => {
    try {
      const res = await settingsApi.getPublicSettings();
      setSettings(res.data);
    } catch (error) {
      console.error('[SettingsContext] Failed to fetch settings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshSettings();

    // Real-time synchronization
    const onSettingsUpdated = () => {
      console.log('[SettingsContext] Received settings_updated, refreshing...');
      refreshSettings();
    };
    socket.on('settings_updated', onSettingsUpdated);

    return () => {
      socket.off('settings_updated', onSettingsUpdated);
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
