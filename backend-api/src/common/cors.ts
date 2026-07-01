const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://5faf-125-209-125-98.ngrok-free.app',
  'http://192.168.0.240:3001',
];

function normalizeOrigin(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

export function getAllowedOrigins(): string[] {
  const raw = process.env.ALLOWED_ORIGINS;
  if (!raw?.trim()) return DEFAULT_ORIGINS;
  return raw
    .split(',')
    .map(normalizeOrigin)
    .filter(Boolean);
}

export function isOriginAllowed(origin?: string): boolean {
  if (!origin || origin === 'null') return true;
  const normalized = normalizeOrigin(origin);
  const allowed = getAllowedOrigins().includes(normalized);
  if (!allowed) {
    console.warn(`[CORS] Denied origin: ${origin}`);
  }
  return allowed;
}

