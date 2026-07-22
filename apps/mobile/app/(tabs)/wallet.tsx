import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
import { AnimatedCard, AnimatedBalance, DashboardSkeleton } from '../../src/components/Animated';
import { colors, fontSize, spacing, borderRadius, shadows, gradients } from '../../src/theme';
import { scale, moderateScale, safeArea } from '../../src/utils/responsive';
import type { WalletData, WalletOverview, TierPricing } from '../../src/types';

export default function WalletTab() {
  const [data, setData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<WalletOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const fetchWallet = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const [walletRes, txRes] = await Promise.all([
        api.get<WalletData>('/wallet'),
        api.get<WalletOverview>('/wallet/overview'),
      ]);
      setData(walletRes);
      setTransactions(txRes);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Impossible de charger le portefeuille.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  async function handleWithdraw() {
    Alert.prompt?.(
      'Retrait',
      'Montant à retirer (FCFA) :',
      async (amount) => {
        const num = parseInt(amount, 10);
        if (isNaN(num) || num <= 0) {
          Alert.alert('Erreur', 'Montant invalide.');
          return;
        }
        setWithdrawing(true);
        try {
          await api.post('/wallet/withdraw', { amount: num });
          Alert.alert('✅ Succès', 'Demande de retrait envoyée.');
          fetchWallet(true);
        } catch (e) {
          if (e instanceof ApiError) Alert.alert('Erreur', e.message);
        } finally {
          setWithdrawing(false);
        }
      },
      'plain-text',
      '',
      'number',
    );
  }

  if (loading) return <DashboardSkeleton />;

  if (error) return <ErrorScreen message={error} onRetry={() => fetchWallet()} />;

  if (!data || !transactions) return null;

  const balance = parseFloat(data.wallet.balance);
  const totalEarned = parseFloat(data.wallet.totalEarned);
  const monthlyEarnings = parseFloat(data.wallet.monthlyEarnings);
  const monthlyWithdrawals = parseFloat(data.wallet.monthlyWithdrawals);
  const minWithdrawal = data.fees.minimumWithdrawal;

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchWallet(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.bg}
        />
      }
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <Text style={s.pageTitle}>Portefeuille</Text>
        <View style={s.headerRight}>
          <View style={s.monthBadge}>
            <Text style={s.monthText}>
              {new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
            </Text>
          </View>
        </View>
      </View>

      {/* ── Balance Card Premium ── */}
      <AnimatedCard delay={100} style={s.balanceCard}>
        <Text style={s.balanceLabel}>Solde disponible</Text>
        <AnimatedBalance amount={balance} currency="FCFA" style={s.balanceAmount} />
        <View style={s.earnedRow}>
          <Ionicons name="trending-up-outline" size={scale(14)} color={colors.success} />
          <Text style={s.earnedText}>Total gagné : {totalEarned.toLocaleString()} FCFA</Text>
        </View>

        {/* Monthly stats */}
        <View style={s.monthlyStats}>
          <View style={s.monthlyItem}>
            <Text style={s.monthlyLabel}>Gains du mois</Text>
            <Text style={s.monthlyValue}>{monthlyEarnings.toLocaleString()} FCFA</Text>
          </View>
          <View style={s.monthlyDivider} />
          <View style={s.monthlyItem}>
            <Text style={s.monthlyLabel}>Retraits du mois</Text>
            <Text style={[s.monthlyValue, { color: colors.danger }]}>
              {monthlyWithdrawals.toLocaleString()} FCFA
            </Text>
          </View>
        </View>

        {/* Withdraw button */}
        <Pressable
          style={[s.withdrawBtn, (balance < minWithdrawal || withdrawing) && s.btnDisabled]}
          onPress={handleWithdraw}
          disabled={balance < minWithdrawal || withdrawing}
        >
          {withdrawing ? (
            <ActivityIndicator color={colors.white} size="small" />
          ) : (
            <>
              <Ionicons name="arrow-down-outline" size={scale(18)} color={colors.white} />
              <Text style={s.withdrawBtnText}>Effectuer un retrait</Text>
            </>
          )}
        </Pressable>

        {/* Fees info */}
        <View style={s.feesRow}>
          <Text style={s.feeText}>Frais : {data.fees.withdrawalFeePercent}%</Text>
          <Text style={s.feeText}>Min : {minWithdrawal.toLocaleString()} FCFA</Text>
        </View>
      </AnimatedCard>

      {/* ── Upgrade Tiers ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Améliorer votre tier</Text>
      </View>

      <View style={s.tierRow}>
        <UpgradeTierCard
          tier="PREMIUM"
          price={5000}
          icon="diamond-outline"
          color={colors.secondary}
          delay={200}
        />
        <UpgradeTierCard
          tier="VIP"
          price={15000}
          icon="infinite-outline"
          color={colors.purple}
          delay={250}
        />
      </View>

      {/* ── Transactions ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Transactions récentes</Text>
      </View>

      {transactions.recentTransactions.length === 0 ? (
        <AnimatedCard delay={300} style={s.emptyCard}>
          <Ionicons name="receipt-outline" size={scale(36)} color={colors.textDim} />
          <Text style={s.emptyText}>Aucune transaction pour le moment.</Text>
        </AnimatedCard>
      ) : (
        transactions.recentTransactions.map((tx, i) => {
          const isCredit = !['WITHDRAWAL', 'TIER_UPGRADE'].includes(tx.type);
          return (
            <AnimatedCard key={tx.id} delay={300 + i * 60} style={s.txCard}>
              <View style={s.txRow}>
                <View
                  style={[
                    s.txIcon,
                    { backgroundColor: isCredit ? colors.primaryGlow : colors.dangerGlow },
                  ]}
                >
                  <Ionicons
                    name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={scale(20)}
                    color={isCredit ? colors.primary : colors.danger}
                  />
                </View>
                <View style={s.txInfo}>
                  <Text style={s.txType}>{formatTxType(tx.type)}</Text>
                  <Text style={s.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <View style={s.txRight}>
                  <Text style={[s.txAmount, { color: isCredit ? colors.primary : colors.danger }]}>
                    {isCredit ? '+' : '-'}
                    {parseFloat(tx.amount).toLocaleString()}
                  </Text>
                  <Text style={s.txCurrency}>FCFA</Text>
                </View>
              </View>
            </AnimatedCard>
          );
        })
      )}

      <View style={{ height: safeArea.bottom + scale(20) }} />
    </ScrollView>
  );
}

function formatTxType(type: string): string {
  const labels: Record<string, string> = {
    ACTIVATION: 'Activation',
    TASK_EARNING: 'Gain tâche',
    REFERRAL_L1: 'Commission L1',
    REFERRAL_L2: 'Commission L2',
    REFERRAL_L3: 'Commission L3',
    WITHDRAWAL: 'Retrait',
    TIER_UPGRADE: 'Upgrade tier',
    PUB_MAKER: 'Publicité',
  };
  return labels[type] ?? type;
}

function UpgradeTierCard({
  tier,
  price,
  icon,
  color,
  delay,
}: {
  tier: string;
  price: number;
  icon: string;
  color: string;
  delay: number;
}) {
  async function handleUpgrade() {
    try {
      await api.post('/wallet/upgrade-tier', { tier });
      Alert.alert('✅ Succès', `Tier ${tier} activé !`);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert('Erreur', e.message);
    }
  }

  return (
    <AnimatedCard
      delay={delay}
      style={[s.tierCard, { borderColor: color }]}
      onPress={handleUpgrade}
    >
      <View style={[s.tierIconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon as any} size={scale(26)} color={color} />
      </View>
      <Text style={[s.tierName, { color }]}>{tier}</Text>
      <Text style={s.tierPrice}>{price.toLocaleString()} FCFA</Text>
      <Text style={s.tierPeriod}>/ mois</Text>
    </AnimatedCard>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
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
    marginBottom: scale(16),
  },
  pageTitle: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: colors.text,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  monthBadge: {
    backgroundColor: colors.bgCard,
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  monthText: {
    fontSize: moderateScale(11),
    color: colors.textMuted,
    fontWeight: '600',
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
  balanceLabel: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
    marginBottom: scale(4),
  },
  balanceAmount: {
    fontSize: moderateScale(36, 0.3),
    fontWeight: '900',
    color: colors.primary,
    letterSpacing: -1,
    marginBottom: scale(2),
  },
  earnedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginBottom: scale(16),
  },
  earnedText: {
    fontSize: moderateScale(12),
    color: colors.textMuted,
  },
  monthlyStats: {
    flexDirection: 'row',
    backgroundColor: colors.bgCardAlt,
    borderRadius: borderRadius.lg,
    padding: scale(14),
    marginBottom: scale(16),
  },
  monthlyItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthlyLabel: {
    fontSize: moderateScale(11),
    color: colors.textDim,
    marginBottom: scale(4),
  },
  monthlyValue: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: colors.text,
  },
  monthlyDivider: {
    width: 1,
    backgroundColor: colors.border,
    marginHorizontal: scale(12),
  },
  withdrawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: colors.primary,
    paddingVertical: scale(14),
    borderRadius: borderRadius.lg,
    ...shadows.glow,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  withdrawBtnText: {
    color: colors.white,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: scale(10),
  },
  feeText: {
    fontSize: moderateScale(11),
    color: colors.textDim,
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
  // ── Tier Cards ──
  tierRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(20),
  },
  tierCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: scale(20),
    borderWidth: 1,
  },
  tierIconWrap: {
    width: scale(48),
    height: scale(48),
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
  },
  tierName: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    marginBottom: scale(4),
  },
  tierPrice: {
    fontSize: moderateScale(20),
    fontWeight: '900',
    color: colors.text,
  },
  tierPeriod: {
    fontSize: moderateScale(11),
    color: colors.textDim,
    marginTop: scale(2),
  },
  // ── Transactions ──
  txCard: {
    padding: scale(12),
    marginBottom: scale(6),
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  txIcon: {
    width: scale(38),
    height: scale(38),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txType: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: colors.text,
    marginBottom: scale(2),
  },
  txDate: {
    fontSize: moderateScale(11),
    color: colors.textDim,
  },
  txRight: { alignItems: 'flex-end' },
  txAmount: {
    fontSize: moderateScale(15),
    fontWeight: '800',
  },
  txCurrency: {
    fontSize: moderateScale(10),
    color: colors.textDim,
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
});
