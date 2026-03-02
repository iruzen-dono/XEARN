'use client';

import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Wallet,
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  BarChart3,
  ListTodo,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { adminApi } from '@/lib/api';
import type { UserStats, WalletStats, AdminAnalytics } from '@/types';
import { MotionDiv, AnimatedCounter, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function AdminDashboardPage() {
  const { token } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [walletStats, setWalletStats] = useState<WalletStats | null>(null);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [s, ws, an] = await Promise.all([
          adminApi.getUserStats(token).catch(() => null),
          adminApi.getWalletStats(token).catch(() => null),
          adminApi.getAnalytics(token).catch(() => null),
        ]);
        setStats(s);
        setWalletStats(ws);
        setAnalytics(an);
      } catch (err) {
        console.error('Erreur admin dashboard:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const fmt = (n: number | string | undefined) => Number(n || 0).toLocaleString('fr-FR');

  const maxReg = useMemo(() => {
    return analytics?.registrations?.length
      ? Math.max(...analytics.registrations.map((r) => r.count), 1)
      : 1;
  }, [analytics]);

  const activationRate = useMemo(() => {
    const total = Number(stats?.totalUsers || 0);
    const active = Number(stats?.activeUsers || 0);
    if (!total) return 0;
    return Math.round((active / total) * 100);
  }, [stats]);

  const avgRevenuePerActivated = useMemo(() => {
    const active = Number(stats?.activeUsers || 0);
    const revenue = Number(walletStats?.totalRevenue || 0);
    if (!active) return 0;
    return Math.round(revenue / active);
  }, [stats, walletStats]);

  if (loading) return <PageSkeleton />;

  const kpiRow1 = [
    {
      label: 'Utilisateurs',
      value: stats?.totalUsers,
      sub: `${fmt(stats?.activeUsers)} activés`,
      icon: Users,
      color: 'primary',
    },
    {
      label: 'Revenus',
      value: walletStats?.totalRevenue,
      sub: 'FCFA (activations)',
      icon: DollarSign,
      color: 'success',
    },
    {
      label: 'Retraits versés',
      value: walletStats?.totalWithdrawals,
      sub: 'FCFA',
      icon: ArrowUpRight,
      color: 'warning',
    },
    {
      label: 'En attente',
      value: walletStats?.pendingWithdrawals,
      sub: 'retraits à traiter',
      icon: Wallet,
      color: 'danger',
    },
  ];

  const kpiRow2 = [
    { label: 'Suspendus', value: stats?.suspendedUsers, icon: Users, color: 'warning' },
    { label: 'Bannis', value: stats?.bannedUsers, icon: Users, color: 'danger' },
    {
      label: 'Solde wallets',
      value: walletStats?.totalBalance,
      sub: 'FCFA',
      icon: Wallet,
      color: 'primary',
    },
    {
      label: 'Transactions',
      value: walletStats?.totalTransactions,
      icon: BarChart3,
      color: 'accent',
    },
  ];

  const kpiRow3 = [
    {
      label: "Taux d'activation",
      value: activationRate,
      suffix: '%',
      sub: 'utilisateurs activés',
      icon: TrendingUp,
      color: 'primary',
    },
    {
      label: 'Revenu / activé',
      value: avgRevenuePerActivated,
      sub: 'FCFA moyen',
      icon: DollarSign,
      color: 'success',
    },
    {
      label: 'Tâches créées',
      value: analytics?.topTasks?.length || 0,
      sub: 'top tâches suivies',
      icon: ListTodo,
      color: 'primary',
    },
    {
      label: 'Parrainages',
      value: analytics?.topReferrers?.length || 0,
      sub: 'top parrains',
      icon: Users,
      color: 'accent',
    },
  ];

  const colorMap: Record<string, string> = {
    primary: 'from-primary-500/20 to-primary-500/5 text-primary-400',
    success: 'from-success-500/20 to-success-500/5 text-success-400',
    warning: 'from-warning-500/20 to-warning-500/5 text-warning-400',
    danger: 'from-danger-500/20 to-danger-500/5 text-danger-400',
    accent: 'from-accent-500/20 to-accent-500/5 text-accent-400',
  };

  const textColorMap: Record<string, string> = {
    primary: 'text-primary-400',
    success: 'text-success-400',
    warning: 'text-warning-400',
    danger: 'text-danger-400',
    accent: 'text-accent-400',
  };

  const renderKpiRow = (
    items: {
      label: string;
      value: number | string | undefined;
      sub?: string;
      suffix?: string;
      icon: LucideIcon;
      color: string;
    }[],
  ) => (
    <motion.div
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {items.map((kpi, i) => (
        <motion.div key={i} variants={staggerItem}>
          <div className="card-hover group">
            <div className="flex items-center justify-between mb-3">
              <span className="text-dark-400 text-xs uppercase tracking-wide font-medium">
                {kpi.label}
              </span>
              <div
                className={`p-2 rounded-xl bg-gradient-to-br ${colorMap[kpi.color]} group-hover:scale-110 transition-transform`}
              >
                <kpi.icon className="w-4 h-4" />
              </div>
            </div>
            <div className={`text-2xl font-bold ${textColorMap[kpi.color]}`}>
              <AnimatedCounter end={Number(kpi.value || 0)} suffix={kpi.suffix} />
            </div>
            {kpi.sub && <div className="text-dark-500 text-sm mt-1">{kpi.sub}</div>}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <MotionDiv preset="fadeUp">
        <h1 className="heading-lg">Dashboard Admin</h1>
      </MotionDiv>

      {renderKpiRow(kpiRow1)}
      {renderKpiRow(kpiRow2)}
      {renderKpiRow(kpiRow3)}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Inscriptions Bar Chart */}
        <MotionDiv preset="fadeUp" delay={0.15}>
          <div className="card-hover">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                <TrendingUp className="w-5 h-5 text-primary-400" />
              </div>
              Inscriptions (30 jours)
            </h2>
            {(analytics?.registrations?.length ?? 0) > 0 ? (
              <div className="flex items-end gap-1 h-40">
                {analytics!.registrations.map((r, i: number) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-dark-500">{r.count > 0 ? r.count : ''}</span>
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${(r.count / maxReg) * 100}%` }}
                      transition={{ delay: i * 0.02, type: 'spring', stiffness: 200, damping: 20 }}
                      className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-md min-h-[2px]"
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
              <div className="empty-state py-8">
                <p className="text-dark-500">Aucune inscription récente</p>
              </div>
            )}
          </div>
        </MotionDiv>

        {/* Top Parrains */}
        <MotionDiv preset="fadeUp" delay={0.2}>
          <div className="card-hover">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-500/5">
                <Users className="w-5 h-5 text-accent-400" />
              </div>
              Top 10 Parrains
            </h2>
            {(analytics?.topReferrers?.length ?? 0) > 0 ? (
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {analytics!.topReferrers.map((r, i: number) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                          i < 3
                            ? 'bg-gradient-to-br from-primary-500/20 to-accent-500/10 text-primary-400'
                            : 'bg-white/[0.04] text-dark-400'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <div className="font-medium text-sm text-white">{r.name}</div>
                        <div className="text-dark-500 text-xs">{r.email}</div>
                      </div>
                    </div>
                    <span className="text-primary-400 font-semibold text-sm">
                      {r.referrals} filleuls
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <p className="text-dark-500">Aucun parrain</p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Tâches */}
        <MotionDiv preset="fadeUp" delay={0.25}>
          <div className="card-hover">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-primary-500/5">
                <ListTodo className="w-5 h-5 text-primary-400" />
              </div>
              Top Tâches
            </h2>
            {(analytics?.topTasks?.length ?? 0) > 0 ? (
              <div className="space-y-1">
                {analytics!.topTasks.map((t, i: number) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center justify-between py-2.5 border-b border-white/[0.04] last:border-0"
                  >
                    <div>
                      <div className="font-medium text-sm text-white">{t.title}</div>
                      <div className="text-dark-500 text-xs">
                        {t.type} — {Number(t.reward)} FCFA
                      </div>
                    </div>
                    <span className="badge bg-primary-500/10 text-primary-400 border-primary-500/20">
                      {t.completionCount}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="empty-state py-8">
                <p className="text-dark-500">Aucune tâche</p>
              </div>
            )}
          </div>
        </MotionDiv>

        {/* Tâches par type */}
        <MotionDiv preset="fadeUp" delay={0.3}>
          <div className="card-hover">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-accent-500/20 to-accent-500/5">
                <BarChart3 className="w-5 h-5 text-accent-400" />
              </div>
              Tâches par type
            </h2>
            {(analytics?.tasksByType?.length ?? 0) > 0 ? (
              <div className="space-y-4">
                {analytics!.tasksByType.map((t) => {
                  const total = analytics!.tasksByType.reduce((a: number, b) => a + b.count, 0);
                  const pct = total > 0 ? Math.round((t.count / total) * 100) : 0;
                  const colors: Record<string, string> = {
                    VIDEO_AD: 'from-danger-500 to-danger-400',
                    CLICK_AD: 'from-primary-500 to-primary-400',
                    SURVEY: 'from-success-500 to-success-400',
                    SPONSORED: 'from-accent-500 to-accent-400',
                  };
                  return (
                    <div key={t.type}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="text-dark-300 font-medium">
                          {t.type.replace('_', ' ')}
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
                          className={`h-full rounded-full bg-gradient-to-r ${colors[t.type] || 'from-primary-500 to-primary-400'}`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="empty-state py-8">
                <p className="text-dark-500">Aucune donnée</p>
              </div>
            )}
          </div>
        </MotionDiv>
      </div>
    </div>
  );
}
