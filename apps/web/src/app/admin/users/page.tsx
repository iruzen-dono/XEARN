'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, Loader2, Shield, Ban, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';

const statuses = ['ALL', 'FREE', 'ACTIVATED', 'SUSPENDED', 'BANNED'];
const statusColors: Record<string, string> = {
  FREE: 'bg-gray-500/10 text-gray-400',
  ACTIVATED: 'bg-green-500/10 text-green-400',
  SUSPENDED: 'bg-yellow-500/10 text-yellow-400',
  BANNED: 'bg-red-500/10 text-red-400',
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getUsers(token, page, search || undefined, statusFilter) as any;
      setUsers(data.users || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page, search, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounce search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleAction = async (userId: string, action: 'activate' | 'suspend' | 'ban') => {
    if (!token) return;
    setActionLoading(userId);
    try {
      if (action === 'activate') await adminApi.reactivateUser(token, userId);
      else if (action === 'suspend') await adminApi.suspendUser(token, userId);
      else await adminApi.banUser(token, userId);
      await fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const totalPages = Math.ceil(total / 20);
  const fmtDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold">Utilisateurs</h1>
        <div className="text-dark-400 text-sm">{total} utilisateur{total > 1 ? 's' : ''}</div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-500" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, téléphone..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-dark-800 border border-dark-700 rounded-xl text-sm focus:border-primary-500 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {statuses.map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'bg-dark-800 text-dark-400 hover:text-white border border-dark-700'
                }`}
              >
                {s === 'ALL' ? 'Tous' : s}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary-400" /></div>
      ) : users.length === 0 ? (
        <div className="card text-center text-dark-400 py-12">Aucun utilisateur trouvé</div>
      ) : (
        <>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-800 text-dark-400 text-left">
                  <th className="pb-3 font-medium">Utilisateur</th>
                  <th className="pb-3 font-medium hidden sm:table-cell">Email</th>
                  <th className="pb-3 font-medium hidden md:table-cell">Téléphone</th>
                  <th className="pb-3 font-medium">Statut</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Solde</th>
                  <th className="pb-3 font-medium hidden lg:table-cell">Inscrit le</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-dark-800/50 last:border-0 hover:bg-dark-800/30">
                    <td className="py-3">
                      <div className="font-medium">{u.firstName} {u.lastName}</div>
                      <div className="text-dark-500 text-xs sm:hidden">{u.email}</div>
                    </td>
                    <td className="py-3 text-dark-400 hidden sm:table-cell">{u.email}</td>
                    <td className="py-3 text-dark-400 hidden md:table-cell">{u.phone || '—'}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${statusColors[u.status] || 'bg-dark-800 text-dark-400'}`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 text-dark-300 hidden lg:table-cell">
                      {u.wallet ? `${Number(u.wallet.balance).toLocaleString('fr-FR')} F` : '—'}
                    </td>
                    <td className="py-3 text-dark-500 hidden lg:table-cell">{fmtDate(u.createdAt)}</td>
                    <td className="py-3 text-right">
                      {actionLoading === u.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-dark-400 inline" />
                      ) : u.role === 'ADMIN' ? (
                        <span className="text-xs text-primary-400 font-medium">Admin</span>
                      ) : (
                        <div className="flex gap-1 justify-end">
                          {u.status !== 'ACTIVATED' && (
                            <button onClick={() => handleAction(u.id, 'activate')} title="Activer"
                              className="p-1.5 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors">
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
                          {u.status !== 'SUSPENDED' && (
                            <button onClick={() => handleAction(u.id, 'suspend')} title="Suspendre"
                              className="p-1.5 rounded-lg text-yellow-400 hover:bg-yellow-500/10 transition-colors">
                              <Shield className="w-4 h-4" />
                            </button>
                          )}
                          {u.status !== 'BANNED' && (
                            <button onClick={() => handleAction(u.id, 'ban')} title="Bannir"
                              className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                              <Ban className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-dark-400">Page {page} / {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
