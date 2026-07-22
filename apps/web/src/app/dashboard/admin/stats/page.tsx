'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  UserCheck,
  Crown,
  TrendingUp,
  Wallet,
  ListTodo,
  DollarSign,
  Clock,
  BarChart3,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import { MotionDiv, AnimatedCounter, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';
import type { UserStats, WalletStats, AdminAnalytics } from '@/types';

interface AdminStats {
  userStats: UserStats | null;
  walletStats: WalletStats | null;
  analytics: AdminAnalytics | null;
}

export default function AdminStatsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<AdminStats>({
    userStats: null,
    walletStats: null,
    analytics: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchStats = async () => {
      setLoading(true);
      setError(null);
      try {
        const [userStats, walletStats, analytics] = await Promise.all([
          adminApi.getUserStats(token).catch(() => null),
          adminApi.getWalletStats(token).catch(() => null),
          adminApi.getAnalytics(token).catch(() => null),
        ]);
        setData({ userStats, walletStats, analytics });
      } catch (err) {
        console.error('Erreur chargement stats admin:', err);
        setError('Impossible de charger les statistiques');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [token]);

  const s = data.userStats;
  const w = data.walletStats;
  const a = data.analytics;

  const fmt = (n: number | string | undefined) => Number(n || 0).toLocaleString('fr-FR');

  const activationRate = useMemo(() => {
    const total = Number(s?.totalUsers || 0);
    const activated = Number(s?.totalActivated || 0);
    if (!total) return 0;
    return Math.round((activated / total) * 100);
  }, [s]);

  const premiumRate = useMemo(() => {
    // Estimate premium users — we don't have exact count, use activated as proxy
    const total = Number(s?.totalUsers || 0);
    const activated = Number(s?.totalActivated || 0);
    if (!total) return 0;
    return Math.round((activated / total) * 100);
  }, [s]);

  const maxReg = useMemo(() => {
    return a?.registrations?.length ? Math.max(...a.registrations.map((r) => r.count), 1) : 1;
  }, [a]);

  if (loading) return <PageSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-danger-400 font-medium mb-2">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-xl bg-primary-500/10 text-primary-400 border border-primary-500/20 hover:bg-primary-500/20 transition-colors text-sm"
        >
          Réessayer
        </button>
      </div>
    );
  }

  // Row 1 — KPIs principaux
  const kpiRow1 = [
    {
      label: 'Utilisateurs total',
      value: s?.totalUsers ?? 0,
      sub: `${fmt(s?.activeUsers)} actifs ce mois`,
      icon: Users,
      color: 'from-primary-500/20 to-primary-500/5',
      textColor: 'text-primary-400',
    },
    {
      label: 'Comptes activés',
      value: s?.totalActivated ?? 0,
      sub: `${activationRate}% des inscriptions`,
      icon: UserCheck,
      color: 'from-success-500/20 to-success-500/5',
      textColor: 'text-success-400',
    },
    {
      label: 'Utilisateurs Premium',
      value: s?.totalActivated ?? 0,
      sub: 'Comptes avec accès complet',
      icon: Crown,
      color: 'from-yellow-500/20 to-amber-500/5',
      textColor: 'text-amber-400',
    },
    {
      label: 'Revenus totaux',
      value: w?.totalRevenue ?? 0,
      suffix: ' FCFA',
      sub: 'Généré par les activations',
      icon: DollarSign,
      color: 'from-accent-500/20 to-accent-500/5',
      textColor: 'text-accent-400',
    },
  ];

  // Row 2 — État plateforme
  const kpiRow2 = [
    {
      label: 'Retraits en attente',
      value: w?.pendingWithdrawals ?? 0,
      sub: 'À traiter',
      suffix: '',
      icon: Clock,
      color: 'from-warning-500/20 to-warning-500/5',
      textColor: 'text-warning-400',
    },
    {
      label: 'Tâches complétées',
      value: a?.topTasks?.reduce((sum, t) => sum + t.completionCount, 0) ?? 0,
      sub: 'Total cumulé',
      suffix: '',
      icon: ListTodo,
      color: 'from-blue-500/20 to-blue-500/5',
      textColor: 'text-blue-400',
    },
    {
      label: 'Suspendus',
      value: s?.suspendedUsers ?? 0,
      sub: 'Comptes suspendus',
      suffix: '',
      icon: Users,
      color: 'from-orange-500/20 to-orange-500/5',
      textColor: 'text-orange-400',
    },
    {
      label: 'Bannis',
      value: s?.bannedUsers ?? 0,
      sub: 'Comptes bannis',
      suffix: '',
      icon: Users,
      color: 'from-danger-500/20 to-danger-500/5',
      textColor: 'text-danger-400',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Row 1 — KPIs principaux */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpiRow1.map((kpi, i) => (
          <motion.div key={i} variants={staggerItem}>
            <div className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-medium text-dark-400">
                  {kpi.label}
                </span>
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.color} ${kpi.textColor} group-hover:scale-110 transition-transform`}
                >
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${kpi.textColor}`}>
                <AnimatedCounter end={Number(kpi.value)} suffix={kpi.suffix} />
              </div>
              {kpi.sub && <div className="text-dark-500 text-xs mt-1">{kpi.sub}</div>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Row 2 — État plateforme */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {kpiRow2.map((kpi, i) => (
          <motion.div key={i} variants={staggerItem}>
            <div className="card-hover group">
              <div className="flex items-start justify-between mb-3">
                <span className="text-xs uppercase tracking-wide font-medium text-dark-400">
                  {kpi.label}
                </span>
                <div
                  className={`p-2.5 rounded-xl bg-gradient-to-br ${kpi.color} ${kpi.textColor} group-hover:scale-110 transition-transform`}
                >
                  <kpi.icon className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-bold ${kpi.textColor}`}>
                <AnimatedCounter end={Number(kpi.value)} suffix={kpi.suffix} />
              </div>
              {kpi.sub && <div className="text-dark-500 text-xs mt-1">{kpi.sub}</div>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inscriptions — barres 30 jours */}
        <MotionDiv preset="fadeUp" delay={0.1}>
          <div className="card-hover">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                <TrendingUp className="w-5 h-5 text-primary-400" />
              </div>
              <h2 className="text-lg font-semibold">Inscriptions (30 jours)</h2>
            </div>

            {a?.registrations && a.registrations.length > 0 ? (
              <div className="flex items-end gap-1 h-44">
                {a.registrations.map((r, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1 group/bar">
                    <span className="text-[10px] text-dark-500 opacity-0 group-hover/bar:opacity-100 transition-opacity">
                      {r.count > 0 ? r.count : ''}
                    </span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{
                        height: `${Math.max((r.count / maxReg) * 100, 2)}%`,
                      }}
                      transition={{
                        delay: i * 0.015,
                        type: 'spring',
                        stiffness: 200,
                        damping: 20,
                      }}
                      className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-md cursor-pointer hover:from-primary-400 hover:to-primary-300 transition-colors"
                    />
                    {i % 7 === 0 && (
                      <span className="text-[9px] text-dark-600 mt-1">
                        {new Date(r.date).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-dark-500">
                <BarChart3 className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Aucune donnée d'inscription</p>
              </div>
            )}
          </div>
        </MotionDiv>

        {/* Tâches par type */}
        <MotionDiv preset="fadeUp" delay={0.15}>
          <div className="card-hover">
            <div className="flex items-center gap-2 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-500/5">
                <BarChart3 className="w-5 h-5 text-accent-400" />
              </div>
              <h2 className="text-lg font-semibold">Tâches par type</h2>
            </div>

            {a?.tasksByType && a.tasksByType.length > 0 ? (
              <div className="space-y-4">
                {a.tasksByType.map((t) => {
                  const total = a.tasksByType.reduce((acc, b) => acc + b.count, 0);
                  const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                  const colors: Record<string, string> = {
                    VIDEO_AD: 'from-danger-500 to-danger-400',
                    CLICK_AD: 'from-primary-500 to-primary-400',
                    SURVEY: 'from-success-500 to-success-400',
                    SPONSORED: 'from-accent-500 to-accent-400',
                    EXTERNAL: 'from-blue-500 to-blue-400',
                  };
                  return (
                    <div key={t.type}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-dark-200 font-medium">
                          {t.type.replace(/_/g, ' ')}
                        </span>
                        <span className="text-dark-400 tabular-nums">
                          {t.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r ${
                            colors[t.type] || 'from-primary-500 to-primary-400'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-dark-500">
                <ListTodo className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm">Aucune tâche disponible</p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>

      {/* Top tâches et Top parrains */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tâches */}
        <MotionDiv preset="fadeUp" delay={0.2}>
          <div className="card-hover">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5">
                <ListTodo className="w-5 h-5 text-blue-400" />
              </div>
              <h2 className="text-lg font-semibold">Top Tâches</h2>
            </div>

            {a?.topTasks && a.topTasks.length > 0 ? (
              <div className="space-y-1">
                {a.topTasks.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-white truncate">{t.title}</div>
                      <div className="text-dark-500 text-xs">
                        {t.type.replace(/_/g, ' ')} — {Number(t.reward).toLocaleString('fr-FR')}{' '}
                        FCFA
                      </div>
                    </div>
                    <span className="badge bg-primary-500/10 text-primary-400 border-primary-500/20 flex-shrink-0 ml-3">
                      {t.completionCount}×
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-dark-500">
                <p className="text-sm">Aucune tâche</p>
              </div>
            )}
          </div>
        </MotionDiv>

        {/* Top Parrains */}
        <MotionDiv preset="fadeUp" delay={0.25}>
          <div className="card-hover">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-500/5">
                <Users className="w-5 h-5 text-accent-400" />
              </div>
              <h2 className="text-lg font-semibold">Top Parrains</h2>
            </div>

            {a?.topReferrers && a.topReferrers.length > 0 ? (
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {a.topReferrers.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                          i < 3
                            ? 'bg-gradient-to-br from-primary-500/20 to-accent-500/10 text-primary-400'
                            : 'bg-white/[0.04] text-dark-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-white truncate">{r.name}</div>
                        <div className="text-dark-500 text-xs truncate">{r.email}</div>
                      </div>
                    </div>
                    <span className="text-primary-400 font-semibold text-sm flex-shrink-0 ml-3">
                      {r.referrals} filleul{r.referrals > 1 ? 's' : ''}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-dark-500">
                <p className="text-sm">Aucun parrain</p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
