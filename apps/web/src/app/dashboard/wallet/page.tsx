'use client';

import { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, Loader2, Send, CreditCard, Smartphone, Zap, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { walletApi } from '@/lib/api';

const PAYMENT_METHODS = [
  { value: 'MTN_MOMO', label: 'MTN Mobile Money', icon: '🟡' },
  { value: 'FLOOZ', label: 'Moov Money (Flooz)', icon: '🔵' },
  { value: 'TMONEY', label: 'TMoney', icon: '🟢' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠' },
];

export default function WalletPage() {
  const { user, token, refreshUser } = useAuth();
  const toast = useToast();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'MTN_MOMO', accountInfo: '' });

  const fetchData = async () => {
    if (!token) return;
    try {
      const [w, txs] = await Promise.all([
        walletApi.get(token) as any,
        walletApi.getTransactions(token, 1) as any,
      ]);
      setWallet(w);
      setTransactions(txs?.transactions || []);
      setTxTotal(txs?.total || 0);
      setTxPage(1);
    } catch (err) {
      console.error('Erreur chargement portefeuille:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const loadMoreTransactions = async () => {
    if (!token) return;
    setLoadingMore(true);
    try {
      const nextPage = txPage + 1;
      const txs = await walletApi.getTransactions(token, nextPage) as any;
      setTransactions((prev) => [...prev, ...(txs?.transactions || [])]);
      setTxPage(nextPage);
      setTxTotal(txs?.total || 0);
    } catch (err) {
      console.error('Erreur chargement transactions:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleActivate = async () => {
    if (!token) return;
    setActivating(true);
    try {
      const result = await walletApi.activate(token);

      if (result.status === 'pending' && result.paymentUrl) {
        // Paiement réel — rediriger vers la page de paiement
        toast.info('Redirection vers la page de paiement...');
        window.open(result.paymentUrl, '_blank');
        toast.success('Finalisez le paiement dans la fenêtre ouverte. Votre compte sera activé automatiquement.');
      } else {
        // Mock — activation immédiate
        toast.success('Compte activé avec succès !');
        await refreshUser();
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setWithdrawing(true);
    try {
      const result: any = await walletApi.withdraw(token, {
        amount: Number(withdrawForm.amount),
        method: withdrawForm.method,
        accountInfo: withdrawForm.accountInfo,
      });

      if (result.paymentStatus === 'completed') {
        toast.success('Retrait effectué avec succès !');
      } else {
        toast.success('Demande de retrait envoyée ! En cours de traitement.');
      }

      setShowWithdraw(false);
      setWithdrawForm({ amount: '', method: 'MTN_MOMO', accountInfo: '' });
      await fetchData();
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du retrait');
    } finally {
      setWithdrawing(false);
    }
  };

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  const txTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TASK_EARNING: '💰 Gain tâche',
      REFERRAL_L1: '👥 Commission L1',
      REFERRAL_L2: '👥 Commission L2',
      ACTIVATION: '⚡ Activation',
      WITHDRAWAL: '📤 Retrait',
    };
    return map[type] || type;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-40 bg-dark-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-64 bg-dark-800 rounded animate-pulse mb-8" />
        </div>
        <div className="card bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="h-4 w-28 bg-dark-800 rounded animate-pulse mb-2" />
              <div className="h-10 w-48 bg-dark-800 rounded animate-pulse" />
            </div>
            <div className="h-12 w-12 bg-dark-800 rounded animate-pulse" />
          </div>
          <div className="h-10 w-40 bg-dark-800 rounded-lg animate-pulse" />
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card flex items-center gap-4">
              <div className="w-10 h-10 bg-dark-800 rounded-full animate-pulse" />
              <div>
                <div className="h-3 w-20 bg-dark-800 rounded animate-pulse mb-2" />
                <div className="h-6 w-28 bg-dark-800 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="h-6 w-52 bg-dark-800 rounded animate-pulse mb-4" />
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div>
                  <div className="h-4 w-32 bg-dark-800 rounded animate-pulse mb-2" />
                  <div className="h-3 w-24 bg-dark-800 rounded animate-pulse" />
                </div>
                <div className="h-5 w-24 bg-dark-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Portefeuille</h1>
      <p className="text-dark-400 mb-8">Gérez votre solde et vos paiements</p>

      {/* Balance card */}
      <div className="card bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/20 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-dark-400 text-sm mb-1">Solde disponible</div>
            <div className="text-4xl font-bold">{fmt(wallet?.balance)} FCFA</div>
          </div>
          <Wallet className="w-12 h-12 text-primary-400" />
        </div>

        <div className="flex flex-wrap gap-3">
          {user?.status === 'ACTIVATED' ? (
            <button onClick={() => setShowWithdraw(!showWithdraw)} className="btn-primary flex items-center gap-2">
              <Send className="w-4 h-4" /> Retirer mes gains
            </button>
          ) : (
            <button onClick={handleActivate} disabled={activating} className="btn-primary flex items-center gap-2 disabled:opacity-50">
              {activating ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Activation en cours...</>
              ) : (
                <><Zap className="w-4 h-4" /> Activer mon compte (4 000 FCFA)</>
              )}
            </button>
          )}
        </div>

        {user?.status !== 'ACTIVATED' && (
          <p className="text-dark-400 text-sm mt-3">
            <Smartphone className="w-4 h-4 inline mr-1" />
            Paiement par Mobile Money (MTN, Moov, TMoney, Orange)
          </p>
        )}
      </div>

      {/* Withdraw form */}
      {showWithdraw && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary-400" /> Demande de retrait
          </h2>
          <form onSubmit={handleWithdraw} className="space-y-4">
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Montant (FCFA)</label>
              <input
                type="number"
                className="input-field"
                placeholder="Min. 2 000 FCFA"
                min="2000"
                value={withdrawForm.amount}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-2 block">Méthode de retrait</label>
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setWithdrawForm({ ...withdrawForm, method: m.value })}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      withdrawForm.method === m.value
                        ? 'border-primary-500 bg-primary-500/10 text-white'
                        : 'border-dark-700 bg-dark-800 text-dark-300 hover:border-dark-500'
                    }`}
                  >
                    <span className="text-lg mr-2">{m.icon}</span>
                    <span className="text-sm font-medium">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Numéro de téléphone</label>
              <input
                type="tel"
                className="input-field"
                placeholder="Ex: +228 90 00 00 00"
                pattern="^\+?(228|229|225|233|234|237|221|223|226|227|235|241|242|243)\s?\d{7,9}$"
                value={withdrawForm.accountInfo}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, accountInfo: e.target.value })}
                required
              />
              <p className="text-dark-500 text-xs mt-1">Format : indicatif pays + numéro (ex: +22890000000)</p>
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={withdrawing} className="btn-primary disabled:opacity-50 flex items-center gap-2">
                {withdrawing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Envoi...</>
                ) : (
                  <><Send className="w-4 h-4" /> Confirmer le retrait</>
                )}
              </button>
              <button type="button" onClick={() => setShowWithdraw(false)} className="btn-secondary">
                Annuler
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="card flex items-center gap-4">
          <ArrowDownCircle className="w-10 h-10 text-green-400" />
          <div>
            <div className="text-dark-400 text-sm">Total gagné</div>
            <div className="text-xl font-bold">{fmt(wallet?.totalEarned)} FCFA</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <ArrowUpCircle className="w-10 h-10 text-blue-400" />
          <div>
            <div className="text-dark-400 text-sm">Total retiré</div>
            <div className="text-xl font-bold">{fmt(wallet?.totalWithdrawn)} FCFA</div>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <Clock className="w-10 h-10 text-yellow-400" />
          <div>
            <div className="text-dark-400 text-sm">En attente</div>
            <div className="text-xl font-bold">{fmt(wallet?.pendingWithdrawal)} FCFA</div>
          </div>
        </div>
      </div>

      {/* Transaction history */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Historique des transactions</h2>
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-dark-800 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-dark-500" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Aucune transaction</h3>
            <p className="text-dark-400 text-sm max-w-xs mx-auto">Vos transactions apparaîtront ici après avoir complété des tâches ou effectué des retraits.</p>
          </div>
        ) : (
          <>
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                <div>
                  <div className="font-medium">{txTypeLabel(tx.type)}</div>
                  <div className="text-dark-500 text-xs">{tx.description}</div>
                  <div className="text-dark-500 text-xs">{new Date(tx.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                </div>
                <div className="text-right">
                  <span className={tx.type === 'WITHDRAWAL' ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                    {tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)} FCFA
                  </span>
                  <div className={`text-xs mt-1 ${
                    tx.status === 'COMPLETED' ? 'text-green-500' :
                    tx.status === 'PENDING' ? 'text-yellow-500' :
                    'text-red-500'
                  }`}>
                    {tx.status === 'COMPLETED' ? '✓ Confirmé' :
                     tx.status === 'PENDING' ? '⏳ En attente' :
                     '✗ Échoué'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {transactions.length < txTotal && (
            <div className="text-center mt-4">
              <button onClick={loadMoreTransactions} disabled={loadingMore}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-dark-800 text-dark-300 hover:text-white hover:bg-dark-700 transition-colors disabled:opacity-50 text-sm">
                {loadingMore ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Chargement...</>
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Voir plus ({txTotal - transactions.length} restantes)</>
                )}
              </button>
            </div>
          )}
          </>
        )}
      </div>
    </div>
  );
}
