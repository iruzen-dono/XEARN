'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { gamificationApi } from '@/lib/api';
import { MotionDiv } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';
import { Flame, Trophy, Lock, Check, Medal } from 'lucide-react';
import type { StreakInfo, Badge, LeaderboardEntry } from '@/types';

export default function GamificationPage() {
  const { token } = useAuth();
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;

    async function load() {
      try {
        const [s, b, l] = await Promise.all([
          gamificationApi.getStreak(token!),
          gamificationApi.getBadges(token!),
          gamificationApi.getLeaderboard(token!, 20),
        ]);
        setStreak(s);
        setBadges(b);
        setLeaderboard(l);
      } catch {
        // silently handled
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  if (loading) return <PageSkeleton />;

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <MotionDiv preset="fadeUp">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-accent-400" />
          <h1 className="heading-lg">Badges et classement</h1>
        </div>
        <p className="text-dark-400 mt-1">
          Complétez des tâches et enchaînez les jours pour débloquer des récompenses !
        </p>
      </MotionDiv>

      {/* Streak card */}
      <MotionDiv preset="fadeUp" delay={0.1}>
        <div className="card-gradient overflow-hidden relative">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/10 ring-1 ring-orange-500/20">
                <Flame className="w-8 h-8 text-orange-400" />
              </div>
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">
                    {streak?.currentStreak || 0}
                  </span>
                  <span className="text-dark-400 text-sm">jours</span>
                </div>
                <p className="text-xs text-dark-500 mt-0.5">
                  Série actuelle — Record : {streak?.longestStreak || 0} jours
                </p>
              </div>
            </div>
            <div className="flex-1 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm text-dark-400">
              <Medal className="w-4 h-4 text-accent-400" />
              <span>
                <strong className="text-white">{earnedCount}</strong> / {badges.length} badges
                débloqués
              </span>
            </div>
          </div>
        </div>
      </MotionDiv>

      {/* Badges */}
      <MotionDiv preset="fadeUp" delay={0.2}>
        <div className="card">
          <h2 className="text-lg font-semibold mb-1">Tous les badges</h2>
          <p className="text-dark-400 text-sm mb-6">
            Gagnez des badges en complétant des tâches, en parrainant et en enchaînant les jours.
          </p>

          {badges.length === 0 ? (
            <div className="empty-state">
              <Medal className="w-8 h-8 text-dark-500" />
              <h3 className="text-base font-semibold mb-1">Aucun badge disponible</h3>
              <p className="text-dark-400 text-sm max-w-xs">
                Les badges apparaîtront ici une fois que vous aurez commencé à utiliser la
                plateforme.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {badges.map((badge, i) => (
                <MotionDiv
                  key={badge.id}
                  preset="fadeUp"
                  delay={0.05 * i}
                  className={`relative p-4 rounded-xl border transition-all duration-200 ${
                    badge.earned
                      ? 'bg-success-500/5 border-success-500/20 group hover:bg-success-500/10'
                      : 'bg-dark-800/50 border-dark-700/50 opacity-60 hover:opacity-80'
                  }`}
                >
                  {/* Earned badge */}
                  {badge.earned && (
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-success-500 rounded-full flex items-center justify-center shadow-lg">
                      <Check className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className={`text-3xl ${!badge.earned && 'grayscale'}`}>{badge.icon}</span>
                    <span
                      className={`text-xs font-medium ${
                        badge.earned ? 'text-white' : 'text-dark-400'
                      }`}
                    >
                      {badge.name}
                    </span>
                    {badge.reward && (
                      <span
                        className={`text-[10px] ${
                          badge.earned ? 'text-success-400' : 'text-dark-500'
                        }`}
                      >
                        {badge.earned
                          ? 'Gagné'
                          : `${Number(badge.reward).toLocaleString('fr-FR')} FCFA`}
                      </span>
                    )}
                    {!badge.earned && !badge.reward && (
                      <span className="text-[10px] text-dark-500">
                        <Lock className="w-3 h-3 inline mr-0.5" />À débloquer
                      </span>
                    )}
                    {badge.description && (
                      <p className="text-[10px] text-dark-500 leading-tight mt-1">
                        {badge.description}
                      </p>
                    )}
                  </div>
                </MotionDiv>
              ))}
            </div>
          )}
        </div>
      </MotionDiv>

      {/* Leaderboard */}
      <MotionDiv preset="fadeUp" delay={0.3}>
        <div className="card">
          <div className="flex items-center gap-2 mb-1">
            <Trophy className="w-5 h-5 text-accent-400" />
            <h2 className="text-lg font-semibold">Classement (streaks)</h2>
          </div>
          <p className="text-dark-400 text-sm mb-6">
            Les utilisateurs avec les plus longues séries du moment.
          </p>

          {leaderboard.length === 0 ? (
            <div className="empty-state">
              <Trophy className="w-8 h-8 text-dark-500" />
              <h3 className="text-base font-semibold mb-1">Classement vide</h3>
              <p className="text-dark-400 text-sm max-w-xs">
                Personne n&apos;a encore de streak. Sois le premier !
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {leaderboard.map((entry, i) => {
                const isTop3 = i < 3;
                return (
                  <MotionDiv
                    key={entry.id}
                    preset="fadeUp"
                    delay={0.05 * i}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      isTop3
                        ? 'bg-gradient-to-r from-accent-500/5 to-transparent border border-accent-500/10'
                        : 'hover:bg-white/[0.03] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold ${
                          i === 0
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : i === 1
                              ? 'bg-slate-400/20 text-slate-300'
                              : i === 2
                                ? 'bg-amber-700/20 text-amber-600'
                                : 'text-dark-500'
                        }`}
                      >
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                      </span>
                      <div>
                        <span className="text-sm font-medium text-white">
                          {entry.user.firstName} {entry.user.lastName}
                        </span>
                        {entry.user.tier && entry.user.tier !== 'NORMAL' && (
                          <span
                            className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                              entry.user.tier === 'VIP'
                                ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
                                : 'text-purple-400 bg-purple-500/10 border border-purple-500/30'
                            }`}
                          >
                            {entry.user.tier}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-white">
                        {entry.currentStreak}
                      </span>
                      <span className="text-dark-500 text-xs">jours</span>
                    </div>
                  </MotionDiv>
                );
              })}
            </div>
          )}
        </div>
      </MotionDiv>
    </div>
  );
}
