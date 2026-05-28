import React, { createContext, useContext, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import type { SessionUser } from '../api/auth';

type AuthContextType = {
  user: SessionUser | null;
  setUser: (u: SessionUser | null) => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);

  async function signOut() {
    await SecureStore.deleteItemAsync('unifae_token');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, setUser, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
