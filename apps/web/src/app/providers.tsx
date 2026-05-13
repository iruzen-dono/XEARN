'use client';

import { useEffect } from 'react';
import { SessionProvider } from 'next-auth/react';
import * as Sentry from '@sentry/react';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
  });
}

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
