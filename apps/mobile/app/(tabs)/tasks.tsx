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
      Alert.alert('Succès', 'Tâche démarrée !');
      fetchTasks(true);
    } catch (e) {
      if (e instanceof ApiError) {
        Alert.alert('Erreur', e.message);
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCompleteTask(taskId: string) {
    setActionLoading(`complete-${taskId}`);
    try {
      await api.post(`/tasks/${taskId}/complete`);
      Alert.alert('Succès', 'Tâche terminée !');
      fetchTasks(true);
    } catch (e) {
      if (e instanceof ApiError) {
        Alert.alert('Erreur', e.message);
      }
    } finally {
      setActionLoading(null);
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
    return <ErrorScreen message={error} onRetry={() => fetchTasks()} />;
  }

  if (!data) return null;

  const activeTasks = data.tasks.filter((t) => t.status === 'ACTIVE');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchTasks(true)}
          tintColor="#14b8a6"
          colors={['#14b8a6']}
        />
      }
    >
      <Text style={styles.pageTitle}>Tâches disponibles</Text>
      <Text style={styles.pageSubtitle}>
        {data.total} tâche{data.total > 1 ? 's' : ''} disponible
        {data.total > 1 ? 's' : ''}
      </Text>

      {activeTasks.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="checkmark-done-outline" size={40} color="#64748b" />
          <Text style={styles.emptyText}>
            Aucune tâche disponible pour le moment. Revenez plus tard !
          </Text>
        </View>
      ) : (
        activeTasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            actionLoading={actionLoading}
            onStart={() => handleStartTask(task.id)}
            onComplete={() => handleCompleteTask(task.id)}
          />
        ))
      )}
    </ScrollView>
  );
}

function TaskCard({
  task,
  actionLoading,
  onStart,
  onComplete,
}: {
  task: Task;
  actionLoading: string | null;
  onStart: () => void;
  onComplete: () => void;
}) {
  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTypeBadge}>
          <Text style={styles.taskTypeText}>{formatTaskType(task.type)}</Text>
        </View>
        {task.requiredTier !== 'NORMAL' && (
          <View style={styles.tierBadge}>
            <Text style={styles.tierText}>{task.requiredTier}</Text>
          </View>
        )}
      </View>

      <Text style={styles.taskTitle}>{task.title}</Text>
      {task.description ? <Text style={styles.taskDesc}>{task.description}</Text> : null}

      <View style={styles.taskMeta}>
        <View style={styles.metaItem}>
          <Ionicons name="cash-outline" size={16} color="#14b8a6" />
          <Text style={styles.metaText}>{parseFloat(task.reward).toLocaleString()} FCFA</Text>
        </View>
        {task.maxCompletions && (
          <View style={styles.metaItem}>
            <Ionicons name="repeat-outline" size={16} color="#94a3b8" />
            <Text style={styles.metaText}>
              {task.completionCount}/{task.maxCompletions}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[
            styles.actionButton,
            styles.startButton,
            actionLoading === task.id && styles.buttonDisabled,
          ]}
          onPress={onStart}
          disabled={actionLoading === task.id}
        >
          {actionLoading === task.id ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.actionButtonText}>Démarrer</Text>
          )}
        </Pressable>
        <Pressable
          style={[
            styles.actionButton,
            styles.completeButton,
            actionLoading === `complete-${task.id}` && styles.buttonDisabled,
          ]}
          onPress={onComplete}
          disabled={actionLoading === `complete-${task.id}`}
        >
          {actionLoading === `complete-${task.id}` ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={styles.actionButtonText}>Terminer</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
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
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 20,
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 32,
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
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskHeader: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  taskTypeBadge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  taskTypeText: {
    color: '#14b8a6',
    fontSize: 11,
    fontWeight: '600',
  },
  tierBadge: {
    backgroundColor: '#f59e0b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tierText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  taskTitle: {
    color: '#f1f5f9',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  taskDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 12,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  startButton: {
    backgroundColor: '#14b8a6',
  },
  completeButton: {
    backgroundColor: '#f59e0b',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
