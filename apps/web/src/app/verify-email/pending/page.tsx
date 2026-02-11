'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Zap, Mail } from 'lucide-react';
import { authApi } from '@/lib/api';
import { useState } from 'react';

function PendingContent() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    setResendMsg('');
    try {
      await authApi.resendVerification(email);
      setResendMsg('Email renvoyé ! Vérifiez votre boîte de réception.');
    } catch (err: any) {
      setResendMsg(err.message || 'Erreur lors du renvoi.');
    } finally {
      setResending(false);
    }
  };

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

        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-primary-500/20 rounded-full flex items-center justify-center">
            <Mail className="w-8 h-8 text-primary-400" />
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-4">Vérifiez votre email</h1>

        <p className="text-dark-400 mb-2">
          Un lien de confirmation a été envoyé à :
        </p>
        {email && (
          <p className="text-white font-medium mb-6">{email}</p>
        )}

        <p className="text-dark-400 text-sm mb-6">
          Cliquez sur le lien dans l&apos;email pour activer votre compte. Le lien expire dans 24h.
        </p>

        <div className="space-y-3">
          <button
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full border border-dark-600 rounded-xl py-3 text-sm font-medium hover:border-primary-400 transition-colors disabled:opacity-50"
          >
            {resending ? 'Envoi en cours...' : 'Renvoyer le mail de vérification'}
          </button>

          {resendMsg && (
            <p className={`text-sm ${resendMsg.includes('renvoyé') ? 'text-green-400' : 'text-red-400'}`}>
              {resendMsg}
            </p>
          )}

          <Link
            href="/login"
            className="block w-full text-center text-dark-400 hover:text-primary-400 text-sm mt-4"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPendingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="text-dark-400">Chargement...</div></div>}>
      <PendingContent />
    </Suspense>
  );
}
