import React, { createContext, useContext, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { SessionUser } from '../api/auth';

const TOKEN_KEY = 'unifae_token';
const USER_KEY  = 'unifae_user';

type AuthContextType = {
  user: SessionUser | null;
  isLoading: boolean;
  setUser: (u: SessionUser | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUserState] = useState<SessionUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restaura sessão salva no arranque do app
  useEffect(() => {
    console.log('[AuthContext] Iniciando restauração de sessão...');
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        console.log('[AuthContext] Token encontrado:', !!token);
        console.log('[AuthContext] User JSON encontrado:', !!userJson);

        if (token && userJson) {
          const parsed = JSON.parse(userJson) as SessionUser;
          console.log('[AuthContext] Sessão restaurada:', parsed);
          setUserState(parsed);
        } else {
          console.log('[AuthContext] Nenhuma sessão salva — indo para login');
        }
      } catch (err) {
        console.error('[AuthContext] Erro ao restaurar sessão:', err);
      } finally {
        setIsLoading(false);
        console.log('[AuthContext] isLoading = false');
      }
    })();
  }, []);

  function setUser(u: SessionUser | null) {
    console.log('[AuthContext] setUser:', u);
    setUserState(u);
    if (u) {
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)).catch((e) =>
        console.error('[AuthContext] Erro ao salvar user no SecureStore:', e),
      );
    } else {
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    }
  }

  async function signOut() {
    console.log('[AuthContext] signOut');
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(USER_KEY),
    ]);
    setUserState(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
