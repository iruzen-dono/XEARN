import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
import type { ReferralStats, ReferralTree, Commission } from '../../src/types';

export default function ReferralsTab() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [tree, setTree] = useState<ReferralTree | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const code = await SecureStore.getItemAsync('xearn_referral_code');
      if (code) setReferralCode(code);

      const [statsRes, treeRes, commRes] = await Promise.all([
        api.get<ReferralStats>('/referrals/stats'),
        api.get<ReferralTree>('/referrals/tree'),
        api.get<{ data: Commission[] }>('/referrals/commissions'),
      ]);

      setStats(statsRes);
      setTree(treeRes);
      setCommissions(commRes.data ?? []);

      // Cache referral code if returned in stats
      // (it may be available from the user profile)
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Impossible de charger les données de parrainage.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleShareCode() {
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Rejoins XEARN avec mon code de parrainage : ${referralCode}. Gagne de l'argent en effectuant des tâches simples !`,
      });
    } catch {
      // user cancelled
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#14b8a6" />
      </View>
    );
  }

  if (error) {
    return <ErrorScreen message={error} onRetry={() => fetchData()} />;
  }

  if (!stats) return null;

  const totalReferrals =
    (tree?.level1.length ?? 0) + (tree?.level2.length ?? 0) + (tree?.level3.length ?? 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor="#14b8a6"
          colors={['#14b8a6']}
        />
      }
    >
      <Text style={styles.pageTitle}>Parrainage</Text>

      {/* Referral code */}
      {referralCode ? (
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>Votre code de parrainage</Text>
          <Text style={styles.codeValue}>{referralCode}</Text>
          <Pressable style={styles.shareButton} onPress={handleShareCode}>
            <Ionicons name="share-outline" size={18} color="#ffffff" />
            <Text style={styles.shareText}>Partager</Text>
          </Pressable>
        </View>
      ) : null}

      {/* Level stats */}
      <View style={styles.statsRow}>
        <StatCard label="Niveau 1" value={stats.totalLevel1} color="#14b8a6" />
        <StatCard label="Niveau 2" value={stats.totalLevel2} color="#f59e0b" />
        {stats.l3Active && <StatCard label="Niveau 3" value={stats.totalLevel3} color="#8b5cf6" />}
      </View>

      {/* Commission summary */}
      <Text style={styles.sectionTitle}>Commissions</Text>
      <View style={styles.commissionSummary}>
        <View style={styles.commItem}>
          <Text style={styles.commLabel}>Total</Text>
          <Text style={styles.commValue}>
            {parseFloat(stats.totalCommissions).toLocaleString()} FCFA
          </Text>
        </View>
        <View style={styles.commItem}>
          <Text style={styles.commLabel}>L1 ({stats.l1Percent}%)</Text>
          <Text style={styles.commValue}>
            {parseFloat(stats.commissionsL1).toLocaleString()} FCFA
          </Text>
        </View>
        <View style={styles.commItem}>
          <Text style={styles.commLabel}>L2 ({stats.l2Percent}%)</Text>
          <Text style={styles.commValue}>
            {parseFloat(stats.commissionsL2).toLocaleString()} FCFA
          </Text>
        </View>
        {stats.l3Active && (
          <View style={styles.commItem}>
            <Text style={styles.commLabel}>L3 ({stats.l3Percent}%)</Text>
            <Text style={styles.commValue}>
              {parseFloat(stats.commissionsL3).toLocaleString()} FCFA
            </Text>
          </View>
        )}
      </View>

      {/* Referral tree */}
      {tree && (
        <>
          <Text style={styles.sectionTitle}>Mon réseau ({totalReferrals})</Text>
          {tree.level1.length > 0 && (
            <ReferralLevel
              title={`Niveau 1 (${tree.level1.length})`}
              users={tree.level1}
              color="#14b8a6"
            />
          )}
          {tree.level2.length > 0 && (
            <ReferralLevel
              title={`Niveau 2 (${tree.level2.length})`}
              users={tree.level2}
              color="#f59e0b"
            />
          )}
          {tree.level3.length > 0 && (
            <ReferralLevel
              title={`Niveau 3 (${tree.level3.length})`}
              users={tree.level3}
              color="#8b5cf6"
            />
          )}
          {totalReferrals === 0 && (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>
                Vous n'avez pas encore de filleuls. Partagez votre code pour commencer à gagner des
                commissions !
              </Text>
            </View>
          )}
        </>
      )}

      {/* Commission history */}
      {commissions.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Historique des commissions</Text>
          {commissions.map((comm) => (
            <View key={comm.id} style={styles.commRow}>
              <View style={styles.commLeft}>
                <Text style={styles.commSource}>
                  {comm.sourceUser?.firstName} {comm.sourceUser?.lastName}
                </Text>
                <Text style={styles.commLevel}>Niveau {comm.level}</Text>
              </View>
              <View style={styles.commRight}>
                <Text style={styles.commPercent}>{parseFloat(comm.percentage).toFixed(1)}%</Text>
                <Text style={styles.commAmount}>
                  +{parseFloat(comm.amount).toLocaleString()} FCFA
                </Text>
              </View>
            </View>
          ))}
        </>
      )}

      {commissions.length === 0 && totalReferrals === 0 && (
        <View style={styles.emptyBox}>
          <Ionicons name="people-outline" size={40} color="#64748b" />
          <Text style={styles.emptyText}>
            Invitez vos amis via votre code de parrainage et gagnez des commissions sur leurs gains
            !
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function ReferralLevel({
  title,
  users,
  color,
}: {
  title: string;
  users: { id: string; firstName: string; lastName: string; status: string }[];
  color: string;
}) {
  return (
    <View style={styles.levelBlock}>
      <Text style={[styles.levelTitle, { color }]}>{title}</Text>
      {users.map((u) => (
        <View key={u.id} style={styles.userRow}>
          <Ionicons name="person-outline" size={18} color="#94a3b8" />
          <Text style={styles.userName}>
            {u.firstName} {u.lastName}
          </Text>
          <View
            style={[
              styles.userStatus,
              {
                backgroundColor:
                  u.status === 'ACTIVATED' ? 'rgba(20, 184, 166, 0.2)' : 'rgba(100, 116, 139, 0.2)',
              },
            ]}
          >
            <Text
              style={[
                styles.userStatusText,
                {
                  color: u.status === 'ACTIVATED' ? '#14b8a6' : '#64748b',
                },
              ]}
            >
              {u.status === 'ACTIVATED' ? 'Actif' : 'Inactif'}
            </Text>
          </View>
        </View>
      ))}
    </View>
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
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f1f5f9',
    marginBottom: 16,
  },
  codeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#14b8a6',
  },
  codeLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 8,
  },
  codeValue: {
    color: '#14b8a6',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: 12,
  },
  shareButton: {
    backgroundColor: '#14b8a6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  shareText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    marginTop: 8,
  },
  commissionSummary: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  commLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  commValue: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  levelBlock: {
    marginBottom: 12,
  },
  levelTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
  },
  userName: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
  },
  userStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  userStatusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  commRow: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  commLeft: {
    flex: 1,
  },
  commSource: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  commLevel: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  commRight: {
    alignItems: 'flex-end',
  },
  commPercent: {
    color: '#94a3b8',
    fontSize: 12,
  },
  commAmount: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '700',
  },
});
