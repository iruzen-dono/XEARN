'use client';

import { Wallet, Users, ListTodo, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Tableau de bord</h1>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Solde</span>
            <Wallet className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-2xl font-bold">0 FCFA</div>
          <div className="text-dark-500 text-sm mt-1">Portefeuille actuel</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Total gagné</span>
            <TrendingUp className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-2xl font-bold">0 FCFA</div>
          <div className="text-dark-500 text-sm mt-1">Depuis l&apos;inscription</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Tâches</span>
            <ListTodo className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-dark-500 text-sm mt-1">Tâches complétées</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Filleuls</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-dark-500 text-sm mt-1">Parrainages actifs</div>
        </div>
      </div>

      {/* Account status */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Statut du compte</h2>
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
          <span className="text-dark-300">Compte gratuit — Activez votre compte pour débloquer les retraits et le parrainage</span>
        </div>
        <button className="btn-primary mt-4">Activer mon compte (4 000 FCFA)</button>
      </div>

      {/* Recent activity */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
        <div className="text-dark-400 text-center py-8">
          Aucune activité pour le moment. Commencez par compléter des tâches !
        </div>
      </div>
    </div>
  );
}
