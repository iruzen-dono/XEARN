'use client';

import { Plus } from 'lucide-react';

export default function AdminTasksPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tâches</h1>
          <p className="text-dark-400">Gérer les tâches publicitaires</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> Créer une tâche
        </button>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-dark-700">
              <th className="text-left text-dark-400 text-sm font-medium p-4">Titre</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Type</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Récompense</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Complétions</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Statut</th>
              <th className="text-left text-dark-400 text-sm font-medium p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={6} className="text-center text-dark-400 py-12">
                Aucune tâche créée. Cliquez sur &quot;Créer une tâche&quot; pour commencer.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
