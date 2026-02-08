'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { authApi, usersApi } from './api';

// Types
export interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  status: 'PENDING' | 'ACTIVATED' | 'SUSPENDED' | 'BANNED';
  referralCode: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  password: string;
  referralCode?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Token helpers
function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('refreshToken');
}

function getStoredUser(): User | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeAuth(accessToken: string, refreshToken: string, user: User) {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
  localStorage.setItem('user', JSON.stringify(user));
}

function clearAuth() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Redirect unauthenticated users away from protected routes
  useEffect(() => {
    if (isLoading) return;

    const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
    const isAuthPage = pathname === '/login' || pathname === '/register';

    if (isProtected && !token) {
      router.replace('/login');
    }

    if (isAuthPage && token && user) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }

    // Prevent non-admin from accessing admin routes
    if (pathname.startsWith('/admin') && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [isLoading, token, user, pathname, router]);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;
    try {
      const profile = await usersApi.getProfile(currentToken) as User;
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch {
      // Token expired — try refresh
      const rt = getStoredRefreshToken();
      if (rt) {
        try {
          const data = await authApi.refresh(rt) as any;
          storeAuth(data.accessToken, data.refreshToken, data.user);
          setToken(data.accessToken);
          setUser(data.user);
        } catch {
          clearAuth();
          setToken(null);
          setUser(null);
        }
      }
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password }) as any;
    storeAuth(data.accessToken, data.refreshToken, data.user);
    setToken(data.accessToken);
    setUser(data.user);

    if (data.user.role === 'ADMIN') {
      router.push('/admin');
    } else {
      router.push('/dashboard');
    }
  }, [router]);

  const register = useCallback(async (regData: RegisterData) => {
    const data = await authApi.register(regData) as any;
    storeAuth(data.accessToken, data.refreshToken, data.user);
    setToken(data.accessToken);
    setUser(data.user);
    router.push('/dashboard');
  }, [router]);

  const logout = useCallback(() => {
    clearAuth();
    setToken(null);
    setUser(null);
    router.push('/login');
  }, [router]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
