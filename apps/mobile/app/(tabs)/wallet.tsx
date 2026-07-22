import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, ApiError } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
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
    Alert.prompt(
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
          Alert.alert('Succès', 'Demande de retrait envoyée.');
          fetchWallet(true);
        } catch (e) {
          if (e instanceof ApiError) {
            Alert.alert('Erreur', e.message);
          }
        } finally {
          setWithdrawing(false);
        }
      },
      'plain-text',
      '',
      'number',
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={() => fetchWallet()} />;
  }

  if (!data || !transactions) return null;

  const balance = parseFloat(data.wallet.balance);
  const totalEarned = parseFloat(data.wallet.totalEarned);
  const minWithdrawal = data.fees.minimumWithdrawal;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchWallet(true)}
          tintColor="#14b8a6"
          colors={['#14b8a6']}
        />
      }
    >
      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceAmount}>{balance.toLocaleString()} FCFA</Text>
        <Text style={styles.earnedLabel}>Total gagné : {totalEarned.toLocaleString()} FCFA</Text>

        <View style={styles.feesRow}>
          <Text style={styles.feeText}>Frais de retrait : {data.fees.withdrawalFeePercent}%</Text>
          <Text style={styles.feeText}>Min. retrait : {minWithdrawal.toLocaleString()} FCFA</Text>
        </View>

        <Pressable
          style={[
            styles.withdrawButton,
            (balance < minWithdrawal || withdrawing) && styles.buttonDisabled,
          ]}
          onPress={handleWithdraw}
          disabled={balance < minWithdrawal || withdrawing}
        >
          {withdrawing ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.withdrawText}>Effectuer un retrait</Text>
          )}
        </Pressable>
      </View>

      {/* Upgrade tiers */}
      <Text style={styles.sectionTitle}>Améliorer votre tier</Text>
      <View style={styles.tierRow}>
        <UpgradeTierCard tier="PREMIUM" price={5000} />
        <UpgradeTierCard tier="VIP" price={15000} />
      </View>

      {/* Recent transactions */}
      <Text style={styles.sectionTitle}>Transactions récentes</Text>
      {transactions.recentTransactions.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Aucune transaction pour le moment.</Text>
        </View>
      ) : (
        transactions.recentTransactions.map((tx) => {
          const isCredit = !['WITHDRAWAL', 'TIER_UPGRADE'].includes(tx.type);
          return (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Ionicons
                  name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'}
                  size={20}
                  color={isCredit ? '#14b8a6' : '#ef4444'}
                />
                <View style={styles.txInfo}>
                  <Text style={styles.txType}>{formatTxType(tx.type)}</Text>
                  <Text style={styles.txDate}>
                    {new Date(tx.createdAt).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.txAmount, { color: isCredit ? '#14b8a6' : '#ef4444' }]}>
                {isCredit ? '+' : '-'}
                {parseFloat(tx.amount).toLocaleString()} FCFA
              </Text>
            </View>
          );
        })
      )}
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

function UpgradeTierCard({ tier, price }: { tier: string; price: number }) {
  const tierColor = tier === 'PREMIUM' ? '#f59e0b' : '#8b5cf6';

  async function handleUpgrade() {
    try {
      await api.post('/wallet/upgrade-tier', { tier });
      Alert.alert('Succès', 'Tier mis à jour !');
    } catch (e) {
      if (e instanceof ApiError) {
        Alert.alert('Erreur', e.message);
      }
    }
  }

  return (
    <Pressable style={styles.tierCard} onPress={handleUpgrade}>
      <Ionicons
        name={tier === 'PREMIUM' ? 'diamond-outline' : 'infinite-outline'}
        size={24}
        color={tierColor}
      />
      <Text style={[styles.tierName, { color: tierColor }]}>{tier}</Text>
      <Text style={styles.tierPrice}>{price.toLocaleString()} FCFA</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  content: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#14b8a6',
    marginBottom: 4,
  },
  earnedLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 12,
  },
  feesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  feeText: {
    color: '#64748b',
    fontSize: 12,
  },
  withdrawButton: {
    backgroundColor: '#14b8a6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  withdrawText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    marginTop: 8,
  },
  tierRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  tierCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  tierName: {
    fontSize: 14,
    fontWeight: '800',
    marginTop: 8,
  },
  tierPrice: {
    fontSize: 16,
    color: '#f1f5f9',
    fontWeight: '700',
    marginTop: 4,
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
  },
  txRow: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  txInfo: {
    flex: 1,
  },
  txType: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  txDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  txAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
});
