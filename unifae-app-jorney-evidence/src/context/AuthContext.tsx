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
    (async () => {
      try {
        const [token, userJson] = await Promise.all([
          SecureStore.getItemAsync(TOKEN_KEY),
          SecureStore.getItemAsync(USER_KEY),
        ]);
        if (token && userJson) {
          setUserState(JSON.parse(userJson) as SessionUser);
        }
      } catch {
        // token corrompido — ignora, usuário vai para login
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  function setUser(u: SessionUser | null) {
    setUserState(u);
    if (u) {
      SecureStore.setItemAsync(USER_KEY, JSON.stringify(u)).catch(() => {});
    } else {
      SecureStore.deleteItemAsync(USER_KEY).catch(() => {});
    }
  }

  async function signOut() {
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
