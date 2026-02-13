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

const AUTH_SENTINEL = 'cookie';

// Provider
export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status: sessionStatus } = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session from cookie (fetch profile)
  useEffect(() => {
    const restore = async () => {
      try {
        const profile = await usersApi.getProfile(AUTH_SENTINEL, { skipAuthRedirect: true }) as User;
        setUser(profile);
        setToken(AUTH_SENTINEL);
      } catch {
        setUser(null);
        setToken(null);
      } finally {
        setIsLoading(false);
      }
    };

    restore();
  }, []);

  // Sync NextAuth Google session into local auth state
  // Only syncs when 'googleAuthPending' flag exists in sessionStorage
  // (set by the Google button before calling signIn)
  useEffect(() => {
    if (sessionStatus !== 'authenticated') return;
    if (token) return; // Already logged in

    // Only sync if the user explicitly clicked "Continue with Google"
    if (!sessionStorage.getItem('googleAuthPending')) return;

    const apiRefreshToken = (session as any)?.apiRefreshToken as string | undefined;
    const apiUser = (session as any)?.apiUser as User | undefined;

    if (!apiRefreshToken || !apiUser) return;

    // Clear the flag and sync
    sessionStorage.removeItem('googleAuthPending');

    (async () => {
      try {
        await authApi.refresh(apiRefreshToken);
      } catch {
        // Ignore refresh failures here; user can retry login
      }

      setToken(AUTH_SENTINEL);
      setUser(apiUser);

      router.replace(apiUser.role === 'ADMIN' ? '/admin' : '/dashboard');
    })();
  }, [sessionStatus, session, router, token]);

  // Listen for token refresh events from api.ts
  useEffect(() => {
    const handleAuthRefresh = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.user) {
        setUser(detail.user);
        setToken(AUTH_SENTINEL);
      }
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
    try {
      const profile = await usersApi.getProfile(AUTH_SENTINEL) as User;
      setUser(profile);
      setToken(AUTH_SENTINEL);
    } catch {
      setUser(null);
      setToken(null);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    let fingerprint: string | undefined;
    try { fingerprint = await generateFingerprint(); } catch { /* ignore */ }
    const data = await authApi.login({ email, password, fingerprint }) as any;
    setToken(AUTH_SENTINEL);
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
    setToken(AUTH_SENTINEL);
    setUser(data.user);
    router.push('/dashboard');
    return {};
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch { /* ignore */ }
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
