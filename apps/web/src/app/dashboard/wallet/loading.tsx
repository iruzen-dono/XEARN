'use client';

import { Loader2 } from 'lucide-react';

export default function WalletLoading() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
        <p className="text-sm text-dark-400">Chargement du portefeuille...</p>
      </div>
    </div>
  );
}
