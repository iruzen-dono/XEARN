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
import { AnimatedCard, DashboardSkeleton } from '../../src/components/Animated';
import { colors, borderRadius, shadows } from '../../src/theme';
import { scale, moderateScale, safeArea } from '../../src/utils/responsive';
import type { TasksPage, Task } from '../../src/types';

export default function TasksTab() {
  const [data, setData] = useState<TasksPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      const res = await api.get<TasksPage>('/tasks');
      setData(res);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Impossible de charger les tâches.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function handleStartTask(taskId: string) {
    setActionLoading(taskId);
    try {
      await api.post(`/tasks/${taskId}/start`);
      Alert.alert('✅ Démarrée', 'Tâche démarrée !');
      fetchTasks(true);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert('Erreur', e.message);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompleteTask(taskId: string) {
    setActionLoading(`complete-${taskId}`);
    try {
      await api.post(`/tasks/${taskId}/complete`);
      Alert.alert('✅ Terminée', 'Tâche terminée !');
      fetchTasks(true);
    } catch (e) {
      if (e instanceof ApiError) Alert.alert('Erreur', e.message);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) return <ErrorScreen message={error} onRetry={() => fetchTasks()} />;

  if (!data) return null;

  const activeTasks = data.tasks.filter((t) => t.status === 'ACTIVE');

  return (
    <ScrollView
      style={s.container}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchTasks(true)}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.bg}
        />
      }
    >
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.pageTitle}>Tâches</Text>
          <Text style={s.pageSubtitle}>
            {data.total} tâche{data.total > 1 ? 's' : ''} disponible{data.total > 1 ? 's' : ''}
          </Text>
        </View>
        <View style={s.totalReward}>
          <Ionicons name="cash-outline" size={scale(16)} color={colors.secondary} />
          <Text style={s.totalRewardText}>
            {activeTasks.reduce((sum, t) => sum + parseFloat(t.reward), 0).toLocaleString()} FCFA
          </Text>
        </View>
      </View>

      {/* ── Task List ── */}
      {activeTasks.length === 0 ? (
        <AnimatedCard delay={150} style={s.emptyCard}>
          <View style={s.emptyIcon}>
            <Ionicons name="checkmark-done-outline" size={scale(40)} color={colors.primary} />
          </View>
          <Text style={s.emptyTitle}>Tout est fait !</Text>
          <Text style={s.emptyText}>
            Aucune tâche disponible pour le moment. Reviens plus tard pour gagner plus !
          </Text>
        </AnimatedCard>
      ) : (
        activeTasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            actionLoading={actionLoading}
            onStart={() => handleStartTask(task.id)}
            onComplete={() => handleCompleteTask(task.id)}
          />
        ))
      )}

      {/* Bottom spacer */}
      <View style={{ height: safeArea.bottom + scale(20) }} />
    </ScrollView>
  );
}

function TaskCard({
  task,
  index,
  actionLoading,
  onStart,
  onComplete,
}: {
  task: Task;
  index: number;
  actionLoading: string | null;
  onStart: () => void;
  onComplete: () => void;
}) {
  const tier = task.requiredTier;
  return (
    <AnimatedCard delay={150 + index * 80} style={s.taskCard}>
      {/* Task type + tier badges */}
      <View style={s.taskHeader}>
        <View style={s.taskTypeBadge}>
          <Ionicons name={getTaskIcon(task.type)} size={scale(12)} color={colors.primary} />
          <Text style={s.taskTypeText}>{formatTaskType(task.type)}</Text>
        </View>
        {tier !== 'NORMAL' && (
          <View style={[s.tierBadge, tier === 'PREMIUM' ? s.tierPremiumBadge : s.tierVipBadge]}>
            <Text style={s.tierText}>{tier}</Text>
          </View>
        )}
      </View>

      {/* Title + description */}
      <Text style={s.taskTitle}>{task.title}</Text>
      {task.description ? <Text style={s.taskDesc}>{task.description}</Text> : null}

      {/* Meta row */}
      <View style={s.taskMeta}>
        <View style={s.metaItem}>
          <Ionicons name="cash-outline" size={scale(15)} color={colors.secondary} />
          <Text style={s.metaReward}>+{parseFloat(task.reward).toLocaleString()} FCFA</Text>
        </View>
        {task.maxCompletions && (
          <View style={s.metaItem}>
            <Ionicons name="repeat-outline" size={scale(15)} color={colors.textMuted} />
            <Text style={s.metaText}>
              {task.completionCount}/{task.maxCompletions}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <Pressable
          style={[s.actionBtn, s.startBtn, actionLoading === task.id && s.btnDisabled]}
          onPress={onStart}
          disabled={actionLoading === task.id}
        >
          {actionLoading === task.id ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.actionBtnText}>Démarrer</Text>
          )}
        </Pressable>
        <Pressable
          style={[
            s.actionBtn,
            s.completeBtn,
            actionLoading === `complete-${task.id}` && s.btnDisabled,
          ]}
          onPress={onComplete}
          disabled={actionLoading === `complete-${task.id}`}
        >
          {actionLoading === `complete-${task.id}` ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={s.actionBtnText}>Terminer</Text>
          )}
        </Pressable>
      </View>
    </AnimatedCard>
  );
}

function getTaskIcon(type: string): string {
  const icons: Record<string, string> = {
    VIDEO_AD: 'videocam-outline',
    CLICK_AD: 'hand-left-outline',
    SURVEY: 'clipboard-outline',
    SPONSORED: 'sparkles-outline',
    EXTERNAL: 'open-outline',
  };
  return icons[type] ?? 'ellipse-outline';
}

function formatTaskType(type: string): string {
  const labels: Record<string, string> = {
    VIDEO_AD: 'Pub vidéo',
    CLICK_AD: 'Pub clic',
    SURVEY: 'Sondage',
    SPONSORED: 'Sponsorisé',
    EXTERNAL: 'Externe',
  };
  return labels[type] ?? type;
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
    alignItems: 'flex-start',
    marginBottom: scale(16),
  },
  pageTitle: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: colors.text,
    marginBottom: scale(2),
  },
  pageSubtitle: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
  },
  totalReward: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: colors.bgCard,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  totalRewardText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: colors.secondary,
  },
  // ── Empty ──
  emptyCard: {
    alignItems: 'center',
    paddingVertical: scale(40),
    gap: scale(12),
  },
  emptyIcon: {
    width: scale(64),
    height: scale(64),
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: colors.text,
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    paddingHorizontal: scale(20),
  },
  // ── Task Card ──
  taskCard: {
    padding: scale(16),
    marginBottom: scale(10),
  },
  taskHeader: {
    flexDirection: 'row',
    gap: scale(6),
    marginBottom: scale(10),
  },
  taskTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: borderRadius.sm,
  },
  taskTypeText: {
    color: colors.primary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: borderRadius.sm,
  },
  tierPremiumBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  tierVipBadge: {
    backgroundColor: 'rgba(168, 85, 247, 0.15)',
  },
  tierText: {
    color: colors.white,
    fontSize: moderateScale(10),
    fontWeight: '700',
  },
  taskTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.text,
    marginBottom: scale(4),
  },
  taskDesc: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
    lineHeight: moderateScale(18),
    marginBottom: scale(12),
  },
  taskMeta: {
    flexDirection: 'row',
    gap: scale(16),
    marginBottom: scale(14),
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  metaReward: {
    color: colors.secondary,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  metaText: {
    color: colors.textMuted,
    fontSize: moderateScale(13),
  },
  actions: {
    flexDirection: 'row',
    gap: scale(10),
  },
  actionBtn: {
    flex: 1,
    paddingVertical: scale(12),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtn: {
    backgroundColor: colors.primary,
  },
  completeBtn: {
    backgroundColor: colors.secondary,
  },
  actionBtnText: {
    color: colors.white,
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
