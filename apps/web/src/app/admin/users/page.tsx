'use client';

import { useEffect, useState } from 'react';
import { Search, Loader2, Ban, PauseCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';

export default function AdminUsersPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchUsers = async (p = 1) => {
    if (!token) return;
    setLoading(true);
    try {
      const data = await adminApi.getUsers(token, p) as any;
      setUsers(data?.users || []);
      setTotal(data?.total || 0);
      setPage(p);
    } catch (err) {
      console.error('Erreur chargement utilisateurs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [token]);

  const handleSuspend = async (id: string) => {
    if (!token || !confirm('Suspendre cet utilisateur ?')) return;
    try {
      await adminApi.suspendUser(token, id);
      toast.success('Utilisateur suspendu');
      fetchUsers(page);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la suspension');
    }
  };

  const handleBan = async (id: string) => {
    if (!token || !confirm('Bannir cet utilisateur ? Cette action est irréversible.')) return;
    try {
      await adminApi.banUser(token, id);
      toast.success('Utilisateur banni');
      fetchUsers(page);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du bannissement');
    }
  };

  const filtered = search
    ? users.filter((u) =>
        `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Utilisateurs</h1>
          <p className="text-dark-400">Gérer les comptes utilisateurs ({total} total)</p>
        </div>
      </div>

      <div className="card mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="input-field pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary-400" />
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-left text-dark-400 text-sm font-medium p-4">Nom</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Email</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Statut</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Inscrit le</th>
                <th className="text-left text-dark-400 text-sm font-medium p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center text-dark-400 py-12">Aucun utilisateur trouvé.</td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="p-4 font-medium">{u.firstName} {u.lastName}</td>
                    <td className="p-4 text-dark-400">{u.email}</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        u.status === 'ACTIVATED' ? 'bg-green-500/10 text-green-400' :
                        u.status === 'SUSPENDED' ? 'bg-orange-500/10 text-orange-400' :
                        u.status === 'BANNED' ? 'bg-red-500/10 text-red-400' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-4 text-dark-400 text-sm">{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {u.status !== 'SUSPENDED' && u.role !== 'ADMIN' && (
                          <button onClick={() => handleSuspend(u.id)} className="text-orange-400 hover:text-orange-300 p-1" title="Suspendre">
                            <PauseCircle className="w-4 h-4" />
                          </button>
                        )}
                        {u.status !== 'BANNED' && u.role !== 'ADMIN' && (
                          <button onClick={() => handleBan(u.id)} className="text-red-400 hover:text-red-300 p-1" title="Bannir">
                            <Ban className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => fetchUsers(page - 1)} disabled={page <= 1} className="btn-secondary text-sm disabled:opacity-30">Précédent</button>
          <span className="text-dark-400 py-2 px-4">Page {page}</span>
          <button onClick={() => fetchUsers(page + 1)} disabled={page * 20 >= total} className="btn-secondary text-sm disabled:opacity-30">Suivant</button>
        </div>
      )}
    </div>
  );
}
