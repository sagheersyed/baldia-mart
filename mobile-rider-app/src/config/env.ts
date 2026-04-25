/**
 * Environment Configuration
 * Change the BASE_URL to point at your backend server.
 * For local dev with Expo on a physical device, use your machine's LAN IP.
 * For production, use your real domain.
 */

// ── Change this single value when your tunnel/server changes ──
const SERVER_BASE = 'http://192.168.100.80:3000';

export const ENV = {
  BASE_URL: `${SERVER_BASE}/api/v1`,
  SOCKET_URL: SERVER_BASE,
} as const;
