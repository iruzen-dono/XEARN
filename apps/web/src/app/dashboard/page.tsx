'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wallet, Users, ListTodo, TrendingUp, Clock, Zap, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { walletApi, tasksApi, referralsApi } from '@/lib/api';
import { MotionDiv, AnimatedCounter, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const { user, token, refreshUser } = useAuth();
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
          referralsApi.getTree(token).catch(() => ({ level1: [], level2: [] })) as any,
          walletApi.getTransactions(token, 1) as any,
        ]);
        setWallet(w);
        setTaskCount(Array.isArray(completions) ? completions.length : 0);
        setReferralCount((refs?.level1?.length || 0) + (refs?.level2?.length || 0));
        setTransactions(txs?.transactions?.slice(0, 5) || []);
      } catch (err) {
        console.error('Erreur chargement dashboard:', err);
        toast.error('Impossible de charger les données du tableau de bord');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token, toast]);

  const handleActivate = async () => {
    if (!token) return;
    setActivating(true);
    try {
      const result = await walletApi.activate(token);
      if (result?.paymentUrl) {
        window.location.href = result.paymentUrl;
        return;
      }
      await refreshUser();
      const w = await walletApi.get(token) as any;
      setWallet(w);
      toast.success('Compte activé avec succès !');
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  if (loading) return <PageSkeleton />;

  const statCards = [
    {
      label: 'Solde',
      value: Number(wallet?.balance || 0),
      suffix: ' FCFA',
      sub: 'Portefeuille actuel',
      icon: <Wallet className="w-5 h-5" />,
      color: 'from-primary-500/20 to-primary-500/5',
      iconColor: 'text-primary-400',
    },
    {
      label: 'Total gagné',
      value: Number(wallet?.totalEarned || 0),
      suffix: ' FCFA',
      sub: "Depuis l'inscription",
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-accent-500/20 to-accent-500/5',
      iconColor: 'text-accent-400',
    },
    {
      label: 'Tâches',
      value: taskCount,
      suffix: '',
      sub: 'Tâches complétées',
      icon: <ListTodo className="w-5 h-5" />,
      color: 'from-blue-500/20 to-blue-500/5',
      iconColor: 'text-blue-400',
    },
    {
      label: 'Filleuls',
      value: referralCount,
      suffix: '',
      sub: 'Parrainages actifs',
      icon: <Users className="w-5 h-5" />,
      color: 'from-purple-500/20 to-purple-500/5',
      iconColor: 'text-purple-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv preset="fadeUp">
        <div className="flex items-center gap-3">
          <h1 className="heading-lg">Tableau de bord</h1>
          {user?.tier && user.tier !== 'NORMAL' && (
            <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase ${
              user.tier === 'VIP'
                ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-amber-400 border border-amber-500/30'
                : 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-400 border border-purple-500/30'
            }`}>
              {user.tier}
            </span>
          )}
        </div>
        <p className="text-dark-400 mt-1">Bienvenue, {user?.firstName} !</p>
      </MotionDiv>

      {/* Stat cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {statCards.map((s, i) => (
          <motion.div key={i} variants={staggerItem}>
            <div className="card-hover group">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-dark-400">{s.label}</span>
                <div className={`p-2 rounded-xl bg-gradient-to-br ${s.color} ${s.iconColor} group-hover:scale-110 transition-transform`}>
                  {s.icon}
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-white">
                <AnimatedCounter end={s.value} suffix={s.suffix} separator=" " />
              </div>
              <p className="text-xs text-dark-500 mt-1">{s.sub}</p>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Account status */}
      {user?.status !== 'ACTIVATED' && (
        <MotionDiv preset="fadeUp" delay={0.2}>
          <div className="card-gradient">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2.5 h-2.5 bg-warning-400 rounded-full animate-pulse" />
                  <h3 className="font-semibold text-white">Compte gratuit</h3>
                </div>
                <p className="text-dark-300 text-sm">
                  Activez votre compte pour débloquer les retraits et le parrainage.
                </p>
              </div>
              <button onClick={handleActivate} disabled={activating} className="btn-primary btn-sm whitespace-nowrap">
                {activating ? <><Loader2 className="w-4 h-4 animate-spin" /> Activation...</> : (
                  <>
                    <Zap className="w-4 h-4" /> Activer (4 000 FCFA)
                  </>
                )}
              </button>
            </div>
          </div>
        </MotionDiv>
      )}

      {user?.status === 'ACTIVATED' && (
        <MotionDiv preset="fadeUp" delay={0.2}>
          <div className="card flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-success-400 rounded-full" />
            <span className="text-success-400 text-sm font-medium">Compte activé — Tous les services sont disponibles</span>
          </div>
        </MotionDiv>
      )}

      {/* Recent activity */}
      <MotionDiv preset="fadeUp" delay={0.3}>
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Activité récente</h2>
          {transactions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-base font-semibold mb-1">Aucune activité</h3>
              <p className="text-dark-400 text-sm max-w-xs">Complétez des tâches pour voir votre activité ici !</p>
            </div>
          ) : (
            <div className="space-y-1">
              {transactions.map((tx: any, i: number) => {
                const isWithdrawal = tx.type === 'WITHDRAWAL';
                return (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${isWithdrawal ? 'bg-danger-500/10' : 'bg-success-500/10'}`}>
                        {isWithdrawal ? (
                          <ArrowUpRight className="w-4 h-4 text-danger-400" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4 text-success-400" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{tx.description || tx.type}</div>
                        <div className="text-xs text-dark-500">{new Date(tx.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${isWithdrawal ? 'text-danger-400' : 'text-success-400'}`}>
                      {isWithdrawal ? '-' : '+'}{fmt(tx.amount)} FCFA
                    </span>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </MotionDiv>
    </div>
  );
}
