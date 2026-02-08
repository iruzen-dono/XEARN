'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Loader2, Pause, Play, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';

const taskTypes = ['VIDEO_AD', 'CLICK_AD', 'SURVEY', 'SPONSORED'];
const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-500/10 text-green-400',
  PAUSED: 'bg-yellow-500/10 text-yellow-400',
  COMPLETED: 'bg-blue-500/10 text-blue-400',
  EXPIRED: 'bg-dark-700 text-dark-400',
};

export default function AdminTasksPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('VIDEO_AD');
  const [reward, setReward] = useState('');
  const [maxCompletions, setMaxCompletions] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [externalUrl, setExternalUrl] = useState('');

  const fetchTasks = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getAllTasks(token, page) as any;
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erreur chargement tâches:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !title || !reward) return;
    setCreating(true);
    try {
      await adminApi.createTask(token, {
        title,
        description: description || undefined,
        type,
        reward: parseFloat(reward),
        maxCompletions: maxCompletions ? parseInt(maxCompletions) : undefined,
        mediaUrl: mediaUrl || undefined,
        externalUrl: externalUrl || undefined,
      });
      setTitle(''); setDescription(''); setType('VIDEO_AD'); setReward('');
      setMaxCompletions(''); setMediaUrl(''); setExternalUrl('');
      setShowCreate(false);
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur création');
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (taskId: string) => {
    if (!token) return;
    setActionLoading(taskId);
    try {
      await adminApi.toggleTask(token, taskId);
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!token || !confirm('Supprimer cette tâche définitivement ?')) return;
    setActionLoading(taskId);
    try {
      await adminApi.deleteTask(token, taskId);
      await fetchTasks();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / 20);

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Gestion des tâches</h1>
        <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showCreate ? 'Annuler' : 'Nouvelle tâche'}
        </button>
      </div>

      {showCreate && (
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Créer une tâche</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-400 mb-1">Titre *</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="Regarder une vidéo..." />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Type *</label>
                <select value={type} onChange={(e) => setType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none">
                  {taskTypes.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Récompense (FCFA) *</label>
                <input type="number" value={reward} onChange={(e) => setReward(e.target.value)} required min="1"
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="50" />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">Max complétions</label>
                <input type="number" value={maxCompletions} onChange={(e) => setMaxCompletions(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="Illimité" />
              </div>
            </div>
            <div>
              <label className="block text-sm text-dark-400 mb-1">Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2}
                className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none resize-none"
                placeholder="Description optionnelle..." />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-dark-400 mb-1">URL média</label>
                <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="https://youtube.com/..." />
              </div>
              <div>
                <label className="block text-sm text-dark-400 mb-1">URL externe</label>
                <input type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)}
                  className="w-full px-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none"
                  placeholder="https://..." />
              </div>
            </div>
            <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Créer la tâche
            </button>
          </form>
        </div>
      )}

      <div className="text-dark-400 text-sm mb-4">{total} tâche{total > 1 ? 's' : ''}</div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
      ) : tasks.length === 0 ? (
        <div className="card text-center text-dark-400 py-12">Aucune tâche créée</div>
      ) : (
        <>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{task.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${statusColors[task.status] || ''}`}>
                      {task.status}
                    </span>
                  </div>
                  <div className="text-dark-500 text-xs flex flex-wrap gap-3">
                    <span>{task.type.replace('_', ' ')}</span>
                    <span>{Number(task.reward)} FCFA</span>
                    <span>{task.completionCount}{task.maxCompletions ? `/${task.maxCompletions}` : ''} complétions</span>
                    <span>{new Date(task.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                  {task.description && <div className="text-dark-400 text-xs mt-1 truncate">{task.description}</div>}
                </div>
                <div className="flex gap-2 shrink-0">
                  {actionLoading === task.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-dark-400" />
                  ) : (
                    <>
                      <button onClick={() => handleToggle(task.id)}
                        title={task.status === 'ACTIVE' ? 'Mettre en pause' : 'Activer'}
                        className={`p-2 rounded-lg transition-colors ${
                          task.status === 'ACTIVE' ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-green-400 hover:bg-green-500/10'
                        }`}>
                        {task.status === 'ACTIVE' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </button>
                      <button onClick={() => handleDelete(task.id)} title="Supprimer"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-dark-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
