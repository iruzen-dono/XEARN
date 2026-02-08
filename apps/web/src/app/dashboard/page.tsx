'use client';

import { useEffect, useState } from 'react';
import { Wallet, Users, ListTodo, TrendingUp, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { walletApi, tasksApi, referralsApi } from '@/lib/api';

export default function DashboardPage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const [wallet, setWallet] = useState<any>(null);
  const [taskCount, setTaskCount] = useState(0);
  const [referralCount, setReferralCount] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [w, completions, refs, txs] = await Promise.all([
          walletApi.get(token) as any,
          tasksApi.getMyCompletions(token) as any,
          referralsApi.getTree(token).catch(() => ({ referrals: [] })) as any,
          walletApi.getTransactions(token, 1) as any,
        ]);
        setWallet(w);
        setTaskCount(Array.isArray(completions) ? completions.length : 0);
        setReferralCount(Array.isArray(refs?.referrals) ? refs.referrals.length : (Array.isArray(refs) ? refs.length : 0));
        setTransactions(txs?.transactions?.slice(0, 5) || []);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleActivate = async () => {
    if (!token) return;
    setActivating(true);
    try {
      await walletApi.activate(token);
      // Refresh data
      const w = await walletApi.get(token) as any;
      setWallet(w);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

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
      <h1 className="text-3xl font-bold mb-2">Tableau de bord</h1>
      <p className="text-dark-400 mb-8">Bienvenue, {user?.firstName} !</p>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Solde</span>
            <Wallet className="w-5 h-5 text-primary-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(wallet?.balance)} FCFA</div>
          <div className="text-dark-500 text-sm mt-1">Portefeuille actuel</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Total gagné</span>
            <TrendingUp className="w-5 h-5 text-accent-400" />
          </div>
          <div className="text-2xl font-bold">{fmt(wallet?.totalEarned)} FCFA</div>
          <div className="text-dark-500 text-sm mt-1">Depuis l&apos;inscription</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Tâches</span>
            <ListTodo className="w-5 h-5 text-blue-400" />
          </div>
          <div className="text-2xl font-bold">{taskCount}</div>
          <div className="text-dark-500 text-sm mt-1">Tâches complétées</div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-dark-400 text-sm">Filleuls</span>
            <Users className="w-5 h-5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold">{referralCount}</div>
          <div className="text-dark-500 text-sm mt-1">Parrainages actifs</div>
        </div>
      </div>

      {/* Account status */}
      {user?.status !== 'ACTIVATED' && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Statut du compte</h2>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse" />
            <span className="text-dark-300">
              Compte gratuit — Activez votre compte pour débloquer les retraits et le parrainage
            </span>
          </div>
          <button onClick={handleActivate} disabled={activating} className="btn-primary mt-4 disabled:opacity-50">
            {activating ? 'Activation...' : 'Activer mon compte (4 000 FCFA)'}
          </button>
        </div>
      )}

      {user?.status === 'ACTIVATED' && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Statut du compte</h2>
          <div className="flex items-center gap-4">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-green-400">Compte activé — Tous les services sont disponibles</span>
          </div>
        </div>
      )}

      {/* Recent activity */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Activité récente</h2>
        {transactions.length === 0 ? (
          <div className="text-dark-400 text-center py-8">
            Aucune activité pour le moment. Commencez par compléter des tâches !
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                <div>
                  <div className="font-medium">{tx.description || tx.type}</div>
                  <div className="text-dark-500 text-sm">{new Date(tx.createdAt).toLocaleDateString('fr-FR')}</div>
                </div>
                <span className={tx.type === 'WITHDRAWAL' ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                  {tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)} FCFA
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
