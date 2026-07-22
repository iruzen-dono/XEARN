'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ScrollText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  Clock,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { MotionDiv, staggerContainer, staggerItem } from '@/components/ui';

type LogEntry = {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  target: string;
  details: string | null;
  createdAt: string;
};

type LogsResponse = {
  logs: LogEntry[];
  total: number;
  page: number;
  pages: number;
};

const actionLabels: Record<string, string> = {
  ALL: 'Toutes les actions',
  USER_CREATED: 'Création utilisateur',
  USER_SUSPENDED: 'Suspension',
  USER_BANNED: 'Bannissement',
  USER_ACTIVATED: 'Activation',
  USER_UNSUSPENDED: 'Réactivation',
  WITHDRAWAL_APPROVED: 'Approbation retrait',
  WITHDRAWAL_REJECTED: 'Rejet retrait',
  TASK_CREATED: 'Création tâche',
  TASK_UPDATED: 'Modification tâche',
  TASK_DELETED: 'Suppression tâche',
  TASK_TOGGLED: 'Activation/Désactivation tâche',
  AD_APPROVED: 'Approbation pub',
  AD_REJECTED: 'Rejet pub',
  LOGIN: 'Connexion admin',
};

const actionColors: Record<string, string> = {
  ALL: 'bg-dark-800 text-dark-400 border-dark-700',
  USER_CREATED: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  USER_SUSPENDED: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  USER_BANNED: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  USER_ACTIVATED: 'bg-success-500/10 text-success-400 border-success-500/20',
  USER_UNSUSPENDED: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  WITHDRAWAL_APPROVED: 'bg-success-500/10 text-success-400 border-success-500/20',
  WITHDRAWAL_REJECTED: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  TASK_CREATED: 'bg-accent-500/10 text-accent-400 border-accent-500/20',
  TASK_UPDATED: 'bg-primary-500/10 text-primary-400 border-primary-500/20',
  TASK_DELETED: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  TASK_TOGGLED: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  AD_APPROVED: 'bg-success-500/10 text-success-400 border-success-500/20',
  AD_REJECTED: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
  LOGIN: 'bg-dark-700 text-dark-300 border-dark-600',
};

const actionIcon: Record<string, string> = {
  USER_CREATED: '👤',
  USER_SUSPENDED: '⚠️',
  USER_BANNED: '🚫',
  USER_ACTIVATED: '✅',
  USER_UNSUSPENDED: '🔄',
  WITHDRAWAL_APPROVED: '💰',
  WITHDRAWAL_REJECTED: '❌',
  TASK_CREATED: '📝',
  TASK_UPDATED: '✏️',
  TASK_DELETED: '🗑️',
  TASK_TOGGLED: '⚙️',
  AD_APPROVED: '📢',
  AD_REJECTED: '🚷',
  LOGIN: '🔑',
};

export default function AdminLogsPage() {
  const { token } = useAuth();

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  const availableActions = Object.keys(actionLabels);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = (await adminApi.getLogs(
        token,
        page,
        actionFilter === 'ALL' ? undefined : actionFilter,
      )) as LogsResponse;
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || Math.ceil((data.total || 0) / 20));
    } catch (err) {
      console.error('Erreur chargement logs:', err);
      // Ne pas afficher de toast pour éviter le spam si l'endpoint n'existe pas encore
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [token, page, actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const fmtDateTime = (d: string) => {
    const date = new Date(d);
    return {
      date: date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      time: date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    };
  };

  const fmtDateShort = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const getActionStyle = (action: string) => {
    return actionColors[action] || 'bg-dark-800 text-dark-400 border-dark-700';
  };

  return (
    <div>
      {/* Header */}
      <MotionDiv preset="fadeUp">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <ScrollText className="w-6 h-6 text-primary-400" />
            <h1 className="heading-lg">Audit Logs</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <span className="font-medium text-dark-300">{total}</span>
            <span>entrée{total > 1 ? 's' : ''}</span>
          </div>
        </div>
      </MotionDiv>

      {/* Action filter buttons */}
      <MotionDiv preset="fadeUp" delay={0.05}>
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white border border-dark-700 transition-colors text-sm sm:hidden"
            >
              <Filter className="w-4 h-4" />
              Filtrer
            </button>
            <div className={`flex gap-2 flex-wrap ${showFilters ? 'flex' : 'hidden sm:flex'}`}>
              {availableActions.map((a) => (
                <button
                  key={a}
                  onClick={() => {
                    setActionFilter(a);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    actionFilter === a
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-glow'
                      : 'bg-dark-800 text-dark-400 hover:text-white border border-dark-700 hover:border-dark-600'
                  }`}
                >
                  {actionLabels[a] || a.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Logs Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : logs.length === 0 ? (
        <MotionDiv preset="fadeUp" delay={0.1}>
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <ScrollText className="w-12 h-12 text-dark-600 mb-3" />
            <p className="text-dark-400 font-medium">Aucun log disponible</p>
            <p className="text-dark-500 text-sm mt-1">
              Les actions d'administration apparaîtront ici
            </p>
          </div>
        </MotionDiv>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="card overflow-x-auto p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-800 text-dark-400 text-left">
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">
                    Admin
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">
                    Cible
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">
                    Détails
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell text-right">
                    Heure
                  </th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => {
                  const dt = fmtDateTime(log.createdAt);
                  return (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.02 }}
                      className="border-b border-dark-800/50 last:border-0 hover:bg-dark-800/30 transition-colors"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-dark-500 flex-shrink-0" />
                          <span className="text-dark-300 text-xs font-medium">{dt.date}</span>
                        </div>
                        <div className="text-dark-600 text-[10px] sm:hidden mt-0.5">{dt.time}</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/10 flex items-center justify-center text-[10px] font-bold text-primary-300 flex-shrink-0">
                            {log.adminName
                              ?.split(' ')
                              .map((n) => n[0])
                              .join('')}
                          </div>
                          <span className="text-white text-sm font-medium truncate max-w-[130px]">
                            {log.adminName}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium inline-flex items-center gap-1.5 ${getActionStyle(log.action)}`}
                        >
                          <span>{actionIcon[log.action] || '🔹'}</span>
                          <span className="hidden sm:inline">
                            {actionLabels[log.action] || log.action.replace(/_/g, ' ')}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-dark-300 hidden md:table-cell max-w-[200px]">
                        <span className="truncate block">{log.target}</span>
                      </td>
                      <td className="px-4 py-3.5 text-dark-500 text-xs hidden lg:table-cell max-w-[250px]">
                        <span className="truncate block" title={log.details || ''}>
                          {log.details || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-dark-500 text-xs hidden sm:table-cell text-right whitespace-nowrap">
                        {fmtDateShort(log.createdAt)}
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-dark-500">
                Page {page} sur {totalPages}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Page précédente"
                  className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-dark-700"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                        page === pageNum
                          ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                          : 'bg-dark-800 text-dark-400 hover:text-white border border-dark-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Page suivante"
                  className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors border border-dark-700"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
