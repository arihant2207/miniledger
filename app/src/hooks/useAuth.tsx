/**
 * Module: Authentication State Hook & Provider
 * Responsibility: Manages reactive user session state (token, profile, hydration, login, logout).
 * Intercepts 401 unauthorized errors from the API client to invalidate local sessions gracefully.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { storage } from '../utils/storage';
import { User } from '../api/types';
import { registerUnauthorizedHandler } from '../api/client';

export interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(async () => {
    await storage.clearAll();
    setToken(null);
    setUser(null);
  }, []);

  const login = useCallback(async (newToken: string, newUser: User) => {
    await storage.setToken(newToken);
    await storage.setUser(newUser);
    setToken(newToken);
    setUser(newUser);
  }, []);

  // Hydrate session from SecureStore on app launch
  useEffect(() => {
    async function hydrate() {
      try {
        const storedToken = await storage.getToken();
        const storedUser = await storage.getUser();

        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(storedUser);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void hydrate();

    // Auto-logout on API 401
    registerUnauthorizedHandler(() => {
      void logout();
    });
  }, [logout]);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
