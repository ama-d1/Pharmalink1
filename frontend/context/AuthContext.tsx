import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type AuthUser = {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  token: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  loading: boolean;
  setSession: (user: AuthUser) => Promise<void>;
  clearSession: () => Promise<void>;
  getFirstName: () => string;
};

const STORAGE_KEY = '@pharmalink_session';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) setUser(JSON.parse(raw));
      })
      .finally(() => setLoading(false));
  }, []);

  const setSession = useCallback(async (session: AuthUser) => {
    setUser(session);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  }, []);

  const clearSession = useCallback(async () => {
    setUser(null);
    await AsyncStorage.removeItem(STORAGE_KEY);
  }, []);

  const getFirstName = useCallback(() => {
    if (!user?.fullName) return 'there';
    return user.fullName.split(' ')[0];
  }, [user]);

  const value = useMemo(
    () => ({ user, loading, setSession, clearSession, getFirstName }),
    [user, loading, setSession, clearSession, getFirstName]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
