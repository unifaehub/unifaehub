import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE ?? 'http://localhost:3000/api/v1';

export const apiClient = axios.create({ baseURL: API_BASE });

apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('unifae_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function saveToken(token: string) {
  await SecureStore.setItemAsync('unifae_token', token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync('unifae_token');
}
