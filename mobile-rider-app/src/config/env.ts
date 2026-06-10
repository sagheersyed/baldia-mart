/**
 * Environment Configuration
 * Change the BASE_URL to point at your backend server.
 * For local dev with Expo on a physical device, use your machine's LAN IP.
 * For production, use your real domain.
 */

import Constants from 'expo-constants';

const DEFAULT_SERVER_BASE = ' https://b9f2-175-107-236-228.ngrok-free.app';
const extra: any = (Constants as any)?.expoConfig?.extra ?? (Constants as any)?.manifest?.extra ?? {};
const SERVER_BASE: string = (extra?.SERVER_BASE as string) || DEFAULT_SERVER_BASE;

export const ENV = {
  BASE_URL: `${SERVER_BASE}/api/v1`,
  SOCKET_URL: SERVER_BASE,
} as const;
