'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let cancelled = false;
    let hasExistingController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (cancelled) return;
      if (!hasExistingController) {
        hasExistingController = true;
        return;
      }

      window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => registration.update())
      .catch(() => {
        /* ignore service worker registration failures */
      });

    return () => {
      cancelled = true;
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  return (
    <SessionProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </SessionProvider>
  );
}
