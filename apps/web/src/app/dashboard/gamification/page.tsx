'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { gamificationApi } from '@/lib/api';
import { MotionDiv, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';
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
        // errors handled silently — data simply won't display
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [token]);

  if (loading) return <PageSkeleton />;

  return (
    <MotionDiv variants={staggerContainer} initial="hidden" animate="show" className="space-y-6">
      {/* Streak */}
      <MotionDiv
        variants={staggerItem}
        className="bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-xl p-6 border border-orange-500/20"
      >
        <div className="flex items-center gap-4">
          <span className="text-4xl">🔥</span>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {streak?.currentStreak || 0} jour{(streak?.currentStreak || 0) > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-400">
              Série actuelle — Record : {streak?.longestStreak || 0} jours
            </p>
          </div>
        </div>
      </MotionDiv>

      {/* Badges */}
      <MotionDiv
        variants={staggerItem}
        className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Badges gagnés</h3>
        {badges.length === 0 ? (
          <p className="text-gray-400 text-sm">Complétez des tâches pour gagner des badges !</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center gap-2 p-4 bg-gray-700/50 rounded-lg"
              >
                <span className="text-3xl">{badge.icon}</span>
                <span className="text-xs font-medium text-white text-center">{badge.name}</span>
                {badge.reward && (
                  <span className="text-xs text-green-400">+{String(badge.reward)} FCFA</span>
                )}
              </div>
            ))}
          </div>
        )}
      </MotionDiv>

      {/* Leaderboard */}
      <MotionDiv
        variants={staggerItem}
        className="bg-gray-800/50 rounded-xl p-6 border border-gray-700"
      >
        <h3 className="text-lg font-semibold text-white mb-4">Classement (streaks)</h3>
        {leaderboard.length === 0 ? (
          <p className="text-gray-400 text-sm">Aucune donnée de classement</p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry, i) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400 w-8">
                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                  </span>
                  <span className="text-sm text-white">
                    {entry.user.firstName} {entry.user.lastName}
                  </span>
                </div>
                <span className="text-sm font-semibold text-orange-400">
                  🔥 {entry.currentStreak} jours
                </span>
              </div>
            ))}
          </div>
        )}
      </MotionDiv>
    </MotionDiv>
  );
}
