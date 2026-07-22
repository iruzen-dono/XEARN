'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Loader2,
  Shield,
  Ban,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  RotateCcw,
  Users as UsersIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';
import { MotionDiv, staggerContainer, staggerItem } from '@/components/ui';
import type { User } from '@/types';

interface UserWithWallet extends User {
  wallet?: { balance: string } | null;
}

interface AdminUsersResponse {
  users?: UserWithWallet[];
  total?: number;
  page?: number;
  pages?: number;
}

const statuses = ['ALL', 'FREE', 'ACTIVATED', 'SUSPENDED', 'BANNED'];

const statusColors: Record<string, string> = {
  FREE: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  ACTIVATED: 'bg-success-500/10 text-success-400 border-success-500/20',
  SUSPENDED: 'bg-warning-500/10 text-warning-400 border-warning-500/20',
  BANNED: 'bg-danger-500/10 text-danger-400 border-danger-500/20',
};

const statusLabels: Record<string, string> = {
  ALL: 'Tous',
  FREE: 'Gratuit',
  ACTIVATED: 'Activé',
  SUSPENDED: 'Suspendu',
  BANNED: 'Banni',
};

const tierBadgeColors: Record<string, string> = {
  NORMAL: 'bg-dark-700 text-dark-400 border-dark-600',
  PREMIUM:
    'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border-purple-500/30',
  VIP: 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-amber-400 border-amber-500/30',
};

const tierLabels: Record<string, string> = {
  NORMAL: 'Standard',
  PREMIUM: 'Premium',
  VIP: 'VIP',
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const toast = useToast();

  const [users, setUsers] = useState<UserWithWallet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: 'suspend' | 'ban' | 'activate';
  } | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = (await adminApi.getUsers(
        token,
        page,
        search || undefined,
        statusFilter === 'ALL' ? undefined : statusFilter,
      )) as AdminUsersResponse;
      setUsers(data.users || []);
      setTotal(data.total || 0);
      setTotalPages(data.pages || Math.ceil((data.total || 0) / 20));
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
      toast.error('Impossible de charger les utilisateurs');
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const executeAction = async () => {
    if (!token || !confirmAction) return;
    const { userId, action } = confirmAction;

    setActionLoading(userId);
    setConfirmAction(null);
    try {
      if (action === 'activate') {
        await adminApi.reactivateUser(token, userId);
        toast.success('Utilisateur activé avec succès');
      } else if (action === 'suspend') {
        await adminApi.suspendUser(token, userId);
        toast.success('Utilisateur suspendu');
      } else {
        await adminApi.banUser(token, userId);
        toast.success('Utilisateur banni');
      }
      await fetchUsers();
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setActionLoading(null);
    }
  };

  const handleAction = (
    userId: string,
    userName: string,
    action: 'activate' | 'suspend' | 'ban',
  ) => {
    setConfirmAction({ userId, userName, action });
  };

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const confirmMessages: Record<string, { title: string; description: string; color: string }> = {
    activate: {
      title: 'Activer le compte',
      description: "L'utilisateur pourra de nouveau accéder à toutes les fonctionnalités.",
      color: 'border-success-500/30 bg-success-500/10',
    },
    suspend: {
      title: 'Suspendre le compte',
      description:
        "L'utilisateur perdra temporairement l'accès à son compte. Cette action est réversible.",
      color: 'border-warning-500/30 bg-warning-500/10',
    },
    ban: {
      title: 'Bannir le compte',
      description:
        "L'utilisateur sera définitivement exclu de la plateforme. Cette action est irréversible.",
      color: 'border-danger-500/30 bg-danger-500/10',
    },
  };

  return (
    <div>
      {/* Header */}
      <MotionDiv preset="fadeUp">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <UsersIcon className="w-6 h-6 text-primary-400" />
            <h1 className="heading-lg">Utilisateurs</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-dark-400">
            <span className="font-medium text-dark-300">{total}</span>
            <span>utilisateur{total > 1 ? 's' : ''}</span>
          </div>
        </div>
      </MotionDiv>

      {/* Filters */}
      <MotionDiv preset="fadeUp" delay={0.05}>
        <div className="card mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
              <input
                type="text"
                placeholder="Rechercher par nom, email, téléphone..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm placeholder:text-dark-500 focus:border-primary-500 focus:outline-none transition-colors text-white"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {statuses.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setStatusFilter(s);
                    setPage(1);
                  }}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    statusFilter === s
                      ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30 shadow-glow'
                      : 'bg-dark-800 text-dark-400 hover:text-white border border-dark-700 hover:border-dark-600'
                  }`}
                >
                  {statusLabels[s] || s}
                </button>
              ))}
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
        </div>
      ) : users.length === 0 ? (
        <MotionDiv preset="fadeUp" delay={0.1}>
          <div className="card flex flex-col items-center justify-center py-16 text-center">
            <UsersIcon className="w-12 h-12 text-dark-600 mb-3" />
            <p className="text-dark-400 font-medium">Aucun utilisateur trouvé</p>
            <p className="text-dark-500 text-sm mt-1">
              Essayez de modifier vos filtres de recherche
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
                    Utilisateur
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden sm:table-cell">
                    Email
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden md:table-cell">
                    Téléphone
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider">
                    Statut
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">
                    Tier
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">
                    Solde
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider hidden lg:table-cell">
                    Inscrit le
                  </th>
                  <th className="px-4 py-3.5 font-semibold text-xs uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-dark-800/50 last:border-0 hover:bg-dark-800/30 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500/20 to-accent-500/10 flex items-center justify-center text-xs font-bold text-primary-300 flex-shrink-0">
                          {u.firstName?.charAt(0)}
                          {u.lastName?.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium text-white truncate max-w-[160px]">
                            {u.firstName} {u.lastName}
                          </div>
                          <div className="text-dark-500 text-xs sm:hidden">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-dark-300 hidden sm:table-cell">
                      <span className="truncate max-w-[180px] block">{u.email || '—'}</span>
                    </td>
                    <td className="px-4 py-3.5 text-dark-400 hidden md:table-cell">
                      {u.phone || '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColors[u.status] || 'bg-dark-800 text-dark-400 border-dark-700'}`}
                      >
                        {statusLabels[u.status] || u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 hidden lg:table-cell">
                      <span
                        className={`text-xs px-2 py-0.5 rounded border font-medium ${
                          tierBadgeColors[u.tier] || 'bg-dark-700 text-dark-400 border-dark-600'
                        }`}
                      >
                        {tierLabels[u.tier] || u.tier}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-dark-300 font-mono text-sm hidden lg:table-cell">
                      {u.wallet ? `${Number(u.wallet.balance).toLocaleString('fr-FR')} FCFA` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-dark-500 text-xs hidden lg:table-cell">
                      {fmtDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex gap-1 justify-end">
                        {actionLoading === u.id ? (
                          <Loader2 className="w-4 h-4 animate-spin text-dark-400 mx-auto" />
                        ) : u.role === 'ADMIN' ? (
                          <span className="text-xs px-2 py-1 rounded-lg bg-primary-500/10 text-primary-400 border border-primary-500/20 font-medium">
                            Admin
                          </span>
                        ) : (
                          <>
                            {u.status !== 'ACTIVATED' && (
                              <button
                                onClick={() =>
                                  handleAction(u.id, `${u.firstName} ${u.lastName}`, 'activate')
                                }
                                title="Activer"
                                aria-label="Activer l'utilisateur"
                                className="p-1.5 rounded-lg text-success-400 hover:bg-success-500/10 transition-colors disabled:opacity-30"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                            {u.status !== 'SUSPENDED' && (
                              <button
                                onClick={() =>
                                  handleAction(u.id, `${u.firstName} ${u.lastName}`, 'suspend')
                                }
                                title="Suspendre"
                                aria-label="Suspendre l'utilisateur"
                                className="p-1.5 rounded-lg text-warning-400 hover:bg-warning-500/10 transition-colors disabled:opacity-30"
                              >
                                <ShieldAlert className="w-4 h-4" />
                              </button>
                            )}
                            {u.status !== 'BANNED' && (
                              <button
                                onClick={() =>
                                  handleAction(u.id, `${u.firstName} ${u.lastName}`, 'ban')
                                }
                                title="Bannir"
                                aria-label="Bannir l'utilisateur"
                                className="p-1.5 rounded-lg text-danger-400 hover:bg-danger-500/10 transition-colors disabled:opacity-30"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-dark-500">
                Page {page} sur {totalPages}
                <span className="ml-2 text-dark-600">
                  ({total} résultat{total > 1 ? 's' : ''})
                </span>
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

      {/* Confirmation Dialog */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setConfirmAction(null)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className={`relative w-full max-w-md rounded-2xl border p-6 ${
              confirmMessages[confirmAction.action].color
            } bg-dark-900`}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              {confirmMessages[confirmAction.action].title}
            </h3>
            <p className="text-dark-300 text-sm mb-2">
              {confirmMessages[confirmAction.action].description}
            </p>
            <div className="bg-dark-850 rounded-xl px-4 py-3 mb-6 border border-white/[0.06]">
              <span className="text-dark-400 text-xs block mb-0.5">Utilisateur concerné</span>
              <span className="text-white font-medium text-sm">{confirmAction.userName}</span>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2.5 rounded-xl text-sm font-medium text-dark-300 hover:text-white bg-dark-800 hover:bg-dark-700 transition-colors border border-dark-700"
              >
                Annuler
              </button>
              <button
                onClick={executeAction}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  confirmAction.action === 'activate'
                    ? 'bg-success-500/20 text-success-400 border border-success-500/30 hover:bg-success-500/30'
                    : confirmAction.action === 'suspend'
                      ? 'bg-warning-500/20 text-warning-400 border border-warning-500/30 hover:bg-warning-500/30'
                      : 'bg-danger-500/20 text-danger-400 border border-danger-500/30 hover:bg-danger-500/30'
                }`}
              >
                {confirmAction.action === 'activate'
                  ? 'Activer'
                  : confirmAction.action === 'suspend'
                    ? 'Suspendre'
                    : 'Bannir'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
