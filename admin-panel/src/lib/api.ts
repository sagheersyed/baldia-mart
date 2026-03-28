export const BASE_URL = 'https://c2e9-175-107-236-228.ngrok-free.app/api/v1';

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  let token = null;
  if (typeof window !== 'undefined') {
    token = localStorage.getItem('adminToken');
  }

  const headers: HeadersInit = {
    ...options.headers,
  };

  if (token) {
    (headers as any)['Authorization'] = `Bearer ${token}`;
  }

  return fetch(url, { ...options, headers });
};
