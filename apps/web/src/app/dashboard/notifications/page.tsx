'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, CheckCheck, Check } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { notificationsApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import { MotionDiv } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export default function NotificationsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = useCallback(async (p: number) => {
    if (!token) return;
    try {
      const data = await notificationsApi.getAll(token, p) as any;
      setNotifications(data.notifications || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erreur chargement notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications(page);
  }, [fetchNotifications, page]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;
    try {
      await notificationsApi.markAsRead(token, id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n)),
      );
    } catch {
      toast.error('Erreur lors du marquage');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;
    try {
      await notificationsApi.markAllAsRead(token);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success('Toutes les notifications ont été lues');
    } catch {
      toast.error('Erreur');
    }
  };

  const totalPages = Math.ceil(total / 20);

  const typeColor: Record<string, string> = {
    WELCOME: 'text-primary-400 bg-gradient-to-br from-primary-500/20 to-primary-500/5',
    TASK_COMPLETED: 'text-success-400 bg-gradient-to-br from-success-500/20 to-success-500/5',
    COMMISSION_RECEIVED: 'text-accent-400 bg-gradient-to-br from-accent-500/20 to-accent-500/5',
    WITHDRAWAL_APPROVED: 'text-success-400 bg-gradient-to-br from-success-500/20 to-success-500/5',
    WITHDRAWAL_REJECTED: 'text-danger-400 bg-gradient-to-br from-danger-500/20 to-danger-500/5',
    ACCOUNT_ACTIVATED: 'text-primary-400 bg-gradient-to-br from-primary-500/20 to-primary-500/5',
    NEW_REFERRAL: 'text-accent-400 bg-gradient-to-br from-accent-500/20 to-accent-500/5',
    SYSTEM: 'text-dark-400 bg-white/[0.04]',
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <MotionDiv preset="fadeUp">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="heading-lg">Notifications</h1>
            <p className="text-dark-400 mt-1">{total} notification{total !== 1 ? 's' : ''}</p>
          </div>
          {notifications.some((n) => !n.read) && (
            <motion.button whileTap={{ scale: 0.97 }} onClick={handleMarkAllAsRead}
              className="btn-primary flex items-center gap-2 text-sm">
              <CheckCheck className="w-4 h-4" /> Tout marquer comme lu
            </motion.button>
          )}
        </div>
      </MotionDiv>

      {notifications.length === 0 ? (
        <MotionDiv preset="fadeUp" delay={0.1}>
          <div className="card">
            <div className="empty-state">
              <div className="empty-state-icon"><Bell className="w-8 h-8" /></div>
              <h3 className="text-base font-semibold mb-1">Aucune notification</h3>
              <p className="text-dark-400 text-sm">Vos notifications apparaîtront ici.</p>
            </div>
          </div>
        </MotionDiv>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {notifications.map((n, i) => (
              <motion.div key={n.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -40, transition: { duration: 0.2 } }}
                transition={{ delay: i * 0.03, type: 'spring', stiffness: 300, damping: 30 }}
                className={`card flex items-start gap-4 transition-all ${!n.read ? 'border-primary-500/30 shadow-glow' : 'opacity-60'}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${typeColor[n.type] || typeColor.SYSTEM}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-white">{n.title}</span>
                    {!n.read && (
                      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                        className="w-2 h-2 bg-primary-400 rounded-full shadow-[0_0_6px_2px_rgba(99,102,241,0.5)]" />
                    )}
                  </div>
                  <p className="text-dark-400 text-sm">{n.message}</p>
                  <div className="text-dark-500 text-xs mt-1">
                    {new Date(n.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric', month: 'long', year: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </div>
                </div>
                {!n.read && (
                  <motion.button whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                    onClick={() => handleMarkAsRead(n.id)}
                    className="p-2 text-dark-500 hover:text-primary-400 transition-colors shrink-0 rounded-lg hover:bg-primary-500/10"
                    title="Marquer comme lu"
                  >
                    <Check className="w-4 h-4" />
                  </motion.button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <MotionDiv preset="fadeUp" delay={0.2}>
          <div className="flex items-center justify-center gap-3 mt-4">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm disabled:opacity-30 hover:bg-white/[0.08] transition-colors font-medium">
              Précédent
            </button>
            <span className="text-dark-400 text-sm font-medium tabular-nums">
              Page {page} / {totalPages}
            </span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] text-sm disabled:opacity-30 hover:bg-white/[0.08] transition-colors font-medium">
              Suivant
            </button>
          </div>
        </MotionDiv>
      )}
    </div>
  );
}
