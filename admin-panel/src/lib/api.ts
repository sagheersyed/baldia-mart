export const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

const ADMIN_TOKEN_COOKIE = 'adminToken';

const readCookie = (name: string): string | null => {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  const pair = cookies.find((item) => item.startsWith(`${name}=`));
  if (!pair) return null;
  const value = pair.substring(name.length + 1);
  return value ? decodeURIComponent(value) : null;
};

export const getAdminToken = (): string | null => readCookie(ADMIN_TOKEN_COOKIE);

export const setAdminToken = (token: string) => {
  if (typeof document === 'undefined') return;
  const maxAge = 60 * 60 * 8; // 8 hours
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${maxAge}; SameSite=Strict${secure}`;
};

export const clearAdminSession = () => {
  if (typeof document !== 'undefined') {
    document.cookie = `${ADMIN_TOKEN_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC; SameSite=Strict`;
  }
  if (typeof window !== 'undefined') {
    localStorage.removeItem('adminEmail');
    localStorage.removeItem('adminName');
  }
};

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const token = getAdminToken();

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};

export const parseApiError = async (response: Response, fallback: string): Promise<string> => {
  try {
    const data = await response.json();
    const message = data?.message;
    if (Array.isArray(message)) return message.filter(Boolean).join(', ') || fallback;
    if (typeof message === 'string' && message.trim()) return message;
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    return fallback;
  } catch {
    return fallback;
  }
};

export const getErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  return fallback;
};
