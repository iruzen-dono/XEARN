'use client';

import { useEffect, useState } from 'react';
import { Plus, Loader2, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';

export default function AdminTasksPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: 'VIDEO_AD',
    reward: '',
    url: '',
    maxCompletions: '',
  });

  const fetchTasks = async () => {
    if (!token) return;
    try {
      const data = await adminApi.getAllTasks(token) as any;
      setTasks(data?.tasks || (Array.isArray(data) ? data : []));
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, [token]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    try {
      await adminApi.createTask(token, {
        ...form,
        reward: Number(form.reward),
        maxCompletions: form.maxCompletions ? Number(form.maxCompletions) : undefined,
      });
      toast.success('Tâche créée avec succès !');
      setShowCreate(false);
      setForm({ title: '', description: '', type: 'VIDEO_AD', reward: '', url: '', maxCompletions: '' });
      fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
    } finally {
      setCreating(false);
    }
  };

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tâches</h1>
          <p className="text-dark-400">Gérer les tâches publicitaires</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2">
          {showCreate ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
          {showCreate ? 'Fermer' : 'Créer une tâche'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Nouvelle tâche</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-dark-300 mb-1 block">Titre</label>
                <input type="text" className="input-field" placeholder="Regarder une publicité..." value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm text-dark-300 mb-1 block">Type</label>
                <select className="input-field" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  <option value="VIDEO_AD">Vidéo publicitaire</option>
                  <option value="CLICK_AD">Clic publicitaire</option>
                  <option value="SURVEY">Sondage</option>
                  <option value="APP_INSTALL">Installation app</option>
                  <option value="SOCIAL_SHARE">Partage social</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Description</label>
              <textarea className="input-field" rows={2} placeholder="Description de la tâche..." value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm text-dark-300 mb-1 block">Récompense (FCFA)</label>
                <input type="number" className="input-field" placeholder="50" min="1" value={form.reward}
                  onChange={(e) => setForm({ ...form, reward: e.target.value })} required />
              </div>
              <div>
                <label className="text-sm text-dark-300 mb-1 block">URL (optionnel)</label>
                <input type="url" className="input-field" placeholder="https://..." value={form.url}
                  onChange={(e) => setForm({ ...form, url: e.target.value })} />
              </div>
              <div>
                <label className="text-sm text-dark-300 mb-1 block">Max complétions</label>
                <input type="number" className="input-field" placeholder="Illimité" value={form.maxCompletions}
                  onChange={(e) => setForm({ ...form, maxCompletions: e.target.value })} />
              </div>
            </div>
            <button type="submit" disabled={creating} className="btn-primary disabled:opacity-50">
              {creating ? 'Création...' : 'Créer la tâche'}
            </button>
          </form>
        </div>
      )}

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left text-dark-400 text-sm font-medium p-4">Titre</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Type</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Récompense</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Complétions</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Statut</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-dark-400 py-12">
                    Aucune tâche créée. Cliquez sur &quot;Créer une tâche&quot; pour commencer.
                  </td>
                </tr>
              ) : (
                tasks.map((t) => (
                  <tr key={t.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="p-4 font-medium">{t.title}</td>
                    <td className="p-4 text-dark-400">{t.type?.replace('_', ' ')}</td>
                    <td className="p-4 text-accent-400 font-semibold">{fmt(t.reward)} FCFA</td>
                    <td className="p-4">{t.currentCompletions || 0}{t.maxCompletions ? `/${t.maxCompletions}` : ''}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${t.status === 'ACTIVE' ? 'bg-green-500/10 text-green-400' : 'bg-dark-700 text-dark-400'}`}>
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
