'use client';

import { useEffect, useState } from 'react';
import { Play, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { tasksApi } from '@/lib/api';

export default function TasksPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [allTasks, myCompletions] = await Promise.all([
          tasksApi.getAll(token) as any,
          tasksApi.getMyCompletions(token) as any,
        ]);
        const taskList = allTasks?.tasks || allTasks || [];
        setTasks(Array.isArray(taskList) ? taskList : []);

        const doneIds = new Set<string>();
        const completions = Array.isArray(myCompletions) ? myCompletions : (myCompletions?.completions || []);
        completions.forEach((c: any) => doneIds.add(c.taskId));
        setCompletedIds(doneIds);
      } catch (err) {
        console.error('Erreur chargement tâches:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleComplete = async (taskId: string) => {
    if (!token || completing) return;
    setCompleting(taskId);
    try {
      await tasksApi.complete(token, taskId);
      setCompletedIds((prev) => new Set(prev).add(taskId));
      toast.success('Tâche complétée ! Récompense créditée.');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la complétion');
    } finally {
      setCompleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Tâches disponibles</h1>
      <p className="text-dark-400 mb-8">Complétez des tâches pour gagner de l&apos;argent</p>

      {tasks.length === 0 ? (
        <div className="card text-dark-400 text-center py-12">
          Aucune tâche disponible pour le moment.
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const isDone = completedIds.has(task.id);
            return (
              <div key={task.id} className="card flex items-center justify-between hover:border-primary-500/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isDone ? 'bg-green-500/10' : 'bg-primary-500/10'}`}>
                    {isDone ? <CheckCircle className="w-6 h-6 text-green-400" /> : <Play className="w-6 h-6 text-primary-400" />}
                  </div>
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <span className="text-dark-400 text-sm">{task.type?.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-accent-400 font-bold">{Number(task.reward).toLocaleString('fr-FR')} FCFA</span>
                  {isDone ? (
                    <span className="text-green-400 text-sm font-medium px-4 py-2">Complétée</span>
                  ) : (
                    <button
                      onClick={() => handleComplete(task.id)}
                      disabled={completing === task.id}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                    >
                      {completing === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Compléter
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
