'use client';

import { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, Clock, CheckCircle2, XCircle, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { walletApi } from '@/lib/api';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  PENDING: { label: 'En attente', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20', icon: Clock },
  PROCESSING: { label: 'En cours', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Loader2 },
  COMPLETED: { label: 'Complété', color: 'text-green-400 bg-green-500/10 border-green-500/20', icon: CheckCircle2 },
  FAILED: { label: 'Échoué', color: 'text-red-400 bg-red-500/10 border-red-500/20', icon: XCircle },
  CANCELLED: { label: 'Annulé', color: 'text-dark-400 bg-dark-800 border-dark-700', icon: XCircle },
};

const METHOD_LABELS: Record<string, string> = {
  MTN_MOMO: 'MTN Mobile Money',
  FLOOZ: 'Moov Money (Flooz)',
  TMONEY: 'TMoney',
  ORANGE_MONEY: 'Orange Money',
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  PAYPAL: 'PayPal',
};

export default function WithdrawalsPage() {
  const { token } = useAuth();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWithdrawals = useCallback(async () => {
    if (!token) return;
    try {
      const data = await walletApi.getWithdrawals(token) as any;
      setWithdrawals(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement retraits:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    fetchWithdrawals();
  }, [fetchWithdrawals]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchWithdrawals();
  };

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  // Compute summary stats
  const totalCompleted = withdrawals
    .filter((w) => w.status === 'COMPLETED')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);
  const totalPending = withdrawals
    .filter((w) => w.status === 'PENDING' || w.status === 'PROCESSING')
    .reduce((sum, w) => sum + Number(w.amount || 0), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-52 bg-dark-800 rounded animate-pulse mb-2" />
        <div className="h-4 w-40 bg-dark-800 rounded animate-pulse mb-8" />
        <div className="grid md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-dark-800/50" />
          ))}
        </div>
        <div className="card">
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 bg-dark-800/50 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <Link
          href="/dashboard/wallet"
          className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Historique des retraits</h1>
          <p className="text-dark-400">Suivi de toutes vos demandes de retrait</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="ml-auto p-2 rounded-lg bg-dark-800 hover:bg-dark-700 transition-colors disabled:opacity-50"
          title="Actualiser"
        >
          <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card">
          <div className="text-dark-400 text-sm mb-1">Total retiré</div>
          <div className="text-2xl font-bold text-green-400">{fmt(totalCompleted)} FCFA</div>
        </div>
        <div className="card">
          <div className="text-dark-400 text-sm mb-1">En attente</div>
          <div className="text-2xl font-bold text-yellow-400">{fmt(totalPending)} FCFA</div>
        </div>
      </div>

      {/* List */}
      {withdrawals.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-dark-800 rounded-full flex items-center justify-center">
            <Clock className="w-8 h-8 text-dark-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucun retrait</h3>
          <p className="text-dark-400 text-sm max-w-xs mx-auto">
            Vous n&apos;avez pas encore effectué de demande de retrait.
          </p>
          <Link href="/dashboard/wallet" className="btn-primary mt-6 inline-block">
            Retour au portefeuille
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {withdrawals.map((w) => {
            const config = STATUS_CONFIG[w.status] || STATUS_CONFIG.PENDING;
            const Icon = config.icon;
            return (
              <div key={w.id} className="card flex items-center gap-4">
                <div className={`p-2 rounded-lg border ${config.color}`}>
                  <Icon className={`w-5 h-5 ${w.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{fmt(w.amount)} FCFA</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${config.color}`}>
                      {config.label}
                    </span>
                  </div>
                  <div className="text-dark-500 text-sm truncate">
                    {METHOD_LABELS[w.method] || w.method} — {w.accountInfo}
                  </div>
                </div>
                <div className="text-right text-sm">
                  <div className="text-dark-400">
                    {new Date(w.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </div>
                  {w.processedAt && (
                    <div className="text-dark-500 text-xs">
                      Traité le{' '}
                      {new Date(w.processedAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
