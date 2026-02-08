'use client';

import { useEffect, useState } from 'react';
import { Wallet, ArrowDownCircle, ArrowUpCircle, Clock, Loader2, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { walletApi } from '@/lib/api';

export default function WalletPage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const [wallet, setWallet] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({ amount: '', method: 'MOBILE_MONEY', accountInfo: '' });

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [w, txs] = await Promise.all([
          walletApi.get(token) as any,
          walletApi.getTransactions(token, 1) as any,
        ]);
        setWallet(w);
        setTransactions(txs?.transactions || []);
      } catch (err) {
        console.error('Erreur chargement portefeuille:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setWithdrawing(true);
    try {
      await walletApi.withdraw(token, {
        amount: Number(withdrawForm.amount),
        method: withdrawForm.method,
        accountInfo: withdrawForm.accountInfo,
      });
      toast.success('Demande de retrait envoyée avec succès !');
      setShowWithdraw(false);
      setWithdrawForm({ amount: '', method: 'MOBILE_MONEY', accountInfo: '' });
      // Refresh
      const [w, txs] = await Promise.all([
        walletApi.get(token) as any,
        walletApi.getTransactions(token, 1) as any,
      ]);
      setWallet(w);
      setTransactions(txs?.transactions || []);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors du retrait');
    } finally {
      setWithdrawing(false);
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
      <h1 className="text-3xl font-bold mb-2">Portefeuille</h1>
      <p className="text-dark-400 mb-8">Gérez votre solde et vos retraits</p>

      {/* Balance card */}
      <div className="card bg-gradient-to-br from-primary-500/10 to-accent-500/10 border-primary-500/20 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-dark-400 text-sm mb-1">Solde disponible</div>
            <div className="text-4xl font-bold">{fmt(wallet?.balance)} FCFA</div>
          </div>
          <Wallet className="w-12 h-12 text-primary-400" />
        </div>
        {user?.status === 'ACTIVATED' ? (
          <button onClick={() => setShowWithdraw(!showWithdraw)} className="btn-primary flex items-center gap-2">
            <Send className="w-4 h-4" /> Retirer mes gains
          </button>
        ) : (
          <p className="text-dark-400 text-sm">Activez votre compte pour pouvoir retirer vos gains.</p>
        )}
      </div>

      {/* Withdraw form */}
      {showWithdraw && (
        <div className="card mb-8">
          <h2 className="text-xl font-semibold mb-4">Demande de retrait</h2>
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
              <label className="text-sm text-dark-300 mb-1 block">Méthode</label>
              <select
                className="input-field"
                value={withdrawForm.method}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })}
              >
                <option value="MOBILE_MONEY">Mobile Money</option>
                <option value="BANK_TRANSFER">Virement bancaire</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-dark-300 mb-1 block">Numéro / Compte</label>
              <input
                type="text"
                className="input-field"
                placeholder="Ex: +228 90 00 00 00"
                value={withdrawForm.accountInfo}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, accountInfo: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="submit" disabled={withdrawing} className="btn-primary disabled:opacity-50">
                {withdrawing ? 'Envoi...' : 'Confirmer le retrait'}
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
          <div className="text-dark-400 text-center py-8">
            Aucune transaction pour le moment.
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx: any) => (
              <div key={tx.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                <div>
                  <div className="font-medium">{tx.description || tx.type}</div>
                  <div className="text-dark-500 text-sm">{new Date(tx.createdAt).toLocaleDateString('fr-FR')}</div>
                </div>
                <div className="text-right">
                  <span className={tx.type === 'WITHDRAWAL' ? 'text-red-400 font-semibold' : 'text-green-400 font-semibold'}>
                    {tx.type === 'WITHDRAWAL' ? '-' : '+'}{fmt(tx.amount)} FCFA
                  </span>
                  <div className="text-dark-500 text-xs">{tx.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
