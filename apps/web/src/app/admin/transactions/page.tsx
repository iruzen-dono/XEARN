'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';

export default function AdminTransactionsPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const s = await adminApi.getWalletStats(token) as any;
        setStats(s);
      } catch (err) {
        console.error('Erreur chargement stats:', err);
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
      <h1 className="text-3xl font-bold mb-2">Transactions</h1>
      <p className="text-dark-400 mb-8">Vue d&apos;ensemble financière</p>

      {/* Financial stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="text-dark-400 text-sm mb-2">Volume total</div>
          <div className="text-2xl font-bold text-primary-400">{fmt(stats?.totalVolume)} FCFA</div>
        </div>
        <div className="card">
          <div className="text-dark-400 text-sm mb-2">Total retiré</div>
          <div className="text-2xl font-bold text-blue-400">{fmt(stats?.totalWithdrawn)} FCFA</div>
        </div>
        <div className="card">
          <div className="text-dark-400 text-sm mb-2">Retraits en attente</div>
          <div className="text-2xl font-bold text-yellow-400">{fmt(stats?.pendingWithdrawals)} FCFA</div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Détail des transactions</h2>
        <p className="text-dark-400 text-center py-8">
          Les transactions détaillées seront disponibles dans une prochaine mise à jour.<br />
          Utilisez Prisma Studio pour consulter les données : <code className="text-primary-400">npm run db:studio</code>
        </p>
      </div>
    </div>
  );
}
