import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
import { AnimatedCard, AnimatedBalance, DashboardSkeleton } from '../../src/components/Animated';
import { colors, fontSize, spacing, borderRadius, shadows, gradients } from '../../src/theme';
import { scale, moderateScale, safeArea } from '../../src/utils/responsive';
import type { DashboardData } from '../../src/types';

export default function DashboardTab() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await api.get<DashboardData>('/wallet/overview');
      setData(res);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Impossible de charger le tableau de bord.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <DashboardSkeleton />;

  if (error) return <ErrorScreen message={error} onRetry={() => fetchData()} />;

  if (!data) return null;

  const balance = parseFloat(data.wallet.balance);
  const todayEarnings = parseFloat(data.stats.todayEarnings);
  const tier = data.user.tier;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.bg}
        />
      }
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>Bonjour 👋</Text>
          <Text style={s.userName}>{data.user.firstName}</Text>
        </View>
        <View style={s.headerRight}>
          <Pressable style={s.notifBtn}>
            <Ionicons name="notifications-outline" size={scale(22)} color={colors.text} />
            {data.recentTasks.length > 0 && <View style={s.notifDot} />}
          </Pressable>
          <View style={s.avatar}>
            <Text style={s.avatarText}>
              {data.user.firstName[0]}
              {data.user.lastName[0]}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Balance Card Premium ── */}
      <AnimatedCard delay={100} style={s.balanceCard}>
        <View style={s.balanceHeader}>
          <Text style={s.balanceLabel}>Solde disponible</Text>
          <View
            style={[
              s.tierBadge,
              tier === 'PREMIUM' ? s.tierPremium : tier === 'VIP' ? s.tierVip : s.tierNormal,
            ]}
          >
            <Text
              style={[s.tierText, { color: tier === 'NORMAL' ? colors.tierNormal : colors.white }]}
            >
              {tier}
            </Text>
          </View>
        </View>

        <AnimatedBalance amount={balance} currency="FCFA" style={s.balanceAmount} />

        <View style={s.balanceFooter}>
          <View style={s.earnedRow}>
            <Ionicons name="trending-up" size={scale(14)} color={colors.success} />
            <Text style={s.earnedText}>
              +{parseFloat(data.wallet.totalEarned).toLocaleString()} FCFA gagnés
            </Text>
          </View>
        </View>

        <View style={s.balanceActions}>
          <Pressable style={s.btnPrimary}>
            <Ionicons name="arrow-down-outline" size={scale(16)} color={colors.white} />
            <Text style={s.btnPrimaryText}>Retirer</Text>
          </Pressable>
          <Pressable style={s.btnSecondary}>
            <Ionicons name="swap-vertical-outline" size={scale(16)} color={colors.text} />
            <Text style={s.btnSecondaryText}>Détails</Text>
          </Pressable>
        </View>
      </AnimatedCard>

      {/* ── Quick Stats ── */}
      <View style={s.statsRow}>
        <AnimatedCard delay={200} style={s.statCardSmall}>
          <View style={s.statIconWrap}>
            <Ionicons name="cash-outline" size={scale(18)} color={colors.primary} />
          </View>
          <Text style={s.statValue}>{todayEarnings.toLocaleString()} FCFA</Text>
          <Text style={s.statLabel}>Aujourd'hui</Text>
        </AnimatedCard>
        <AnimatedCard delay={250} style={s.statCardSmall}>
          <View style={[s.statIconWrap, { backgroundColor: colors.secondaryGlow }]}>
            <Ionicons name="flame-outline" size={scale(18)} color={colors.secondary} />
          </View>
          <Text style={s.statValue}>{data.stats.activeReferrals}</Text>
          <Text style={s.statLabel}>Filleuls actifs</Text>
        </AnimatedCard>
        <AnimatedCard delay={300} style={s.statCardSmall}>
          <View style={[s.statIconWrap, { backgroundColor: colors.successGlow }]}>
            <Ionicons name="checkmark-circle-outline" size={scale(18)} color={colors.success} />
          </View>
          <Text style={s.statValue}>{data.stats.pendingWithdrawals}</Text>
          <Text style={s.statLabel}>En attente</Text>
        </AnimatedCard>
      </View>

      {/* ── Section Title ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Tâches récentes</Text>
        <Pressable>
          <Text style={s.sectionLink}>Voir tout →</Text>
        </Pressable>
      </View>

      {/* ── Recent Tasks ── */}
      {data.recentTasks.length === 0 ? (
        <AnimatedCard delay={350} style={s.emptyCard}>
          <Ionicons name="checkmark-done-outline" size={scale(36)} color={colors.textDim} />
          <Text style={s.emptyText}>Aucune tâche effectuée récemment.</Text>
          <Text style={s.emptySubtext}>Lance-toi dans les tâches disponibles !</Text>
        </AnimatedCard>
      ) : (
        data.recentTasks.map((task, i) => (
          <AnimatedCard key={task.id} delay={350 + i * 80} style={s.taskCard}>
            <View style={s.taskRow}>
              <View style={s.taskIcon}>
                <Ionicons name="play-circle-outline" size={scale(24)} color={colors.primary} />
              </View>
              <View style={s.taskInfo}>
                <Text style={s.taskTitle}>{task.task?.title ?? 'Tâche'}</Text>
                <Text style={s.taskDate}>
                  {new Date(task.createdAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </View>
              <View style={s.taskRewardWrap}>
                <Text style={s.taskReward}>+{parseFloat(task.earned).toLocaleString()}</Text>
                <Text style={s.taskRewardCurrency}>FCFA</Text>
              </View>
            </View>
          </AnimatedCard>
        ))
      )}

      {/* Bottom spacer for tab bar */}
      <View style={{ height: safeArea.bottom + scale(20) }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: safeArea.top + scale(10),
    paddingBottom: scale(10),
  },
  // ── Header ──
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  greeting: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
    marginBottom: scale(2),
  },
  userName: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  notifBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgCard,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifDot: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: colors.danger,
    borderWidth: 2,
    borderColor: colors.bgCard,
  },
  avatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.white,
    fontSize: moderateScale(16),
    fontWeight: '800',
  },
  // ── Balance Card ──
  balanceCard: {
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius['2xl'],
    padding: scale(20),
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.12)',
    marginBottom: scale(16),
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  balanceLabel: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
  },
  tierBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: borderRadius.full,
  },
  tierNormal: {
    backgroundColor: 'rgba(148, 163, 184, 0.1)',
  },
  tierPremium: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  tierVip: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  tierText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: moderateScale(36, 0.3),
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
    marginBottom: scale(4),
  },
  balanceFooter: {
    marginBottom: scale(16),
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  earnedText: {
    fontSize: moderateScale(12),
    color: colors.textMuted,
  },
  balanceActions: {
    flexDirection: 'row',
    gap: scale(10),
  },
  btnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: colors.primary,
    paddingVertical: scale(12),
    borderRadius: borderRadius.lg,
    ...shadows.glow,
  },
  btnPrimaryText: {
    color: colors.white,
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  btnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    backgroundColor: colors.bgCardAlt,
    paddingVertical: scale(12),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnSecondaryText: {
    color: colors.text,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  // ── Quick Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(20),
  },
  statCardSmall: {
    flex: 1,
    backgroundColor: colors.bgCard,
    borderRadius: borderRadius.lg,
    padding: scale(14),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statIconWrap: {
    width: scale(34),
    height: scale(34),
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  statValue: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.text,
    marginBottom: scale(2),
  },
  statLabel: {
    fontSize: moderateScale(11),
    color: colors.textMuted,
  },
  // ── Section ──
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: colors.text,
  },
  sectionLink: {
    fontSize: moderateScale(13),
    color: colors.primary,
    fontWeight: '600',
  },
  // ── Empty ──
  emptyCard: {
    alignItems: 'center',
    paddingVertical: scale(32),
    gap: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: moderateScale(12),
    color: colors.textDim,
    textAlign: 'center',
  },
  // ── Task Card ──
  taskCard: {
    padding: scale(14),
    marginBottom: scale(8),
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  taskIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scale(2),
  },
  taskDate: {
    fontSize: moderateScale(11),
    color: colors.textDim,
  },
  taskRewardWrap: {
    alignItems: 'flex-end',
  },
  taskReward: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.secondary,
  },
  taskRewardCurrency: {
    fontSize: moderateScale(10),
    color: colors.textDim,
  },
});
