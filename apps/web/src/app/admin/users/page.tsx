'use client';

import { Search, MoreVertical } from 'lucide-react';

export default function AdminUsersPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Utilisateurs</h1>
          <p className="text-dark-400">Gérer les comptes utilisateurs</p>
        </div>
      </div>

      {/* Search */}
      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input type="text" placeholder="Rechercher un utilisateur..." className="input-field pl-10" />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left text-dark-400 text-sm font-medium p-4">Nom</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Email</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Statut</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Inscrit le</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={5} className="text-center text-dark-400 py-12">
                Aucun utilisateur pour le moment.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
