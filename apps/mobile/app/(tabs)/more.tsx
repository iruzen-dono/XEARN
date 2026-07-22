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
import { router } from 'expo-router';
import { api, ApiError, clearTokens, getToken } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
import type { User, DashboardData, Badge, StreakInfo, Notification } from '../../src/types';

export default function MoreTab() {
  const [profile, setProfile] = useState<User | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError('');

    try {
      // We can get user info from wallet/overview
      const [overview, notifRes] = await Promise.all([
        api.get<DashboardData>('/wallet/overview'),
        api.get<{ notifications: Notification[] }>('/notifications?limit=10'),
      ]);

      setProfile(overview.user);

      // Try to get gamification data — these may 404 if not implemented
      try {
        const streakRes = await api.get<StreakInfo>('/gamification/streak');
        setStreak(streakRes);
      } catch {
        // OK if not available
      }

      try {
        const badgesRes = await api.get<Badge[]>('/gamification/badges');
        setBadges(badgesRes);
      } catch {
        // OK if not available
      }

      setNotifications(notifRes.notifications ?? []);
    } catch (e) {
      if (e instanceof ApiError) {
        setError(e.message);
      } else {
        setError('Impossible de charger le profil.');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleLogout() {
    Alert.alert('Déconnexion', 'Êtes-vous sûr de vouloir vous déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Se déconnecter',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/auth/logout');
          } catch {
            // Ignore errors on logout
          }
          await clearTokens();
          router.replace('/login');
        },
      },
    ]);
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
      {/* Profile section */}
      {profile && (
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.firstName[0]}
              {profile.lastName[0]}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile.firstName} {profile.lastName}
            </Text>
            <Text style={styles.profileEmail}>{profile.email}</Text>
            <View style={styles.profileBadges}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{profile.tier}</Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{profile.role}</Text>
              </View>
            </View>
          </View>
          <Text style={styles.joinedDate}>
            Membre depuis{' '}
            {new Date(profile.createdAt).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}

      {/* Streak */}
      {streak && (
        <View style={styles.streakCard}>
          <Ionicons name="flame-outline" size={28} color="#f59e0b" />
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>Série actuelle</Text>
            <Text style={styles.streakValue}>
              {streak.currentStreak} jour{streak.currentStreak > 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.streakDivider} />
          <View style={styles.streakInfo}>
            <Text style={styles.streakTitle}>Record</Text>
            <Text style={styles.streakValue}>
              {streak.longestStreak} jour{streak.longestStreak > 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
            {badges.map((badge) => (
              <View key={badge.id} style={[styles.badgeCard, !badge.earned && styles.badgeLocked]}>
                <Text style={styles.badgeIcon}>{badge.icon}</Text>
                <Text style={[styles.badgeName, !badge.earned && { color: '#64748b' }]}>
                  {badge.name}
                </Text>
              </View>
            ))}
          </ScrollView>
        </>
      )}

      {/* Notifications */}
      <Text style={styles.sectionTitle}>Notifications</Text>
      {notifications.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="notifications-off-outline" size={32} color="#64748b" />
          <Text style={styles.emptyText}>Aucune notification pour le moment.</Text>
        </View>
      ) : (
        notifications.map((notif) => (
          <View key={notif.id} style={[styles.notifRow, !notif.read && styles.notifUnread]}>
            <View style={styles.notifDot}>{!notif.read && <View style={styles.unreadDot} />}</View>
            <View style={styles.notifContent}>
              <Text style={styles.notifTitle}>{notif.title}</Text>
              <Text style={styles.notifMessage}>{notif.message}</Text>
              <Text style={styles.notifDate}>
                {new Date(notif.createdAt).toLocaleDateString('fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
            <Ionicons
              name={notif.read ? 'checkmark-circle' : 'ellipse'}
              size={16}
              color={notif.read ? '#14b8a6' : '#f59e0b'}
            />
          </View>
        ))
      )}

      {/* Logout */}
      <Pressable style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Se déconnecter</Text>
      </Pressable>
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
  profileCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#14b8a6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '800',
  },
  profileInfo: {
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    color: '#f1f5f9',
    fontSize: 20,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 2,
  },
  profileBadges: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  badge: {
    backgroundColor: '#0f172a',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    color: '#14b8a6',
    fontSize: 12,
    fontWeight: '700',
  },
  joinedDate: {
    color: '#64748b',
    fontSize: 12,
  },
  streakCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  streakInfo: {
    marginLeft: 12,
  },
  streakTitle: {
    color: '#94a3b8',
    fontSize: 12,
  },
  streakValue: {
    color: '#f1f5f9',
    fontSize: 18,
    fontWeight: '800',
  },
  streakDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#334155',
    marginLeft: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f1f5f9',
    marginBottom: 12,
    marginTop: 8,
  },
  badgesScroll: {
    marginBottom: 8,
  },
  badgeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginRight: 10,
    minWidth: 80,
    borderWidth: 1,
    borderColor: '#334155',
  },
  badgeLocked: {
    opacity: 0.5,
  },
  badgeIcon: {
    fontSize: 28,
    marginBottom: 6,
  },
  badgeName: {
    color: '#f1f5f9',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyBox: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
    gap: 8,
    marginBottom: 16,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
  },
  notifRow: {
    backgroundColor: '#1e293b',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  notifUnread: {
    borderColor: '#14b8a6',
  },
  notifDot: {
    width: 20,
    alignItems: 'center',
    paddingTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#14b8a6',
  },
  notifContent: {
    flex: 1,
    marginLeft: 8,
  },
  notifTitle: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  notifMessage: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 2,
  },
  notifDate: {
    color: '#64748b',
    fontSize: 11,
    marginTop: 4,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '700',
  },
});
