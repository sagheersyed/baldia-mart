import { create } from 'zustand';
import { AppState, AppStateStatus } from 'react-native';
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
  rashan_base_fee: number;
  rashan_surcharge_medium: number;
  rashan_surcharge_heavy: number;
  rashan_floor_surcharge_low: number;
  rashan_floor_surcharge_high: number;
  rashan_placement_fee: number;
}

interface SettingsState {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  initSocketListeners: () => void;
}

// ─── Stable handler refs (module-level so socket.off() works) ─────────────────
async function _fetchAndApplySettings() {
  console.log('[SettingsStore] settings_updated — re-fetching from server...');
  try {
    const res = await settingsApi.getPublicSettings();
    useSettingsStore.setState({ settings: res.data });
    console.log('[SettingsStore] ✅ Settings live-updated');
  } catch (error) {
    console.error('[SettingsStore] ❌ Failed to refresh settings:', error);
  }
}

function _onSocketConnect() {
  console.log('[SettingsStore] Socket connected ✅ — listening for settings_updated');
  socket.off('settings_updated', _fetchAndApplySettings);
  socket.on('settings_updated', _fetchAndApplySettings);
}

let _initialized = false;
let _pollingInterval: ReturnType<typeof setInterval> | null = null;
// ─────────────────────────────────────────────────────────────────────────────

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

  /**
   * Initialize socket listeners AND polling fallback for settings.
   * Call ONCE from App.tsx.
   */
  initSocketListeners: () => {
    if (_initialized) return;
    _initialized = true;

    // ── 1. Socket-based real-time updates ─────────────────────────────────
    connectSocket();

    socket.off('connect', _onSocketConnect);
    socket.on('connect', _onSocketConnect);

    if (socket.connected) _onSocketConnect();

    // ── 2. AppState polling fallback ───────────────────────────────────────
    // When the user brings the app to foreground, always fetch fresh settings.
    // This guarantees settings are up-to-date even if socket was disconnected.
    AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        console.log('[SettingsStore] App foregrounded — refreshing settings');
        _fetchAndApplySettings();
      }
    });

    // ── 3. Background polling every 20s as final safety net ───────────────
    if (_pollingInterval) clearInterval(_pollingInterval);
    _pollingInterval = setInterval(() => {
      if (socket.connected) return; // socket is healthy, skip poll
      console.log('[SettingsStore] Socket offline — polling settings...');
      _fetchAndApplySettings();
    }, 20000);

    console.log('[SettingsStore] Initialized with socket + AppState + polling fallback');
  },
}));
