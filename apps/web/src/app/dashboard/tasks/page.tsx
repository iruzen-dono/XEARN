'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, CheckCircle, Loader2, ExternalLink, Timer, X, ListTodo } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { tasksApi } from '@/lib/api';
import { MotionDiv, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';
import type { TaskSession } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  VIDEO_AD: 'Vidéo publicitaire',
  CLICK_AD: 'Clic publicitaire',
  SURVEY: 'Sondage',
  SPONSORED: 'Tâche sponsorisée',
};

const TYPE_COLORS: Record<string, string> = {
  VIDEO_AD: 'from-red-500/20 to-red-500/5 text-red-400',
  CLICK_AD: 'from-blue-500/20 to-blue-500/5 text-blue-400',
  SURVEY: 'from-green-500/20 to-green-500/5 text-green-400',
  SPONSORED: 'from-purple-500/20 to-purple-500/5 text-purple-400',
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
  const [tasks, setTasks] = useState<import('@/types').Task[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);

  const [activeSession, setActiveSession] = useState<TaskSession | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [linkOpened, setLinkOpened] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [allTasks, myCompletions] = await Promise.all([
          tasksApi.getAll(token),
          tasksApi.getMyCompletions(token),
        ]);
        const taskList = (allTasks as import('@/types').TasksPage)?.tasks || [];
        setTasks(Array.isArray(taskList) ? taskList : []);
        const doneIds = new Set<string>();
        const completionData = myCompletions as {
          completions?: import('@/types').TaskCompletion[];
        };
        const completions = Array.isArray(myCompletions)
          ? myCompletions
          : completionData?.completions || [];
        completions.forEach((c: import('@/types').TaskCompletion) => doneIds.add(c.taskId));
        setCompletedIds(doneIds);
      } catch (err) {
        console.error('Erreur chargement tâches:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

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

  const handleStart = useCallback(
    async (taskId: string) => {
      if (!token || starting) return;
      setStarting(taskId);
      try {
        const session = (await tasksApi.start(token, taskId)) as TaskSession;
        setActiveSession(session);
        setLinkOpened(false);
        setCountdown(session.minDurationSeconds);
      } catch (err: any) {
        toast.error(err.message || 'Erreur lors du démarrage');
      } finally {
        setStarting(null);
      }
    },
    [token, starting, toast],
  );

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

  const canComplete =
    countdown === 0 &&
    (linkOpened || (!activeSession?.task.externalUrl && !activeSession?.task.mediaUrl));

  if (loading) return <PageSkeleton />;

  // Active session view
  if (activeSession) {
    const hasLink = activeSession.task.externalUrl || activeSession.task.mediaUrl;
    const progressPct =
      activeSession.minDurationSeconds > 0
        ? Math.min(
            100,
            ((activeSession.minDurationSeconds - countdown) / activeSession.minDurationSeconds) *
              100,
          )
        : 100;

    return (
      <div className="space-y-6">
        <MotionDiv preset="fadeUp">
          <h1 className="heading-lg">Tâche en cours</h1>
          <p className="text-dark-400 mt-1">
            Complétez les étapes ci-dessous pour obtenir votre récompense
          </p>
        </MotionDiv>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-gradient max-w-2xl mx-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl bg-gradient-to-br ${TYPE_COLORS[activeSession.task.type] || 'from-primary-500/20 to-primary-500/5'}`}
              >
                {TYPE_ICONS[activeSession.task.type] || '📌'}
              </div>
              <div>
                <h2 className="text-xl font-bold">{activeSession.task.title}</h2>
                <span className="text-dark-400 text-sm">
                  {TYPE_LABELS[activeSession.task.type] || activeSession.task.type}
                </span>
              </div>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mb-6">
            <div className="h-1.5 bg-dark-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-primary-500 to-accent-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {activeSession.task.description && (
            <p className="text-dark-300 mb-6 bg-white/[0.03] rounded-xl p-4 border border-white/[0.04]">
              {activeSession.task.description}
            </p>
          )}

          {/* Steps */}
          <div className="space-y-4 mb-8">
            {hasLink && (
              <div
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${linkOpened ? 'border-success-500/30 bg-success-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${linkOpened ? 'bg-success-500 text-white' : 'bg-dark-700 text-dark-300'}`}
                >
                  {linkOpened ? '✓' : '1'}
                </div>
                <div className="flex-1">
                  <p className={`font-medium ${linkOpened ? 'text-success-400' : 'text-white'}`}>
                    {activeSession.task.type === 'VIDEO_AD'
                      ? 'Regarder la vidéo'
                      : activeSession.task.type === 'SURVEY'
                        ? 'Compléter le sondage'
                        : 'Visiter le lien'}
                  </p>
                  <p className="text-dark-500 text-sm">
                    {linkOpened ? 'Lien ouvert ✓' : 'Cliquez pour ouvrir dans un nouvel onglet'}
                  </p>
                </div>
                <button
                  onClick={handleOpenLink}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${linkOpened ? 'bg-success-500/10 text-success-400 border border-success-500/30' : 'btn-primary btn-sm'}`}
                >
                  <ExternalLink className="w-4 h-4" /> {linkOpened ? 'Ouvert' : 'Ouvrir'}
                </button>
              </div>
            )}

            <div
              className={`flex items-center gap-4 p-4 rounded-xl border transition-all ${countdown === 0 ? 'border-success-500/30 bg-success-500/5' : 'border-white/[0.06] bg-white/[0.02]'}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${countdown === 0 ? 'bg-success-500 text-white' : 'bg-dark-700 text-dark-300'}`}
              >
                {countdown === 0 ? '✓' : hasLink ? '2' : '1'}
              </div>
              <div className="flex-1">
                <p className={`font-medium ${countdown === 0 ? 'text-success-400' : 'text-white'}`}>
                  {countdown === 0 ? 'Temps minimum atteint' : 'Patientez le temps requis'}
                </p>
                <p className="text-dark-500 text-sm">
                  {countdown === 0
                    ? `Durée de ${activeSession.minDurationSeconds}s respectée ✓`
                    : `Temps minimum : ${activeSession.minDurationSeconds} secondes`}
                </p>
              </div>
              {countdown > 0 ? (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-800/50 border border-white/[0.06]">
                  <Timer className="w-4 h-4 text-accent-400 animate-pulse" />
                  <span className="text-accent-400 font-mono font-bold text-lg">{countdown}s</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-success-500/10 border border-success-500/30">
                  <CheckCircle className="w-4 h-4 text-success-400" />
                  <span className="text-success-400 font-medium text-sm">OK</span>
                </div>
              )}
            </div>
          </div>

          {/* Reward + complete */}
          <div className="flex items-center justify-between pt-4 border-t border-white/[0.06]">
            <div>
              <p className="text-dark-400 text-sm">Récompense</p>
              <p className="text-accent-400 font-bold text-xl">
                {Number(activeSession.task.reward).toLocaleString('fr-FR')} FCFA
              </p>
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
        </motion.div>
      </div>
    );
  }

  // Task list
  return (
    <div className="space-y-6">
      <MotionDiv preset="fadeUp">
        <h1 className="heading-lg">Tâches disponibles</h1>
        <p className="text-dark-400 mt-1">Complétez des tâches pour gagner de l&apos;argent</p>
      </MotionDiv>

      {tasks.length === 0 ? (
        <MotionDiv preset="fadeUp" delay={0.1}>
          <div className="card text-center py-16">
            <div className="empty-state">
              <div className="empty-state-icon">
                <ListTodo className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Aucune tâche disponible</h3>
              <p className="text-dark-400 text-sm max-w-sm">
                De nouvelles tâches sont ajoutées régulièrement. Revenez bientôt !
              </p>
            </div>
          </div>
        </MotionDiv>
      ) : (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid gap-3"
        >
          {tasks.map((task) => {
            const isDone = completedIds.has(task.id);
            const typeColor =
              TYPE_COLORS[task.type] || 'from-primary-500/20 to-primary-500/5 text-primary-400';
            return (
              <motion.div key={task.id} variants={staggerItem}>
                <div
                  className={`card-hover group flex flex-col sm:flex-row sm:items-center gap-4 ${isDone ? 'opacity-70' : ''}`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 bg-gradient-to-br ${isDone ? 'from-success-500/20 to-success-500/5' : typeColor.split(' ').slice(0, 2).join(' ')}`}
                    >
                      {isDone ? (
                        <CheckCircle className="w-6 h-6 text-success-400" />
                      ) : (
                        TYPE_ICONS[task.type] || '📌'
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-white truncate">{task.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`badge ${task.type === 'SPONSORED' ? 'badge-accent' : task.type === 'VIDEO_AD' ? 'badge-danger' : 'badge-primary'}`}
                        >
                          {TYPE_LABELS[task.type] || task.type}
                        </span>
                        {task.externalUrl && (
                          <span className="text-xs text-dark-500 flex items-center gap-1">
                            <ExternalLink className="w-3 h-3" /> Lien
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <span className="text-accent-400 font-bold">
                      {Number(task.reward).toLocaleString('fr-FR')} FCFA
                    </span>
                    {isDone ? (
                      <span className="badge-success px-4 py-2">Complétée ✓</span>
                    ) : (
                      <button
                        onClick={() => handleStart(task.id)}
                        disabled={starting === task.id}
                        className="btn-primary btn-sm flex items-center gap-2"
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
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
