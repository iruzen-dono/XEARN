'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Zap, CheckCircle, XCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-dark-400">Chargement...</div></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien invalide.');
      return;
    }

    api(`/auth/verify-email?token=${encodeURIComponent(token)}`, { skipAuthRedirect: true })
      .then((data: any) => {
        setStatus('success');
        setMessage(data?.message || 'Email vérifié avec succès !');
      })
      .catch((err) => {
        setStatus('error');
        setMessage(err.message || 'Lien invalide ou expiré.');
      });
  }, [token]);

  useEffect(() => {
    if (status !== 'success') return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          router.push('/login');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative">
      <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent" />

      <div className="card max-w-md w-full relative z-10 text-center">
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <Zap className="w-8 h-8 text-primary-400" />
            <span className="text-2xl font-bold gradient-text">XEARN</span>
          </Link>
        </div>

        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="animate-spin w-10 h-10 border-2 border-primary-400 border-t-transparent rounded-full" />
            </div>
            <p className="text-dark-400">Vérification en cours...</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-12 h-12 text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-green-400 mb-2">{message}</h1>
            <p className="text-dark-400 text-sm mb-4">
              Redirection vers la connexion dans {countdown}s...
            </p>
            <Link href="/login" className="btn-primary inline-block px-6 py-2">
              Se connecter maintenant
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <XCircle className="w-12 h-12 text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-red-400 mb-2">{message}</h1>
            <Link href="/login" className="text-primary-400 hover:text-primary-300 text-sm">
              Retour à la connexion
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
