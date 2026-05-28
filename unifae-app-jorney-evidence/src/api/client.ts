import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';

console.log('[API] Base URL:', API_BASE);

export const apiClient = axios.create({ baseURL: API_BASE });

// ── Request interceptor ───────────────────────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('unifae_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;

  console.log(`[API →] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
    hasToken: !!token,
    data: config.data,
  });

  return config;
});

// ── Response interceptor ──────────────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API ←] ${response.status} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url    = error?.config?.url;
    const msg    = error?.response?.data?.message ?? error?.message;
    console.error(`[API ✗] ${status ?? 'ERR'} ${url}:`, msg, error?.response?.data);
    return Promise.reject(error);
  },
);

export async function saveToken(token: string) {
  console.log('[Auth] Salvando token no SecureStore');
  await SecureStore.setItemAsync('unifae_token', token);
}

export async function clearToken() {
  console.log('[Auth] Removendo token do SecureStore');
  await SecureStore.deleteItemAsync('unifae_token');
}
