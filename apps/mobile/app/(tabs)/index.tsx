import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, ApiError } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
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

  if (!data) return null;

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
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour, {data.user.firstName}</Text>
        <View style={styles.tierBadge}>
          <Text style={styles.tierText}>{data.user.tier}</Text>
        </View>
      </View>

      {/* Balance card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Solde disponible</Text>
        <Text style={styles.balanceAmount}>
          {parseFloat(data.wallet.balance).toLocaleString()} FCFA
        </Text>
        <Text style={styles.earnedLabel}>
          Total gagné : {parseFloat(data.wallet.totalEarned).toLocaleString()} FCFA
        </Text>
      </View>

      {/* Quick stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {parseFloat(data.stats.todayEarnings).toLocaleString()} FCFA
          </Text>
          <Text style={styles.statLabel}>Aujourd'hui</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.stats.activeReferrals}</Text>
          <Text style={styles.statLabel}>Filleuls actifs</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{data.stats.pendingWithdrawals}</Text>
          <Text style={styles.statLabel}>Retraits en attente</Text>
        </View>
      </View>

      {/* Recent tasks */}
      <Text style={styles.sectionTitle}>Tâches récentes</Text>
      {data.recentTasks.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Aucune tâche effectuée récemment.</Text>
        </View>
      ) : (
        data.recentTasks.map((task) => (
          <View key={task.id} style={styles.taskRow}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle}>{task.task?.title ?? 'Tâche'}</Text>
              <Text style={styles.taskDate}>
                {new Date(task.createdAt).toLocaleDateString('fr-FR')}
              </Text>
            </View>
            <Text style={styles.taskReward}>+{parseFloat(task.earned).toLocaleString()} FCFA</Text>
          </View>
        ))
      )}
    </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: '700',
    color: '#f1f5f9',
  },
  tierBadge: {
    backgroundColor: '#14b8a6',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
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
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f1f5f9',
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
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
  taskRow: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  taskDate: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  taskReward: {
    color: '#14b8a6',
    fontSize: 14,
    fontWeight: '700',
  },
});
