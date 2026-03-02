'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowDownCircle,
  ArrowUpCircle,
  Clock,
  Loader2,
  Send,
  CreditCard,
  Smartphone,
  Zap,
  ChevronDown,
  ListOrdered,
  ArrowDownRight,
  ArrowUpRight,
  Crown,
  Star,
} from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { walletApi } from '@/lib/api';
import { MotionDiv, AnimatedCounter, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';
import type { Transaction } from '@/types';

interface WalletData {
  id: string;
  userId: string;
  balance: number;
  totalEarned: number;
  totalWithdrawn: number;
  pendingWithdrawal: number;
}

interface FeesData {
  tier: string;
  feePercent: number;
  tiers: Record<string, { feePercent: number }>;
}

interface TierPricingData {
  PREMIUM: { price: number };
  VIP: { price: number };
}

const PAYMENT_METHODS = [
  { value: 'MTN_MOMO', label: 'MTN Mobile Money', icon: '🟡' },
  { value: 'FLOOZ', label: 'Moov Money (Flooz)', icon: '🔵' },
  { value: 'TMONEY', label: 'TMoney', icon: '🟢' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠' },
];

export default function WalletPage() {
  const { user, token, refreshUser } = useAuth();
  const toast = useToast();
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txPage, setTxPage] = useState(1);
  const [txTotal, setTxTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawForm, setWithdrawForm] = useState({
    amount: '',
    method: 'MTN_MOMO',
    accountInfo: '',
  });
  const [feeInfo, setFeeInfo] = useState<FeesData | null>(null);
  const [tierPricing, setTierPricing] = useState<TierPricingData | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const fetchData = useCallback(async () => {
    if (!token) return;
    try {
      const [w, txs, fees, pricing] = await Promise.all([
        walletApi.get(token) as Promise<unknown> as Promise<WalletData>,
        walletApi.getTransactions(token, 1),
        walletApi.getFees(token).catch(() => null),
        walletApi.getTierPricing(token).catch(() => null),
      ]);
      setWallet(w);
      setTransactions(txs?.transactions || []);
      setTxTotal(txs?.total || 0);
      setTxPage(1);
      if (fees) setFeeInfo(fees as unknown as FeesData);
      if (pricing) setTierPricing(pricing as unknown as TierPricingData);
    } catch (err) {
      console.error('Erreur chargement portefeuille:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const loadMoreTransactions = async () => {
    if (!token) return;
    setLoadingMore(true);
    try {
      const nextPage = txPage + 1;
      const txs = await walletApi.getTransactions(token, nextPage);
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
      const result: Record<string, unknown> = (await walletApi.activate(token)) as Record<
        string,
        unknown
      >;
      if (result.status === 'pending' && result.paymentUrl) {
        toast.info('Ouverture de la page de paiement FedaPay...');
        window.open(result.paymentUrl as string, '_blank', 'noopener,noreferrer');
        toast.success('Finalisez le paiement FedaPay. Votre compte sera activé automatiquement.');
      } else if (result.status === 'pending' && !result.paymentUrl) {
        toast.warning('Paiement en attente. Réessayez dans quelques minutes.');
      } else {
        toast.success('Compte activé avec succès !');
        await refreshUser();
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'activation");
    } finally {
      setActivating(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setWithdrawing(true);
    try {
      const result = (await walletApi.withdraw(token, {
        amount: Number(withdrawForm.amount),
        method: withdrawForm.method as import('@/types').PaymentMethod,
        accountInfo: withdrawForm.accountInfo,
      })) as import('@/types').Withdrawal & { paymentStatus?: string };
      if (result.paymentStatus === 'completed') {
        toast.success('Retrait effectué avec succès !');
      } else {
        toast.success('Demande de retrait envoyée. En cours de traitement.');
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

  const handleUpgradeTier = async (targetTier: string) => {
    if (!token) return;
    setUpgrading(true);
    try {
      const result = await walletApi.upgradeTier(token, targetTier);
      if (result?.paymentUrl) {
        window.open(result.paymentUrl, '_blank', 'noopener,noreferrer');
        toast.info('Finalisez le paiement pour upgrader votre compte.');
      } else {
        toast.success(`Compte upgradé vers ${targetTier} !`);
        await refreshUser();
        await fetchData();
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upgrade");
    } finally {
      setUpgrading(false);
    }
  };

  const fmt = (n: string | number | null | undefined) => Number(n || 0).toLocaleString('fr-FR');

  const txTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      TASK_EARNING: '💰 Gain tâche',
      REFERRAL_L1: '👥 Commission L1',
      REFERRAL_L2: '👥 Commission L2',
      REFERRAL_L3: '👥 Commission L3 (VIP)',
      ACTIVATION: '⚡ Activation',
      WITHDRAWAL: '📤 Retrait',
      TIER_UPGRADE: '🚀 Upgrade de compte',
    };
    return map[type] || type;
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="space-y-6">
      <MotionDiv preset="fadeUp">
        <h1 className="heading-lg">Portefeuille</h1>
        <p className="text-dark-400 mt-1">Gérez votre solde et vos retraits</p>
      </MotionDiv>

      {/* Balance card */}
      <MotionDiv preset="fadeUp" delay={0.1}>
        <div className="card-gradient">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-dark-400 text-sm mb-1">Solde disponible</div>
              <div className="text-4xl font-bold text-white">
                <AnimatedCounter end={Number(wallet?.balance || 0)} suffix=" FCFA" separator=" " />
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-primary-500/20 to-accent-500/20">
              <Wallet className="w-8 h-8 text-primary-400" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {user?.status === 'ACTIVATED' ? (
              <button
                onClick={() => setShowWithdraw(!showWithdraw)}
                className="btn-primary flex items-center gap-2"
              >
                <Send className="w-4 h-4" /> Retirer mes gains
              </button>
            ) : (
              <button
                onClick={handleActivate}
                disabled={activating}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {activating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Activation...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" /> Activer (4 000 FCFA)
                  </>
                )}
              </button>
            )}
          </div>

          {user?.status !== 'ACTIVATED' && (
            <p className="text-dark-400 text-sm mt-3 flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Paiement via FedaPay (MTN, Moov, TMoney, Orange)
            </p>
          )}
        </div>
      </MotionDiv>

      {/* Tier & Fees info */}
      {user && (
        <MotionDiv preset="fadeUp" delay={0.15}>
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Niveau de compte
              </h2>
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
                  user.tier === 'VIP'
                    ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-amber-400 border border-amber-500/30'
                    : user.tier === 'PREMIUM'
                      ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/30'
                      : 'bg-white/[0.05] text-dark-400 border border-white/[0.08]'
                }`}
              >
                {user.tier || 'NORMAL'}
              </span>
            </div>

            {/* Fee info */}
            {feeInfo && (
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-4">
                <div className="text-sm text-dark-300">
                  Frais de retrait :{' '}
                  <span className="text-white font-semibold">{feeInfo.feePercent}%</span>
                  <span className="text-dark-500 ml-2">
                    (
                    {user.tier === 'NORMAL'
                      ? 'Normal'
                      : user.tier === 'PREMIUM'
                        ? 'Premium'
                        : 'VIP'}
                    )
                  </span>
                </div>
              </div>
            )}

            {/* Upgrade options */}
            {tierPricing && user.tier !== 'VIP' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {user.tier === 'NORMAL' && tierPricing.PREMIUM && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-indigo-500/5 border border-purple-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Star className="w-4 h-4 text-purple-400" />
                      <span className="text-sm font-semibold text-purple-400">Premium</span>
                    </div>
                    <div className="text-xs text-dark-400 mb-3">
                      Frais réduits à 5% • Tâches Premium
                    </div>
                    <div className="text-lg font-bold text-white mb-3">
                      {Number(tierPricing.PREMIUM?.price || tierPricing.PREMIUM).toLocaleString(
                        'fr-FR',
                      )}{' '}
                      FCFA
                    </div>
                    <button
                      onClick={() => handleUpgradeTier('PREMIUM')}
                      disabled={upgrading || user?.status !== 'ACTIVATED'}
                      className="btn-primary btn-sm w-full disabled:opacity-50"
                    >
                      {upgrading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Upgrade...
                        </>
                      ) : (
                        'Passer Premium'
                      )}
                    </button>
                  </div>
                )}
                {tierPricing.VIP && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-500/10 to-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-400">VIP</span>
                    </div>
                    <div className="text-xs text-dark-400 mb-3">
                      Frais réduits à 2% • Toutes les tâches • Parrainage L3 (5%)
                    </div>
                    <div className="text-lg font-bold text-white mb-3">
                      {Number(tierPricing.VIP?.price || tierPricing.VIP).toLocaleString('fr-FR')}{' '}
                      FCFA
                    </div>
                    <button
                      onClick={() => handleUpgradeTier('VIP')}
                      disabled={upgrading || user?.status !== 'ACTIVATED'}
                      className="btn-primary btn-sm w-full disabled:opacity-50"
                    >
                      {upgrading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" /> Upgrade...
                        </>
                      ) : (
                        'Passer VIP'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {user.tier === 'VIP' && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-400">
                ✨ Vous êtes VIP — tous les avantages sont débloqués !
              </div>
            )}

            {user?.status !== 'ACTIVATED' && tierPricing && (
              <div className="p-3 rounded-xl bg-primary-500/5 border border-primary-500/20 text-sm text-dark-300 mt-4">
                💡 Activez votre compte pour pouvoir upgrader vers Premium ou VIP.
              </div>
            )}
          </div>
        </MotionDiv>
      )}

      {/* Withdraw form */}
      <AnimatePresence>
        {showWithdraw && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="card">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary-400" /> Demande de retrait
              </h2>
              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="input-group">
                  <label className="input-label">Montant (FCFA)</label>
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
                  <label className="input-label mb-2 block">Méthode de retrait</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_METHODS.map((m) => (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setWithdrawForm({ ...withdrawForm, method: m.value })}
                        className={`p-3 rounded-xl border text-left transition-all ${withdrawForm.method === m.value ? 'border-primary-500 bg-primary-500/10 text-white' : 'border-white/[0.06] bg-white/[0.02] text-dark-300 hover:border-white/10'}`}
                      >
                        <span className="text-lg mr-2">{m.icon}</span>
                        <span className="text-sm font-medium">{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="input-group">
                  <label className="input-label">Numéro de téléphone</label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="Ex: +228 90 00 00 00"
                    value={withdrawForm.accountInfo}
                    onChange={(e) =>
                      setWithdrawForm({ ...withdrawForm, accountInfo: e.target.value })
                    }
                    required
                  />
                  <p className="text-dark-500 text-xs mt-1">
                    Traitement FedaPay sous 24-48h selon l&apos;opérateur.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="submit"
                    disabled={withdrawing}
                    className="btn-primary disabled:opacity-50 flex items-center gap-2"
                  >
                    {withdrawing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Envoi...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" /> Confirmer
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWithdraw(false)}
                    className="btn-secondary"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {[
          {
            label: 'Total gagné',
            value: wallet?.totalEarned,
            icon: <ArrowDownCircle className="w-5 h-5" />,
            color: 'from-success-500/20 to-success-500/5 text-success-400',
          },
          {
            label: 'Total retiré',
            value: wallet?.totalWithdrawn,
            icon: <ArrowUpCircle className="w-5 h-5" />,
            color: 'from-blue-500/20 to-blue-500/5 text-blue-400',
          },
          {
            label: 'En attente',
            value: wallet?.pendingWithdrawal,
            icon: <Clock className="w-5 h-5" />,
            color: 'from-warning-500/20 to-warning-500/5 text-warning-400',
          },
        ].map((s, i) => (
          <motion.div key={i} variants={staggerItem}>
            <div className="card-hover group">
              <div className="flex items-center gap-4">
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${s.color} group-hover:scale-110 transition-transform`}
                >
                  {s.icon}
                </div>
                <div>
                  <div className="text-dark-400 text-sm">{s.label}</div>
                  <div className="text-xl font-bold text-white">{fmt(s.value)} FCFA</div>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Withdrawal history link */}
      <MotionDiv preset="fadeUp" delay={0.2}>
        <Link
          href="/dashboard/wallet/withdrawals"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-dark-300 hover:text-white hover:border-primary-500/30 transition-all text-sm font-medium"
        >
          <ListOrdered className="w-4 h-4" /> Historique des retraits
        </Link>
      </MotionDiv>

      {/* Transaction history */}
      <MotionDiv preset="fadeUp" delay={0.3}>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Historique des transactions</h2>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold mb-1">Aucune transaction</h3>
              <p className="text-dark-400 text-sm max-w-xs">Vos transactions apparaîtront ici.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                {transactions.map((tx: Transaction, i: number) => {
                  const isWithdrawal = tx.type === 'WITHDRAWAL';
                  return (
                    <motion.div
                      key={tx.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${isWithdrawal ? 'bg-danger-500/10' : 'bg-success-500/10'}`}
                        >
                          {isWithdrawal ? (
                            <ArrowUpRight className="w-4 h-4 text-danger-400" />
                          ) : (
                            <ArrowDownRight className="w-4 h-4 text-success-400" />
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {txTypeLabel(tx.type)}
                          </div>
                          {tx.description && (
                            <div className="text-xs text-dark-500">{tx.description}</div>
                          )}
                          <div className="text-xs text-dark-500">
                            {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-semibold ${isWithdrawal ? 'text-danger-400' : 'text-success-400'}`}
                        >
                          {isWithdrawal ? '-' : '+'}
                          {fmt(tx.amount)} FCFA
                        </span>
                        <div
                          className={`text-xs mt-0.5 ${tx.status === 'COMPLETED' ? 'text-success-400' : tx.status === 'PENDING' ? 'text-warning-400' : 'text-danger-400'}`}
                        >
                          {tx.status === 'COMPLETED'
                            ? '✓ Confirmé'
                            : tx.status === 'PENDING'
                              ? '⏳ En attente'
                              : '✗ Échoué'}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              {transactions.length < txTotal && (
                <div className="text-center mt-4">
                  <button
                    onClick={loadMoreTransactions}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-dark-300 hover:text-white hover:border-white/10 transition-all disabled:opacity-50 text-sm"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" /> Voir plus (
                        {txTotal - transactions.length} restantes)
                      </>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </MotionDiv>
    </div>
  );
}
