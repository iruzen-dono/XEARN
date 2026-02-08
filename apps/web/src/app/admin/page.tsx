'use client';

import { useEffect, useState } from 'react';
import { Users, Wallet, ListTodo, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [s, u, ws] = await Promise.all([
          adminApi.getUserStats(token) as any,
          adminApi.getUsers(token, 1) as any,
          adminApi.getWalletStats(token).catch(() => null) as any,
        ]);
        setStats(s);
        setUsers((u?.users || []).slice(0, 5));
        setWalletStats(ws);
      } catch (err) {
        console.error('Erreur admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Admin</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Utilisateurs</span>
            <Users className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(stats?.totalUsers)}</div>
          <div className="text-dark-500 text-sm mt-1">Total inscrits</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Comptes activés</span>
            <TrendingUp className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(stats?.activeUsers)}</div>
          <div className="text-dark-500 text-sm mt-1">Payants</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Volume total</span>
            <ListTodo className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(walletStats?.totalVolume)} FCFA</div>
          <div className="text-dark-500 text-sm mt-1">Transactions</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Retraits en attente</span>
            <Wallet className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(walletStats?.pendingWithdrawals)}</div>
          <div className="text-dark-500 text-sm mt-1">À traiter</div>
        </div>
      </div>

      {/* Recent users */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Derniers inscrits</h2>
        {users.length === 0 ? (
          <div className="text-dark-400 text-center py-8">Aucun utilisateur pour le moment.</div>
        ) : (
          <div className="space-y-3">
            {users.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                <div>
                  <div className="font-medium">{u.firstName} {u.lastName}</div>
                  <div className="text-dark-500 text-sm">{u.email}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full ${u.status === 'ACTIVATED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {u.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
