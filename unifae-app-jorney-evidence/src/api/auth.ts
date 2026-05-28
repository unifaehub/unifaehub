import { apiClient, saveToken, clearToken } from './client';

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export async function loginJornada(identifier: string, password: string): Promise<SessionUser> {
  const { data } = await apiClient.post('/auth/login', {
    identifier,
    password,
    accessMode: 'JORNADA',
  });
  await saveToken(data.access_token);
  return data.user as SessionUser;
}

export async function logout() {
  await clearToken();
}
