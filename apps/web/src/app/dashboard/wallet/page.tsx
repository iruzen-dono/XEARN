'use client';

import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock } from 'lucide-react';

export default function WalletPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Portefeuille</h1>
      <p className="text-dark-400 mb-8">Gérez votre solde et vos retraits</p>

      {/* Balance card */}
      <div className="card bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/20 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-dark-400 text-sm mb-1">Solde disponible</div>
            <div className="text-4xl font-bold">0 FCFA</div>
          </div>
          <Wallet className="w-12 h-12 text-primary-400" />
        </div>
        <button className="btn-primary">Retirer mes gains</button>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card flex items-center gap-4">
          <ArrowDownCircle className="w-10 h-10 text-green-400" />
          <div>
            <div className="text-dark-400 text-sm">Total gagné</div>
            <div className="text-xl font-bold">0 FCFA</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <ArrowUpCircle className="w-10 h-10 text-blue-400" />
          <div>
            <div className="text-dark-400 text-sm">Total retiré</div>
            <div className="text-xl font-bold">0 FCFA</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <Clock className="w-10 h-10 text-yellow-400" />
          <div>
            <div className="text-dark-400 text-sm">En attente</div>
            <div className="text-xl font-bold">0 FCFA</div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Historique des transactions</h2>
        <div className="text-dark-400 text-center py-8">
          Aucune transaction pour le moment.
        </div>
      </div>
    </div>
  );
}
