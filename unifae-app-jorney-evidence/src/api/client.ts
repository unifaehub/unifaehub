import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

// Callback registrado pelo _layout para forçar re-login em caso de 401
let _onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) { _onUnauthorized = fn; }

/**
 * Detecta a URL base da API automaticamente:
 * - Em DEV: usa o IP do Metro Bundler (mesmo IP da máquina de desenvolvimento)
 *   via Constants.expoConfig.hostUri, sem precisar de .env.
 * - Fallback: variável de ambiente EXPO_PUBLIC_API_BASE.
 * - Porta da API: EXPO_PUBLIC_API_PORT (padrão 3000).
 */
function resolveApiBase(): string {
  const port = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

  if (__DEV__) {
    // hostUri = "192.168.x.x:8081" — pegamos só o IP e trocamos a porta
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any).manifest2?.launchAsset?.url ?? // Expo Go SDK 54
      (Constants as any).manifest?.debuggerHost;        // Expo Go SDK <50

    if (hostUri) {
      const ip = hostUri.split(':')[0];
      const url = `http://${ip}:${port}/api/v1`;
      console.log('[API] Base URL (auto):', url);
      return url;
    }
  }

  // Fallback: variável de ambiente ou localhost
  const fallback = process.env.EXPO_PUBLIC_API_BASE ?? `http://localhost:${port}/api/v1`;
  console.log('[API] Base URL (env/fallback):', fallback);
  return fallback;
}

export const apiClient = axios.create({ baseURL: resolveApiBase() });

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
  async (error) => {
    const status = error?.response?.status;
    const url    = error?.config?.url;
    const msg    = error?.response?.data?.message ?? error?.message;
    console.error(`[API ✗] ${status ?? 'ERR'} ${url}:`, msg, error?.response?.data);

    // 401 → sessão expirada → forçar re-login
    if (status === 401 && _onUnauthorized) {
      console.warn('[API] 401 Unauthorized — forçando re-login');
      await clearToken();
      await SecureStore.deleteItemAsync('unifae_user');
      _onUnauthorized();
    }

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
