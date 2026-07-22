import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { api, ApiError, clearTokens } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
import { AnimatedCard, DashboardSkeleton, PulsingDot } from '../../src/components/Animated';
import { colors, borderRadius, shadows } from '../../src/theme';
import { scale, moderateScale, safeArea } from '../../src/utils/responsive';
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
      const [overview, notifRes] = await Promise.all([
        api.get<DashboardData>('/wallet/overview'),
        api.get<{ notifications: Notification[] }>('/notifications?limit=10'),
      ]);

      setProfile(overview.user);

      try {
        const streakRes = await api.get<StreakInfo>('/gamification/streak');
        setStreak(streakRes);
      } catch {}

      try {
        const badgesRes = await api.get<Badge[]>('/gamification/badges');
        setBadges(badgesRes);
      } catch {}

      setNotifications(notifRes.notifications ?? []);
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Impossible de charger le profil.');
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
          } catch {}
          await clearTokens();
          router.replace('/login');
        },
      },
    ]);
  }

  if (loading) return <DashboardSkeleton />;

  if (error) return <ErrorScreen message={error} onRetry={() => fetchData()} />;

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
      {/* ── Profile Card ── */}
      {profile && (
        <AnimatedCard delay={100} style={s.profileCard}>
          <View style={s.avatarWrap}>
            <View style={s.avatar}>
              <Text style={s.avatarText}>
                {profile.firstName[0]}
                {profile.lastName[0]}
              </Text>
            </View>
            <View style={s.avatarRing} />
          </View>
          <Text style={s.profileName}>
            {profile.firstName} {profile.lastName}
          </Text>
          <Text style={s.profileEmail}>{profile.email}</Text>
          <View style={s.profileBadges}>
            <View
              style={[
                s.badgePill,
                {
                  backgroundColor:
                    profile.tier === 'PREMIUM'
                      ? 'rgba(245,158,11,0.15)'
                      : profile.tier === 'VIP'
                        ? 'rgba(168,85,247,0.15)'
                        : colors.bgCardAlt,
                },
              ]}
            >
              <Text
                style={[
                  s.badgePillText,
                  {
                    color:
                      profile.tier === 'PREMIUM'
                        ? colors.secondary
                        : profile.tier === 'VIP'
                          ? colors.purple
                          : colors.textMuted,
                  },
                ]}
              >
                {profile.tier}
              </Text>
            </View>
            <View style={[s.badgePill, { backgroundColor: colors.bgCardAlt }]}>
              <Text style={[s.badgePillText, { color: colors.textMuted }]}>{profile.role}</Text>
            </View>
          </View>
          <Text style={s.joinedDate}>
            Membre depuis{' '}
            {new Date(profile.createdAt).toLocaleDateString('fr-FR', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
        </AnimatedCard>
      )}

      {/* ── Streak Card ── */}
      {streak && (
        <AnimatedCard delay={150} style={s.streakCard}>
          <View style={s.streakLeft}>
            <View style={s.flameWrap}>
              <Ionicons name="flame" size={scale(28)} color={colors.secondary} />
            </View>
            <View>
              <Text style={s.streakTitle}>Série actuelle</Text>
              <Text style={s.streakValue}>
                {streak.currentStreak} jour{streak.currentStreak > 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={s.streakDivider} />
          <View>
            <Text style={s.streakTitle}>Record</Text>
            <Text style={s.streakValue}>
              {streak.longestStreak} jour{streak.longestStreak > 1 ? 's' : ''}
            </Text>
          </View>
        </AnimatedCard>
      )}

      {/* ── Quick Actions ── */}
      <View style={s.quickActions}>
        <AnimatedCard delay={200} style={s.quickActionCard} onPress={() => {}}>
          <Ionicons name="stats-chart-outline" size={scale(22)} color={colors.primary} />
          <Text style={s.quickActionLabel}>Statistiques</Text>
        </AnimatedCard>
        <AnimatedCard delay={230} style={s.quickActionCard} onPress={() => {}}>
          <Ionicons name="settings-outline" size={scale(22)} color={colors.textMuted} />
          <Text style={s.quickActionLabel}>Paramètres</Text>
        </AnimatedCard>
        <AnimatedCard delay={260} style={s.quickActionCard} onPress={() => {}}>
          <Ionicons name="help-circle-outline" size={scale(22)} color={colors.textMuted} />
          <Text style={s.quickActionLabel}>Aide</Text>
        </AnimatedCard>
      </View>

      {/* ── Badges ── */}
      {badges.length > 0 && (
        <>
          <Text style={s.sectionTitle}>Badges</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.badgesScroll}>
            {badges.map((badge, i) => (
              <AnimatedCard
                key={badge.id}
                delay={300 + i * 50}
                style={[s.badgeCard, !badge.earned && s.badgeLocked]}
              >
                <Text style={s.badgeIcon}>{badge.icon}</Text>
                <Text style={[s.badgeName, !badge.earned && { color: colors.textDim }]}>
                  {badge.name}
                </Text>
                {!badge.earned && <Text style={s.badgeProgress}>À débloquer</Text>}
              </AnimatedCard>
            ))}
          </ScrollView>
        </>
      )}

      {/* ── Notifications ── */}
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Notifications</Text>
        {notifications.filter((n) => !n.read).length > 0 && (
          <View style={s.unreadCount}>
            <Text style={s.unreadCountText}>
              {notifications.filter((n) => !n.read).length} non lue
              {notifications.filter((n) => !n.read).length > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      {notifications.length === 0 ? (
        <AnimatedCard delay={350} style={s.emptyCard}>
          <Ionicons name="notifications-off-outline" size={scale(32)} color={colors.textDim} />
          <Text style={s.emptyText}>Aucune notification pour le moment.</Text>
        </AnimatedCard>
      ) : (
        notifications.map((notif, i) => (
          <AnimatedCard
            key={notif.id}
            delay={350 + i * 60}
            style={[s.notifCard, !notif.read && s.notifUnread]}
          >
            <View style={s.notifRow}>
              <View style={s.notifLeft}>
                {!notif.read && <PulsingDot color={colors.primary} />}
              </View>
              <View style={s.notifContent}>
                <Text style={s.notifTitle}>{notif.title}</Text>
                <Text style={s.notifMessage}>{notif.message}</Text>
                <Text style={s.notifDate}>
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
                size={scale(16)}
                color={notif.read ? colors.primary : colors.secondary}
              />
            </View>
          </AnimatedCard>
        ))
      )}

      {/* ── Logout ── */}
      <Pressable style={s.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={scale(20)} color={colors.danger} />
        <Text style={s.logoutText}>Se déconnecter</Text>
      </Pressable>

      {/* Bottom spacer */}
      <View style={{ height: safeArea.bottom + scale(20) }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: {
    paddingHorizontal: scale(16),
    paddingTop: safeArea.top + scale(10),
    paddingBottom: scale(10),
  },
  // ── Profile ──
  profileCard: {
    alignItems: 'center',
    paddingVertical: scale(24),
    marginBottom: scale(16),
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: scale(14),
  },
  avatar: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  avatarRing: {
    position: 'absolute',
    top: -scale(3),
    left: -scale(3),
    right: -scale(3),
    bottom: -scale(3),
    borderRadius: scale(39),
    borderWidth: 2,
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  avatarText: {
    color: colors.white,
    fontSize: moderateScale(26),
    fontWeight: '800',
  },
  profileName: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: colors.text,
    marginBottom: scale(4),
  },
  profileEmail: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
    marginBottom: scale(12),
  },
  profileBadges: {
    flexDirection: 'row',
    gap: scale(8),
    marginBottom: scale(12),
  },
  badgePill: {
    paddingHorizontal: scale(12),
    paddingVertical: scale(4),
    borderRadius: borderRadius.full,
  },
  badgePillText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  joinedDate: {
    fontSize: moderateScale(12),
    color: colors.textDim,
  },
  // ── Streak ──
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: scale(16),
    marginBottom: scale(16),
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  flameWrap: {
    width: scale(44),
    height: scale(44),
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTitle: {
    fontSize: moderateScale(12),
    color: colors.textMuted,
    marginBottom: scale(2),
  },
  streakValue: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: colors.text,
  },
  streakDivider: {
    width: 1,
    height: scale(36),
    backgroundColor: colors.border,
  },
  // ── Quick Actions ──
  quickActions: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(16),
  },
  quickActionCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: scale(14),
  },
  quickActionLabel: {
    fontSize: moderateScale(11),
    color: colors.textMuted,
    marginTop: scale(6),
    fontWeight: '500',
  },
  // ── Badges ──
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
    marginBottom: scale(12),
    marginTop: scale(8),
  },
  badgesScroll: {
    marginBottom: scale(8),
  },
  badgeCard: {
    alignItems: 'center',
    padding: scale(14),
    marginRight: scale(10),
    minWidth: scale(80),
  },
  badgeLocked: { opacity: 0.5 },
  badgeIcon: {
    fontSize: moderateScale(28),
    marginBottom: scale(6),
  },
  badgeName: {
    color: colors.text,
    fontSize: moderateScale(11),
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeProgress: {
    color: colors.textDim,
    fontSize: moderateScale(10),
    marginTop: scale(2),
  },
  // ── Notifications ──
  unreadCount: {
    backgroundColor: colors.primaryGlow,
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: borderRadius.full,
  },
  unreadCountText: {
    color: colors.primary,
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  notifCard: {
    padding: scale(12),
    marginBottom: scale(6),
  },
  notifUnread: {
    borderColor: 'rgba(20, 184, 166, 0.3)',
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(8),
  },
  notifLeft: {
    width: scale(16),
    alignItems: 'center',
    paddingTop: scale(4),
  },
  notifContent: { flex: 1 },
  notifTitle: {
    color: colors.text,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  notifMessage: {
    color: colors.textMuted,
    fontSize: moderateScale(13),
    lineHeight: moderateScale(18),
    marginBottom: scale(4),
  },
  notifDate: {
    color: colors.textDim,
    fontSize: moderateScale(11),
  },
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
  // ── Logout ──
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(16),
    marginTop: scale(16),
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  logoutText: {
    color: colors.danger,
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
});
