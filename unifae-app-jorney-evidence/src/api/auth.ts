import { apiClient, saveToken, clearToken } from './client';

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: string;
};

export async function loginJornada(identifier: string, password: string): Promise<SessionUser> {
  console.log('[Auth] Tentando login:', { identifier, accessMode: 'JORNADA' });
  try {
    const { data } = await apiClient.post('/auth/login', {
      identifier,
      password,
      accessMode: 'JORNADA',
    });
    console.log('[Auth] Login OK — user:', data.user);
    await saveToken(data.access_token);
    return data.user as SessionUser;
  } catch (err: any) {
    console.error('[Auth] Login FALHOU:', err?.response?.status, err?.response?.data);
    throw err;
  }
}

export async function logout() {
  console.log('[Auth] Logout');
  await clearToken();
}
