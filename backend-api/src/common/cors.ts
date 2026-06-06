const DEFAULT_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  ' https://35d8-175-107-236-228.ngrok-free.app',
  'http://192.168.100.142:3001',
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
  if (!origin) return true;
  const normalized = normalizeOrigin(origin);
  return getAllowedOrigins().includes(normalized);
}

