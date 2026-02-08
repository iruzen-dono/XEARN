'use client';

import { useEffect, useState } from 'react';
import { Users, Wallet, TrendingUp, Loader2, DollarSign, ArrowUpRight, BarChart3, ListTodo } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [s, ws, an] = await Promise.all([
          adminApi.getUserStats(token) as any,
          adminApi.getWalletStats(token).catch(() => null) as any,
          adminApi.getAnalytics(token).catch(() => null) as any,
        ]);
        setStats(s);
        setWalletStats(ws);
        setAnalytics(an);
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

  const maxReg = analytics?.registrations?.length
    ? Math.max(...analytics.registrations.map((r: any) => r.count), 1)
    : 1;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Dashboard Admin</h1>

      {/* KPI Cards Row 1 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Utilisateurs</span>
            <Users className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(stats?.totalUsers)}</div>
          <div className="text-dark-500 text-sm mt-1">{fmt(stats?.activeUsers)} activés</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Revenus</span>
            <DollarSign className="w-5 h-5 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400">{fmt(walletStats?.totalRevenue)}</div>
          <div className="text-dark-500 text-sm mt-1">FCFA (activations)</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Retraits versés</span>
            <ArrowUpRight className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(walletStats?.totalWithdrawals)}</div>
          <div className="text-dark-500 text-sm mt-1">FCFA</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">En attente</span>
            <Wallet className="w-5 h-5 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400">{fmt(walletStats?.pendingWithdrawals)}</div>
          <div className="text-dark-500 text-sm mt-1">retraits à traiter</div>
        </div>
      </div>

      {/* KPI Row 2 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Suspendus</span>
            <Users className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-2xl font-bold text-yellow-400">{fmt(stats?.suspendedUsers)}</div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Bannis</span>
            <Users className="w-5 h-5 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-500">{fmt(stats?.bannedUsers)}</div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Solde wallets</span>
            <Wallet className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold text-blue-400">{fmt(walletStats?.totalBalance)}</div>
          <div className="text-dark-500 text-sm mt-1">FCFA</div>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <span className="text-dark-400 text-xs uppercase tracking-wide">Transactions</span>
            <BarChart3 className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(walletStats?.totalTransactions)}</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Inscriptions Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            Inscriptions (30 jours)
          </h2>
          {analytics?.registrations?.length > 0 ? (
            <div className="flex items-end gap-1 h-40">
              {analytics.registrations.map((r: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-dark-500">{r.count > 0 ? r.count : ''}</span>
                  <div
                    className="w-full bg-primary-500/80 rounded-t min-h-[2px] transition-all"
                    style={{ height: `${(r.count / maxReg) * 100}%` }}
                  />
                  {i % 7 === 0 && (
                    <span className="text-[9px] text-dark-600 mt-1">
                      {new Date(r.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                    </span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-dark-500 text-center py-8">Aucune inscription récente</div>
          )}
        </div>

        {/* Top Parrains */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-400" />
            Top 10 Parrains
          </h2>
          {analytics?.topReferrers?.length > 0 ? (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {analytics.topReferrers.map((r: any, i: number) => (
                <div key={r.id} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      i < 3 ? 'bg-primary-500/20 text-primary-400' : 'bg-dark-800 text-dark-400'
                    }`}>{i + 1}</span>
                    <div>
                      <div className="font-medium text-sm">{r.name}</div>
                      <div className="text-dark-500 text-xs">{r.email}</div>
                    </div>
                  </div>
                  <span className="text-primary-400 font-semibold text-sm">{r.referrals} filleuls</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-dark-500 text-center py-8">Aucun parrain</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tâches */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ListTodo className="w-5 h-5 text-blue-400" />
            Top Tâches
          </h2>
          {analytics?.topTasks?.length > 0 ? (
            <div className="space-y-2">
              {analytics.topTasks.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-dark-800 last:border-0">
                  <div>
                    <div className="font-medium text-sm">{t.title}</div>
                    <div className="text-dark-500 text-xs">{t.type} — {Number(t.reward)} FCFA</div>
                  </div>
                  <span className="text-blue-400 font-semibold text-sm">{t.completionCount}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-dark-500 text-center py-8">Aucune tâche</div>
          )}
        </div>

        {/* Tâches par type */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Tâches par type
          </h2>
          {analytics?.tasksByType?.length > 0 ? (
            <div className="space-y-3">
              {analytics.tasksByType.map((t: any) => {
                const total = analytics.tasksByType.reduce((a: number, b: any) => a + b.count, 0);
                const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                const colors: Record<string, string> = {
                  VIDEO_AD: 'bg-red-500', CLICK_AD: 'bg-blue-500', SURVEY: 'bg-green-500', SPONSORED: 'bg-purple-500',
                };
                return (
                  <div key={t.type}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-dark-300">{t.type.replace('_', ' ')}</span>
                      <span className="text-dark-400">{t.count} ({pct}%)</span>
                    </div>
                    <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${colors[t.type] || 'bg-primary-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-dark-500 text-center py-8">Aucune donnée</div>
          )}
        </div>
      </div>
    </div>
  );
}
