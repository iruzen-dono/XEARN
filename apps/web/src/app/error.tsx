'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Erreur applicative:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-3xl font-bold mb-3">Oups, une erreur est survenue</h1>
        <p className="text-dark-400 mb-6">
          Quelque chose s&apos;est mal passé. Veuillez réessayer ou revenir à l&apos;accueil.
        </p>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={reset}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Réessayer
          </button>
          <Link href="/" className="text-primary-400 hover:text-primary-300 font-medium">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
