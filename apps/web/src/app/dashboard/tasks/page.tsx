'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Play, CheckCircle, Loader2, ExternalLink, Timer, X, ListTodo } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { tasksApi } from '@/lib/api';

interface TaskSession {
  sessionId: string;
  startedAt: string;
  minDurationSeconds: number;
  task: {
    id: string;
    title: string;
    type: string;
    description?: string;
    mediaUrl?: string;
    externalUrl?: string;
    reward: number;
  };
}

const TYPE_LABELS: Record<string, string> = {
  VIDEO_AD: 'Vidéo publicitaire',
  CLICK_AD: 'Clic publicitaire',
  SURVEY: 'Sondage',
  SPONSORED: 'Tâche sponsorisée',
};

const TYPE_ICONS: Record<string, string> = {
  VIDEO_AD: '🎬',
  CLICK_AD: '🔗',
  SURVEY: '📋',
  SPONSORED: '⭐',
};

export default function TasksPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [tasks, setTasks] = useState<any[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  // Session active
  const [activeSession, setActiveSession] = useState<TaskSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [linkOpened, setLinkOpened] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Timer countdown
  useEffect(() => {
    if (!activeSession) return;

    const updateCountdown = () => {
      const elapsed = (Date.now() - new Date(activeSession.startedAt).getTime()) / 1000;
      const remaining = Math.max(0, activeSession.minDurationSeconds - elapsed);
      setCountdown(Math.ceil(remaining));
    };

    updateCountdown();
    intervalRef.current = setInterval(updateCountdown, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [activeSession]);

  const handleStart = useCallback(async (taskId: string) => {
    if (!token || starting) return;
    setStarting(taskId);
    try {
      const session = await tasksApi.start(token, taskId) as TaskSession;
      setActiveSession(session);
      setLinkOpened(false);
      setCountdown(session.minDurationSeconds);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du démarrage');
    } finally {
      setStarting(null);
    }
  }, [token, starting, toast]);

  const handleOpenLink = useCallback(() => {
    if (!activeSession) return;
    const url = activeSession.task.externalUrl || activeSession.task.mediaUrl;
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setLinkOpened(true);
    }
  }, [activeSession]);

  const handleComplete = useCallback(async () => {
    if (!token || !activeSession || completing) return;
    setCompleting(true);
    try {
      await tasksApi.complete(token, activeSession.task.id);
      setCompletedIds((prev) => new Set(prev).add(activeSession.task.id));
      toast.success('Tâche complétée ! Récompense créditée.');
      setActiveSession(null);
      setLinkOpened(false);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la complétion');
    } finally {
      setCompleting(false);
    }
  }, [token, activeSession, completing, toast]);

  const handleCancel = useCallback(() => {
    setActiveSession(null);
    setLinkOpened(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const canComplete = countdown === 0 && (linkOpened || (!activeSession?.task.externalUrl && !activeSession?.task.mediaUrl));

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-56 bg-dark-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-dark-800 rounded animate-pulse mb-8" />
        </div>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-dark-800 rounded-xl animate-pulse" />
                <div>
                  <div className="h-5 w-40 bg-dark-800 rounded animate-pulse mb-2" />
                  <div className="h-3 w-28 bg-dark-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-5 w-20 bg-dark-800 rounded animate-pulse" />
                <div className="h-9 w-28 bg-dark-800 rounded-lg animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Modal de session active
  if (activeSession) {
    const hasLink = activeSession.task.externalUrl || activeSession.task.mediaUrl;

    return (
      <div>
        <h1 className="text-3xl font-bold mb-2">Tâche en cours</h1>
        <p className="text-dark-400 mb-8">Complétez les étapes ci-dessous pour obtenir votre récompense</p>

        <div className="card max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{TYPE_ICONS[activeSession.task.type] || '📌'}</span>
              <div>
                <h2 className="text-xl font-bold">{activeSession.task.title}</h2>
                <span className="text-dark-400 text-sm">{TYPE_LABELS[activeSession.task.type] || activeSession.task.type}</span>
              </div>
            </div>
            <button onClick={handleCancel} className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Description */}
          {activeSession.task.description && (
            <p className="text-dark-300 mb-6 bg-dark-800 rounded-lg p-4">{activeSession.task.description}</p>
          )}

          {/* Étapes */}
          <div className="space-y-4 mb-8">
            {/* Étape 1 : Ouvrir le lien */}
            {hasLink && (
              <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${linkOpened ? 'border-green-500/30 bg-green-500/5' : 'border-dark-700 bg-dark-800'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${linkOpened ? 'bg-green-500 text-white' : 'bg-dark-600 text-dark-300'}`}>
                  {linkOpened ? '✓' : '1'}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${linkOpened ? 'text-green-400' : 'text-white'}`}>
                    {activeSession.task.type === 'VIDEO_AD' ? 'Regarder la vidéo' :
                     activeSession.task.type === 'SURVEY' ? 'Compléter le sondage' :
                     'Visiter le lien'}
                  </p>
                  <p className="text-dark-400 text-sm">
                    {linkOpened ? 'Lien ouvert ✓' : 'Cliquez pour ouvrir dans un nouvel onglet'}
                  </p>
                </div>
                <button
                  onClick={handleOpenLink}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    linkOpened 
                      ? 'bg-green-500/10 text-green-400 border border-green-500/30' 
                      : 'bg-primary-500 text-white hover:bg-primary-600'
                  }`}
                >
                  <ExternalLink className="w-4 h-4" />
                  {linkOpened ? 'Ouvert' : 'Ouvrir'}
                </button>
              </div>
            )}

            {/* Étape 2 : Timer */}
            <div className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${countdown === 0 ? 'border-green-500/30 bg-green-500/5' : 'border-dark-700 bg-dark-800'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${countdown === 0 ? 'bg-green-500 text-white' : 'bg-dark-600 text-dark-300'}`}>
                {countdown === 0 ? '✓' : hasLink ? '2' : '1'}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${countdown === 0 ? 'text-green-400' : 'text-white'}`}>
                  {countdown === 0 ? 'Temps minimum atteint' : 'Patientez le temps requis'}
                </p>
                <p className="text-dark-400 text-sm">
                  {countdown === 0
                    ? `Durée de ${activeSession.minDurationSeconds}s respectée ✓`
                    : `Temps minimum : ${activeSession.minDurationSeconds} secondes`}
                </p>
              </div>
              {countdown > 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-700 border border-dark-600">
                  <Timer className="w-4 h-4 text-accent-400 animate-pulse" />
                  <span className="text-accent-400 font-mono font-bold text-lg">{countdown}s</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-medium text-sm">OK</span>
                </div>
              )}
            </div>
          </div>

          {/* Récompense + Bouton compléter */}
          <div className="flex items-center justify-between pt-4 border-t border-dark-700">
            <div>
              <p className="text-dark-400 text-sm">Récompense</p>
              <p className="text-accent-400 font-bold text-xl">{Number(activeSession.task.reward).toLocaleString('fr-FR')} FCFA</p>
            </div>
            <button
              onClick={handleComplete}
              disabled={!canComplete || completing}
              className="btn-primary py-3 px-8 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed text-base"
            >
              {completing ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <CheckCircle className="w-5 h-5" />
              )}
              {completing ? 'Validation...' : canComplete ? 'Compléter la tâche' : 'En attente...'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Liste des tâches
  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Tâches disponibles</h1>
      <p className="text-dark-400 mb-8">Complétez des tâches pour gagner de l&apos;argent</p>

      {tasks.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-20 h-20 mx-auto mb-5 bg-primary-500/10 rounded-full flex items-center justify-center">
            <ListTodo className="w-10 h-10 text-primary-400" />
          </div>
          <h3 className="text-xl font-semibold mb-2">Aucune tâche disponible</h3>
          <p className="text-dark-400 text-sm max-w-sm mx-auto">De nouvelles tâches sont ajoutées régulièrement. Revenez bientôt pour gagner de l&apos;argent !</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {tasks.map((task) => {
            const isDone = completedIds.has(task.id);
            return (
              <div key={task.id} className="card flex items-center justify-between hover:border-primary-500/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${isDone ? 'bg-green-500/10' : 'bg-primary-500/10'}`}>
                    {isDone ? <CheckCircle className="w-6 h-6 text-green-400" /> : (TYPE_ICONS[task.type] || '📌')}
                  </div>
                  <div>
                    <h3 className="font-semibold">{task.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-dark-400 text-sm">{TYPE_LABELS[task.type] || task.type}</span>
                      {task.externalUrl && (
                        <span className="text-xs text-dark-500 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" /> Lien externe
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-accent-400 font-bold">{Number(task.reward).toLocaleString('fr-FR')} FCFA</span>
                  {isDone ? (
                    <span className="text-green-400 text-sm font-medium px-4 py-2 bg-green-500/10 rounded-lg">Complétée ✓</span>
                  ) : (
                    <button
                      onClick={() => handleStart(task.id)}
                      disabled={starting === task.id}
                      className="btn-primary text-sm py-2 px-4 flex items-center gap-2 disabled:opacity-50"
                    >
                      {starting === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                      Commencer
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
