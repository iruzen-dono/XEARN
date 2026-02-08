'use client';

import { Users, Wallet, ListTodo, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Utilisateurs</span>
            <Users className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-dark-500 text-sm mt-1">Total inscrits</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Comptes activés</span>
            <TrendingUp className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-dark-500 text-sm mt-1">Payants</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Tâches actives</span>
            <ListTodo className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-dark-500 text-sm mt-1">En cours</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Retraits en attente</span>
            <Wallet className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold">0</div>
          <div className="text-dark-500 text-sm mt-1">À traiter</div>
        </div>
      </div>

      {/* Recent users */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Derniers inscrits</h2>
        <div className="text-dark-400 text-center py-8">
          Aucun utilisateur pour le moment.
        </div>
      </div>

      {/* Pending withdrawals */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Retraits en attente</h2>
        <div className="text-dark-400 text-center py-8">
          Aucun retrait en attente.
        </div>
      </div>
    </div>
  );
}
