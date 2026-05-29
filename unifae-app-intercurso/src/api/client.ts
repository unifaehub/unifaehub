import axios from 'axios';
import Constants from 'expo-constants';

/**
 * Detecta a URL base da API automaticamente.
 * App do Intercurso é público — sem autenticação, sem SecureStore.
 * Reutiliza a mesma lógica de resolução de IP do app da Jornada.
 */
function resolveApiBase(): string {
  const port = process.env.EXPO_PUBLIC_API_PORT ?? '3000';

  if (__DEV__) {
    const hostUri =
      Constants.expoConfig?.hostUri ??
      (Constants as any).manifest2?.launchAsset?.url ??
      (Constants as any).manifest?.debuggerHost;

    if (hostUri) {
      const ip  = hostUri.split(':')[0];
      const url = `http://${ip}:${port}/api/v1`;
      console.log('[API] Base URL (auto):', url);
      return url;
    }
  }

  const fallback = process.env.EXPO_PUBLIC_API_BASE ?? `http://localhost:${port}/api/v1`;
  console.log('[API] Base URL (env/fallback):', fallback);
  return fallback;
}

export const apiClient = axios.create({ baseURL: resolveApiBase() });

apiClient.interceptors.request.use((config) => {
  console.log(`[API →] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    console.log(`[API ←] ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const status = error?.response?.status;
    const url    = error?.config?.url;
    const msg    = error?.response?.data?.message ?? error?.message;
    if (!status || status >= 500) {
      console.error(`[API ✗] ${status ?? 'ERR'} ${url}:`, msg);
    } else {
      console.warn(`[API ✗] ${status} ${url}:`, msg);
    }
    return Promise.reject(error);
  },
);
