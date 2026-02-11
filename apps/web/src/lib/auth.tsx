'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut as nextAuthSignOut } from 'next-auth/react';
import { authApi, usersApi } from './api';
import { generateFingerprint } from './fingerprint';

// Types
export interface User {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: 'USER' | 'ADMIN';
  status: 'FREE' | 'ACTIVATED' | 'SUSPENDED' | 'BANNED';
  referralCode: string;
  provider: 'LOCAL' | 'GOOGLE';
  emailVerifiedAt: string | null;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  logout: () => Promise<void>;
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

interface RegisterResult {
  requiresEmailVerification?: boolean;
  message?: string;
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
  const { data: session, status: sessionStatus } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  // Sync NextAuth Google session into local auth state
  // Only syncs when 'googleAuthPending' flag exists in sessionStorage
  // (set by the Google button before calling signIn)
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (token) return; // Already logged in

    // Only sync if the user explicitly clicked "Continue with Google"
    if (!sessionStorage.getItem('googleAuthPending')) return;

    const apiAccessToken = (session as any)?.apiAccessToken as string | undefined;
    const apiRefreshToken = (session as any)?.apiRefreshToken as string | undefined;
    const apiUser = (session as any)?.apiUser as User | undefined;

    if (!apiAccessToken || !apiRefreshToken || !apiUser) return;

    // Clear the flag and sync
    sessionStorage.removeItem('googleAuthPending');
    storeAuth(apiAccessToken, apiRefreshToken, apiUser);
    setToken(apiAccessToken);
    setUser(apiUser);

    router.replace(apiUser.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [sessionStatus, session, router, token]);

  // Listen for token refresh events from api.ts
  useEffect(() => {
    const handleAuthRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.accessToken) setToken(detail.accessToken);
      if (detail?.user) setUser(detail.user);
    };
    window.addEventListener('auth-refresh', handleAuthRefresh);
    return () => window.removeEventListener('auth-refresh', handleAuthRefresh);
  }, []);

  // Redirect logic
  useEffect(() => {
    if (isLoading) return;
    if (sessionStatus === 'loading') return;

    const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/admin');
    const isAuthPage = pathname === '/login' || pathname === '/register' || pathname.startsWith('/verify-email');

    if (isProtected && !token) {
      // Ne pas rediriger si une auth Google est en cours de sync
      const googlePending = typeof window !== 'undefined' && sessionStorage.getItem('googleAuthPending');
      if (!googlePending) {
        router.replace('/login');
      }
    }

    if (isAuthPage && token && user) {
      router.replace(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    }

    if (pathname.startsWith('/admin') && user && user.role !== 'ADMIN') {
      router.replace('/dashboard');
    }
  }, [isLoading, token, user, pathname, router, sessionStatus]);

  const refreshUser = useCallback(async () => {
    const currentToken = getStoredToken();
    if (!currentToken) return;
    try {
      const profile = await usersApi.getProfile(currentToken) as User;
      setUser(profile);
      localStorage.setItem('user', JSON.stringify(profile));
    } catch {
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
    let fingerprint: string | undefined;
    try { fingerprint = await generateFingerprint(); } catch { /* ignore */ }
    const data = await authApi.login({ email, password, fingerprint }) as any;
    storeAuth(data.accessToken, data.refreshToken, data.user);
    setToken(data.accessToken);
    setUser(data.user);
    router.push(data.user.role === 'ADMIN' ? '/admin' : '/dashboard');
  }, [router]);

  const register = useCallback(async (regData: RegisterData) => {
    let fingerprint: string | undefined;
    try { fingerprint = await generateFingerprint(); } catch { /* ignore */ }
    const data = await authApi.register({ ...regData, fingerprint }) as any;
    if (data?.requiresEmailVerification) {
      router.push(`/verify-email/pending?email=${encodeURIComponent(regData.email)}`);
      return { requiresEmailVerification: true, message: data.message };
    }
    storeAuth(data.accessToken, data.refreshToken, data.user);
    setToken(data.accessToken);
    setUser(data.user);
    router.push('/dashboard');
    return {};
  }, [router]);

  const logout = useCallback(async () => {
    clearAuth();
    setToken(null);
    setUser(null);
    await nextAuthSignOut({ redirect: false });
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
