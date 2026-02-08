'use client';

import { useEffect, useState, useCallback } from 'react';
import { Loader2, CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { adminApi } from '@/lib/api';

export default function AdminTransactionsPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [walletStats, setWalletStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [ws, wd] = await Promise.all([
        adminApi.getWalletStats(token).catch(() => null) as any,
        adminApi.getPendingWithdrawals(token, page) as any,
      ]);
      setWalletStats(ws);
      setWithdrawals(wd?.withdrawals || []);
      setTotal(wd?.total || 0);
    } catch (err) {
      console.error('Erreur:', err);
    } finally {
      setLoading(false);
    }
  }, [token, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleApprove = async (id: string) => {
    if (!token || !confirm('Approuver ce retrait ?')) return;
    setActionLoading(id);
    try {
      await adminApi.approveWithdrawal(token, id);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!token || !confirm('Rejeter ce retrait ? Le montant sera remboursé au wallet.')) return;
    setActionLoading(id);
    try {
      await adminApi.rejectWithdrawal(token, id);
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur');
    } finally {
      setActionLoading(null);
    }
  };

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');
  const totalPages = Math.ceil(total / 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">Transactions & Retraits</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-dark-400 text-xs uppercase tracking-wide mb-2">Revenus totaux</div>
          <div className="text-xl font-bold text-green-400">{fmt(walletStats?.totalRevenue)} F</div>
        </div>
        <div className="card">
          <div className="text-dark-400 text-xs uppercase tracking-wide mb-2">Retraits versés</div>
          <div className="text-xl font-bold">{fmt(walletStats?.totalWithdrawals)} F</div>
        </div>
        <div className="card">
          <div className="text-dark-400 text-xs uppercase tracking-wide mb-2">Retraits complétés</div>
          <div className="text-xl font-bold text-blue-400">{fmt(walletStats?.completedWithdrawals)}</div>
        </div>
        <div className="card">
          <div className="text-dark-400 text-xs uppercase tracking-wide mb-2">En attente</div>
          <div className="text-xl font-bold text-red-400">{fmt(walletStats?.pendingWithdrawals)}</div>
        </div>
      </div>

      {/* Pending Withdrawals */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-orange-400" />
          Retraits en attente ({total})
        </h2>

        {withdrawals.length === 0 ? (
          <div className="text-dark-400 text-center py-12">Aucun retrait en attente !</div>
        ) : (
          <div className="space-y-3">
            {withdrawals.map((w) => (
              <div key={w.id} className="flex flex-col sm:flex-row sm:items-center gap-4 py-4 border-b border-dark-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{w.user?.firstName} {w.user?.lastName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">{w.method}</span>
                  </div>
                  <div className="text-dark-500 text-xs flex flex-wrap gap-3">
                    <span>{w.user?.email}</span>
                    <span>{w.user?.phone || '—'}</span>
                    <span>Compte: {w.accountInfo}</span>
                    <span>{new Date(w.createdAt).toLocaleDateString('fr-FR', {
                      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold text-white">{Number(w.amount).toLocaleString('fr-FR')} F</span>
                  {actionLoading === w.id ? (
                    <Loader2 className="w-5 h-5 animate-spin text-dark-400" />
                  ) : (
                    <div className="flex gap-2">
                      <button onClick={() => handleApprove(w.id)} title="Approuver"
                        className="p-2 rounded-lg text-green-400 hover:bg-green-500/10 transition-colors">
                        <CheckCircle className="w-5 h-5" />
                      </button>
                      <button onClick={() => handleReject(w.id)} title="Rejeter (rembourser)"
                        className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                        <XCircle className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-6 pt-4 border-t border-dark-800">
            <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
              className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-sm text-dark-400">Page {page} / {totalPages}</span>
            <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="p-2 rounded-lg bg-dark-800 text-dark-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
