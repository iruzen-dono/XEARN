import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError } from '../../src/api/client';
import ErrorScreen from '../../src/components/ErrorScreen';
import { AnimatedCard, DashboardSkeleton } from '../../src/components/Animated';
import { colors, borderRadius, shadows } from '../../src/theme';
import { scale, moderateScale, safeArea } from '../../src/utils/responsive';
import type { ReferralStats, ReferralTree, Commission } from '../../src/types';

export default function ReferralsTab() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [tree, setTree] = useState<ReferralTree | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [copied, setCopied] = useState(false);

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
    } catch (e) {
      if (e instanceof ApiError) setError(e.message);
      else setError('Impossible de charger les données de parrainage.');
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

  async function handleCopyCode() {
    if (!referralCode) return;
    // Use Clipboard API
    try {
      const Clipboard = require('expo-clipboard');
      await Clipboard.setStringAsync(referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — just share
      handleShareCode();
    }
  }

  if (loading) return <DashboardSkeleton />;

  if (error) return <ErrorScreen message={error} onRetry={() => fetchData()} />;

  if (!stats) return null;

  const totalReferrals =
    (tree?.level1.length ?? 0) + (tree?.level2.length ?? 0) + (tree?.level3.length ?? 0);

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
      <Text style={s.pageTitle}>Parrainage</Text>
      <Text style={s.pageSubtitle}>Invite tes amis et gagne des commissions sur leurs gains</Text>

      {/* ── Referral Code Card ── */}
      {referralCode ? (
        <AnimatedCard delay={100} style={s.codeCard}>
          <Text style={s.codeLabel}>Ton code de parrainage</Text>
          <Text style={s.codeValue}>{referralCode}</Text>
          <Text style={s.codeHint}>Partage ce code avec tes amis pour gagner des commissions</Text>
          <View style={s.codeActions}>
            <Pressable style={s.codeBtn} onPress={handleCopyCode}>
              <Ionicons
                name={copied ? 'checkmark-outline' : 'copy-outline'}
                size={scale(18)}
                color={colors.white}
              />
              <Text style={s.codeBtnText}>{copied ? 'Copié !' : 'Copier'}</Text>
            </Pressable>
            <Pressable style={[s.codeBtn, s.shareBtn]} onPress={handleShareCode}>
              <Ionicons name="share-outline" size={scale(18)} color={colors.white} />
              <Text style={s.codeBtnText}>Partager</Text>
            </Pressable>
          </View>
        </AnimatedCard>
      ) : null}

      {/* ── Level Stats ── */}
      <View style={s.statsRow}>
        <AnimatedCard delay={150} style={s.statCard}>
          <Text style={[s.statValue, { color: colors.primary }]}>{stats.totalLevel1}</Text>
          <Text style={s.statLabel}>Niveau 1</Text>
        </AnimatedCard>
        <AnimatedCard delay={200} style={s.statCard}>
          <Text style={[s.statValue, { color: colors.secondary }]}>{stats.totalLevel2}</Text>
          <Text style={s.statLabel}>Niveau 2</Text>
        </AnimatedCard>
        {stats.l3Active && (
          <AnimatedCard delay={250} style={s.statCard}>
            <Text style={[s.statValue, { color: colors.purple }]}>{stats.totalLevel3}</Text>
            <Text style={s.statLabel}>Niveau 3</Text>
          </AnimatedCard>
        )}
      </View>

      {/* ── Commission Summary ── */}
      <AnimatedCard delay={250} style={s.commissionCard}>
        <Text style={s.commTitle}>Commissions</Text>
        <View style={s.commList}>
          <View style={s.commItem}>
            <Text style={s.commLabel}>Total</Text>
            <Text style={s.commValueTotal}>
              {parseFloat(stats.totalCommissions).toLocaleString()} FCFA
            </Text>
          </View>
          <View style={s.commDivider} />
          <View style={s.commRow}>
            <View style={s.commSubItem}>
              <Text style={s.commSubLabel}>L1 ({stats.l1Percent}%)</Text>
              <Text style={s.commSubValue}>
                {parseFloat(stats.commissionsL1).toLocaleString()} FCFA
              </Text>
            </View>
            <View style={s.commSubItem}>
              <Text style={s.commSubLabel}>L2 ({stats.l2Percent}%)</Text>
              <Text style={s.commSubValue}>
                {parseFloat(stats.commissionsL2).toLocaleString()} FCFA
              </Text>
            </View>
            {stats.l3Active && (
              <View style={s.commSubItem}>
                <Text style={s.commSubLabel}>L3 ({stats.l3Percent}%)</Text>
                <Text style={s.commSubValue}>
                  {parseFloat(stats.commissionsL3).toLocaleString()} FCFA
                </Text>
              </View>
            )}
          </View>
        </View>
      </AnimatedCard>

      {/* ── Referral Network ── */}
      {tree && (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Mon réseau</Text>
            <Text style={s.sectionCount}>{totalReferrals} filleuls</Text>
          </View>

          {tree.level1.length > 0 && (
            <ReferralLevel
              title="Niveau 1"
              users={tree.level1}
              color={colors.primary}
              delay={300}
            />
          )}
          {tree.level2.length > 0 && (
            <ReferralLevel
              title="Niveau 2"
              users={tree.level2}
              color={colors.secondary}
              delay={350}
            />
          )}
          {tree.level3.length > 0 && (
            <ReferralLevel title="Niveau 3" users={tree.level3} color={colors.purple} delay={400} />
          )}

          {totalReferrals === 0 && (
            <AnimatedCard delay={300} style={s.emptyCard}>
              <View style={s.emptyIconWrap}>
                <Ionicons name="people-outline" size={scale(36)} color={colors.textDim} />
              </View>
              <Text style={s.emptyText}>
                Tu n'as pas encore de filleuls. Partage ton code pour commencer à gagner des
                commissions !
              </Text>
            </AnimatedCard>
          )}
        </>
      )}

      {/* ── Commission History ── */}
      {commissions.length > 0 && (
        <>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Historique des commissions</Text>
          </View>
          {commissions.map((comm, i) => (
            <AnimatedCard key={comm.id} delay={350 + i * 60} style={s.commRow}>
              <View style={s.commLeft}>
                <Text style={s.commSource}>
                  {comm.sourceUser?.firstName} {comm.sourceUser?.lastName}
                </Text>
                <Text style={s.commLevel}>Niveau {comm.level}</Text>
              </View>
              <View style={s.commRight}>
                <Text style={s.commPercent}>{parseFloat(comm.percentage).toFixed(1)}%</Text>
                <Text style={s.commAmount}>+{parseFloat(comm.amount).toLocaleString()} FCFA</Text>
              </View>
            </AnimatedCard>
          ))}
        </>
      )}

      {/* Bottom spacer */}
      <View style={{ height: safeArea.bottom + scale(20) }} />
    </ScrollView>
  );
}

function ReferralLevel({
  title,
  users,
  color,
  delay,
}: {
  title: string;
  users: { id: string; firstName: string; lastName: string; status: string }[];
  color: string;
  delay: number;
}) {
  const activeCount = users.filter((u) => u.status === 'ACTIVATED').length;

  return (
    <View style={s.levelBlock}>
      <View style={s.levelHeader}>
        <Text style={[s.levelTitle, { color }]}>{title}</Text>
        <Text style={s.levelCount}>
          {activeCount}/{users.length} actifs
        </Text>
      </View>
      {users.map((u, i) => {
        const isActive = u.status === 'ACTIVATED';
        return (
          <AnimatedCard key={u.id} delay={delay + i * 40} style={s.userRow}>
            <View
              style={[
                s.userAvatar,
                { backgroundColor: isActive ? colors.primaryGlow : 'rgba(100,116,139,0.15)' },
              ]}
            >
              <Ionicons
                name={isActive ? 'person' : 'person-outline'}
                size={scale(16)}
                color={isActive ? colors.primary : colors.textDim}
              />
            </View>
            <Text style={s.userName}>
              {u.firstName} {u.lastName}
            </Text>
            <View
              style={[
                s.userStatus,
                { backgroundColor: isActive ? colors.primaryGlow : 'rgba(100, 116, 139, 0.15)' },
              ]}
            >
              <Text
                style={[s.userStatusText, { color: isActive ? colors.primary : colors.textDim }]}
              >
                {isActive ? 'Actif' : 'Inactif'}
              </Text>
            </View>
          </AnimatedCard>
        );
      })}
    </View>
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
    marginBottom: scale(2),
  },
  sectionCount: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
  },
  pageTitle: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: colors.text,
    marginBottom: scale(4),
  },
  pageSubtitle: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
    marginBottom: scale(16),
  },
  // ── Code Card ──
  codeCard: {
    alignItems: 'center',
    padding: scale(20),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: 'rgba(20, 184, 166, 0.2)',
  },
  codeLabel: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
    marginBottom: scale(8),
  },
  codeValue: {
    color: colors.primary,
    fontSize: moderateScale(28),
    fontWeight: '900',
    letterSpacing: 3,
    marginBottom: scale(8),
  },
  codeHint: {
    fontSize: moderateScale(11),
    color: colors.textDim,
    textAlign: 'center',
    marginBottom: scale(14),
  },
  codeActions: {
    flexDirection: 'row',
    gap: scale(10),
  },
  codeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: colors.primary,
    paddingHorizontal: scale(18),
    paddingVertical: scale(10),
    borderRadius: borderRadius.md,
  },
  shareBtn: {
    backgroundColor: colors.secondary,
  },
  codeBtnText: {
    color: colors.white,
    fontSize: moderateScale(13),
    fontWeight: '700',
  },
  // ── Stats ──
  statsRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(16),
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: scale(16),
  },
  statValue: {
    fontSize: moderateScale(28),
    fontWeight: '900',
    marginBottom: scale(4),
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: moderateScale(12),
  },
  // ── Commissions ──
  commissionCard: {
    padding: scale(16),
    marginBottom: scale(16),
  },
  commTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: colors.text,
    marginBottom: scale(12),
  },
  commList: {},
  commItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  commLabel: {
    fontSize: moderateScale(14),
    color: colors.textMuted,
  },
  commValueTotal: {
    fontSize: moderateScale(20),
    fontWeight: '900',
    color: colors.text,
  },
  commDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginBottom: scale(10),
  },
  commRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  commSubItem: {
    flex: 1,
    alignItems: 'center',
  },
  commSubLabel: {
    fontSize: moderateScale(11),
    color: colors.textDim,
    marginBottom: scale(4),
  },
  commSubValue: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: colors.text,
  },
  // ── Level ──
  levelBlock: {
    marginBottom: scale(12),
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  levelTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  levelCount: {
    fontSize: moderateScale(12),
    color: colors.textDim,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(10),
    marginBottom: scale(6),
  },
  userAvatar: {
    width: scale(34),
    height: scale(34),
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  userName: {
    flex: 1,
    color: colors.text,
    fontSize: moderateScale(14),
    fontWeight: '500',
  },
  userStatus: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: borderRadius.full,
  },
  userStatusText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  // ── Commission Rows ──
  commRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(12),
    marginBottom: scale(6),
  },
  commLeft: { flex: 1 },
  commSource: {
    color: colors.text,
    fontSize: moderateScale(14),
    fontWeight: '600',
    marginBottom: scale(2),
  },
  commLevel: {
    color: colors.textDim,
    fontSize: moderateScale(12),
  },
  commRight: { alignItems: 'flex-end' },
  commPercent: {
    color: colors.textMuted,
    fontSize: moderateScale(12),
    marginBottom: scale(2),
  },
  commAmount: {
    color: colors.primary,
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  // ── Empty ──
  emptyCard: {
    alignItems: 'center',
    paddingVertical: scale(32),
    gap: scale(12),
  },
  emptyIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: borderRadius['2xl'],
    backgroundColor: colors.bgCardAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: moderateScale(13),
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: moderateScale(19),
    paddingHorizontal: scale(16),
  },
});
