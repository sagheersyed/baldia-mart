import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cmsApi } from '../api/api';

export interface TenantMembership {
  tenantId: string;
  name: string;
  type: 'grocery' | 'restaurant' | 'pharmacy' | string;
  status: string;
  role: 'owner' | 'manager' | 'staff' | 'pharmacist' | 'assistant_pharmacist';
  logoUrl?: string | null;
}

interface CmsState {
  memberships: TenantMembership[];
  activeTenantId: string | null;
  activeTenant: TenantMembership | null;
  isMerchantMode: boolean;
  isLoadingMemberships: boolean;
  cmsAuthenticatedTenantId: string | null;
  cmsAuthenticatedAt: number | null;

  loadMemberships: () => Promise<void>;
  setActiveTenant: (tenantId: string) => void;
  enterMerchantMode: (tenantId: string) => void;
  exitMerchantMode: () => void;
  reset: () => void;
  isCmsSessionValid: (tenantId: string) => boolean;
  setCmsAuthenticated: (tenantId: string) => void;
  clearCmsAuthentication: () => void;
}

export const useCmsStore = create<CmsState>((set, get) => ({
  memberships: [],
  activeTenantId: null,
  activeTenant: null,
  isMerchantMode: false,
  isLoadingMemberships: false,
  cmsAuthenticatedTenantId: null,
  cmsAuthenticatedAt: null,

  loadMemberships: async () => {
    set({ isLoadingMemberships: true });
    try {
      const res = await cmsApi.getMyMemberships();
      const memberships: TenantMembership[] = res.data ?? [];
      set({ memberships });

      // Restore last active tenant if still valid
      const saved = await AsyncStorage.getItem('@cms_active_tenant');
      if (saved && memberships.find(m => m.tenantId === saved)) {
        set({
          activeTenantId: saved,
          activeTenant: memberships.find(m => m.tenantId === saved) ?? null,
        });
      } else if (memberships.length === 1) {
        // Auto-select if only one store
        set({
          activeTenantId: memberships[0].tenantId,
          activeTenant: memberships[0],
        });
      }
    } catch (e) {
      console.warn('[cmsStore] Failed to load memberships:', e);
    } finally {
      set({ isLoadingMemberships: false });
    }
  },

  setActiveTenant: (tenantId: string) => {
    const tenant = get().memberships.find(m => m.tenantId === tenantId) ?? null;
    set({ activeTenantId: tenantId, activeTenant: tenant });
    AsyncStorage.setItem('@cms_active_tenant', tenantId);
  },

  enterMerchantMode: (tenantId: string) => {
    const tenant = get().memberships.find(m => m.tenantId === tenantId) ?? null;
    set({ isMerchantMode: true, activeTenantId: tenantId, activeTenant: tenant });
    AsyncStorage.setItem('@cms_active_tenant', tenantId);
  },

  exitMerchantMode: () => {
    set({ isMerchantMode: false });
  },

  isCmsSessionValid: (tenantId: string) => {
    const { cmsAuthenticatedTenantId, cmsAuthenticatedAt } = get();
    if (cmsAuthenticatedTenantId !== tenantId || !cmsAuthenticatedAt) return false;
    const diffMs = Date.now() - cmsAuthenticatedAt;
    const fifteenMinutesMs = 15 * 60 * 1000;
    return diffMs < fifteenMinutesMs;
  },

  setCmsAuthenticated: (tenantId: string) => {
    set({
      cmsAuthenticatedTenantId: tenantId,
      cmsAuthenticatedAt: Date.now(),
    });
  },

  clearCmsAuthentication: () => {
    set({
      cmsAuthenticatedTenantId: null,
      cmsAuthenticatedAt: null,
    });
  },

  reset: () => {
    set({
      memberships: [],
      activeTenantId: null,
      activeTenant: null,
      isMerchantMode: false,
      cmsAuthenticatedTenantId: null,
      cmsAuthenticatedAt: null,
    });
    AsyncStorage.removeItem('@cms_active_tenant');
  },
}));
