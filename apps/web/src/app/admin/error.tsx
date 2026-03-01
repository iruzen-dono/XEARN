'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Admin error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="p-4 rounded-2xl bg-danger-500/10 text-danger-400 mb-4">
        <AlertTriangle className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Erreur panneau admin</h2>
      <p className="text-dark-400 mb-6 max-w-md">
        {error.message || 'Un problème inattendu s\'est produit dans le panneau d\'administration.'}
      </p>
      <button onClick={reset} className="btn-primary flex items-center gap-2">
        <RefreshCw className="w-4 h-4" />
        Réessayer
      </button>
    </div>
  );
}
