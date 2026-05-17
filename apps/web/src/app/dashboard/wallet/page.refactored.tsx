'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, ArrowDownCircle, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { useWallet } from '@/lib/hooks';
import { ErrorBoundary, DataError, LoadingSpinner } from '@/components/ErrorBoundary';
import { walletApi } from '@/lib/api';

const PAYMENT_METHODS = [
  { value: 'MTN_MOMO', label: 'MTN Mobile Money', icon: '🟡' },
  { value: 'FLOOZ', label: 'Moov Money (Flooz)', icon: '🔵' },
  { value: 'TMONEY', label: 'TMoney', icon: '🟢' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠' },
];

export default function WalletPageRefactored() {
  const { user } = useAuth();
  const toast = useToast();
  const { wallet, recentWithdrawals, fees, isLoading, error, refresh } = useWallet();

  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: 'MTN_MOMO',
    accountInfo: '',
  });

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawing(true);

    try {
      const amount = parseFloat(withdrawForm.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Montant invalide');
        return;
      }

      await walletApi.withdraw('', {
        amount,
        method: withdrawForm.method as any,
        accountInfo: withdrawForm.accountInfo,
      });

      toast.success('Demande de retrait envoyée avec succès');
      setShowWithdraw(false);
      setWithdrawForm({ amount: '', method: 'MTN_MOMO', accountInfo: '' });
      refresh(); // Refresh wallet data
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Erreur lors du retrait');
    } finally {
      setWithdrawing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <LoadingSpinner message="Chargement du portefeuille..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <DataError
          message={error.message || 'Erreur lors du chargement du portefeuille'}
          onRetry={refresh}
        />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="container mx-auto p-4">
        <DataError message="Aucune donnée de portefeuille disponible" onRetry={refresh} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="container mx-auto p-4">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Mon Portefeuille</h1>
          <p className="text-gray-600">Gérez vos gains et vos retraits</p>
        </div>

        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl p-6 text-white mb-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm opacity-90">Solde disponible</p>
              <h2 className="text-3xl font-bold mt-1">
                {Number(wallet.balance).toLocaleString()} FCFA
              </h2>
            </div>
            <Wallet className="w-12 h-12 opacity-50" />
          </div>

          <div className="flex gap-4 mt-4">
            <button
              onClick={() => setShowWithdraw(true)}
              className="flex-1 bg-white/20 hover:bg-white/30 py-2 px-4 rounded-lg font-medium transition"
            >
              <Send className="w-4 h-4 inline mr-2" />
              Retirer
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Total gagné</p>
            <p className="text-xl font-bold text-green-600">
              {Number(wallet.totalEarned).toLocaleString()} FCFA
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <p className="text-sm text-gray-600">Frais de retrait</p>
            <p className="text-xl font-bold text-blue-600">{fees?.withdrawalFeePercent ?? 0}%</p>
          </div>
        </div>

        {/* Recent Withdrawals */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-4">Retraits récents</h3>
          {recentWithdrawals.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucun retrait récent</p>
          ) : (
            <div className="space-y-3">
              {recentWithdrawals.map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{Number(withdrawal.amount).toLocaleString()} FCFA</p>
                    <p className="text-sm text-gray-600">{withdrawal.method}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded ${
                      withdrawal.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-700'
                        : withdrawal.status === 'PENDING'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {withdrawal.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Withdraw Modal */}
        {showWithdraw && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white rounded-xl p-6 max-w-md w-full"
            >
              <h3 className="text-xl font-bold mb-4">Demande de retrait</h3>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Montant (FCFA)</label>
                  <input
                    type="number"
                    value={withdrawForm.amount}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, amount: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="Minimum 2000 FCFA"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Méthode de paiement</label>
                  <select
                    value={withdrawForm.method}
                    onChange={(e) => setWithdrawForm({ ...withdrawForm, method: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.icon} {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Numéro de compte</label>
                  <input
                    type="text"
                    value={withdrawForm.accountInfo}
                    onChange={(e) =>
                      setWithdrawForm({ ...withdrawForm, accountInfo: e.target.value })
                    }
                    className="w-full border rounded-lg px-3 py-2"
                    placeholder="+225XXXXXXXXXX"
                    required
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className="flex-1 py-2 border rounded-lg hover:bg-gray-50"
                    disabled={withdrawing}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {withdrawing ? (
                      <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                    ) : (
                      'Confirmer'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}
