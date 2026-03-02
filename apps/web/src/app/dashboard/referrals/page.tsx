'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Copy,
  Users,
  TrendingUp,
  CheckCircle,
  Award,
  ArrowDownRight,
  Share2,
  Crown,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { referralsApi } from '@/lib/api';
import { useToast } from '@/lib/toast';
import type { ReferralUser, ReferralStats, Commission } from '@/types';
import { MotionDiv, AnimatedCounter, staggerContainer, staggerItem } from '@/components/ui';
import { PageSkeleton } from '@/components/ui/Skeleton';

export default function ReferralsPage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const [level1, setLevel1] = useState<ReferralUser[]>([]);
  const [level2, setLevel2] = useState<ReferralUser[]>([]);
  const [level3, setLevel3] = useState<ReferralUser[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'level1' | 'level2' | 'level3' | 'commissions'>(
    'level1',
  );

  const referralLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/register?ref=${user?.referralCode || ''}`
      : '';

  useEffect(() => {
    if (!token) return;
    const fetchData = async () => {
      try {
        const [tree, s, c] = await Promise.all([
          referralsApi.getTree(token).catch(() => ({ level1: [], level2: [], level3: [] })),
          referralsApi.getStats(token).catch(() => null),
          referralsApi.getCommissions(token).catch(() => ({ commissions: [] })),
        ]);
        setLevel1(tree?.level1 || []);
        setLevel2(tree?.level2 || []);
        setLevel3(tree?.level3 || []);
        setStats(s);
        setCommissions(c?.commissions || []);
      } catch (err) {
        console.error('Erreur chargement parrainages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {
      // Fallback for non-HTTPS or older browsers
      const ta = document.createElement('textarea');
      ta.value = referralLink;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    toast.success('Lien copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareText = `Rejoins XEARN et gagne de l'argent en complétant des tâches simples ! Inscris-toi avec mon lien : ${referralLink}`;
  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  const shareTelegram = () =>
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Rejoins XEARN et gagne de l'argent en complétant des tâches simples !")}`,
      '_blank',
    );
  const shareFacebook = () =>
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`,
      '_blank',
    );

  const fmt = (n: number | string | undefined) => Number(n || 0).toLocaleString('fr-FR');

  if (loading) return <PageSkeleton />;

  const l1Percent = stats?.l1Percent || 40;
  const l2Percent = stats?.l2Percent || 10;
  const l3Percent = stats?.l3Percent || 5;
  const l3Active = stats?.l3Active || false;

  const TAB_ACTIVE_STYLES: Record<string, string> = {
    primary: 'bg-primary-500/20 text-primary-400',
    accent: 'bg-accent-500/20 text-accent-400',
    success: 'bg-success-500/20 text-success-400',
    amber: 'bg-amber-500/20 text-amber-400',
  };

  const tabs = [
    { key: 'level1' as const, label: `Niveau 1 (${level1.length})`, icon: Users, color: 'primary' },
    {
      key: 'level2' as const,
      label: `Niveau 2 (${level2.length})`,
      icon: TrendingUp,
      color: 'accent',
    },
    ...(l3Active
      ? [
          {
            key: 'level3' as const,
            label: `Niveau 3 (${level3.length})`,
            icon: Crown,
            color: 'amber',
          },
        ]
      : []),
    { key: 'commissions' as const, label: 'Commissions', icon: Award, color: 'success' },
  ];

  return (
    <div className="space-y-6">
      <MotionDiv preset="fadeUp">
        <h1 className="heading-lg">Parrainage</h1>
        <p className="text-dark-400 mt-1">Partagez votre lien et gagnez des commissions</p>
      </MotionDiv>

      {/* Referral link */}
      <MotionDiv preset="fadeUp" delay={0.1}>
        <div className="card-gradient">
          <h2 className="text-lg font-semibold mb-4">Votre lien de parrainage</h2>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={referralLink}
              readOnly
              className="input-field flex-1 text-sm font-mono"
            />
            <button
              onClick={copyLink}
              className="btn-primary flex items-center gap-2 whitespace-nowrap"
            >
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié !' : 'Copier'}
            </button>
          </div>
          <p className="text-dark-400 text-sm mt-3">
            Partagez ce lien. Quand quelqu&apos;un s&apos;inscrit, vous gagnez des commissions sur
            ses activités.
          </p>

          {/* Share buttons */}
          <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/[0.06]">
            <span className="text-dark-400 text-sm flex items-center gap-1.5">
              <Share2 className="w-4 h-4" /> Partager :
            </span>
            <button
              onClick={shareWhatsApp}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
            <button
              onClick={shareTelegram}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
              </svg>
              Telegram
            </button>
            <button
              onClick={shareFacebook}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors text-sm font-medium"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>
        </div>
      </MotionDiv>

      {/* Commission rates */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {[
          {
            pct: l1Percent,
            label: 'Commission Niveau 1',
            desc: 'Sur les gains de vos filleuls directs',
            amount: stats?.commissionsL1,
            icon: <Users className="w-8 h-8" />,
            color: 'primary',
          },
          {
            pct: l2Percent,
            label: 'Commission Niveau 2',
            desc: 'Sur les gains des filleuls de vos filleuls',
            amount: stats?.commissionsL2,
            icon: <TrendingUp className="w-8 h-8" />,
            color: 'accent',
          },
          ...(l3Active
            ? [
                {
                  pct: l3Percent,
                  label: 'Commission Niveau 3',
                  desc: 'VIP exclusif — 3ème niveau de parrainage',
                  amount: stats?.commissionsL3,
                  icon: <Crown className="w-8 h-8" />,
                  color: 'amber',
                },
              ]
            : []),
        ].map((c, i) => (
          <motion.div key={i} variants={staggerItem}>
            <div className="card-hover text-center group">
              <div
                className={`p-3 rounded-2xl bg-gradient-to-br mx-auto w-fit mb-3 ${
                  c.color === 'primary'
                    ? 'from-primary-500/20 to-primary-500/5 text-primary-400'
                    : c.color === 'accent'
                      ? 'from-accent-500/20 to-accent-500/5 text-accent-400'
                      : 'from-amber-500/20 to-amber-500/5 text-amber-400'
                } group-hover:scale-110 transition-transform`}
              >
                {c.icon}
              </div>
              <div className="text-3xl font-bold gradient-text">
                <AnimatedCounter end={c.pct} suffix="%" />
              </div>
              <div className="text-dark-400 mt-1">{c.label}</div>
              <p className="text-dark-500 text-sm mt-2">{c.desc}</p>
              {stats && (
                <div className="mt-3 pt-3 border-t border-white/[0.04]">
                  <span className="text-accent-400 font-semibold">{fmt(c.amount)} FCFA</span>
                  <span className="text-dark-500 text-sm ml-1">gagnés</span>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* L3 promo for non-VIP */}
      {!l3Active && user?.status === 'ACTIVATED' && (
        <MotionDiv preset="fadeUp" delay={0.15}>
          <div className="card p-4 bg-gradient-to-r from-amber-500/5 to-yellow-500/5 border border-amber-500/20">
            <div className="flex items-center gap-3">
              <Crown className="w-5 h-5 text-amber-400 flex-shrink-0" />
              <div>
                <span className="text-sm font-medium text-amber-400">Débloquez le Niveau 3 !</span>
                <p className="text-xs text-dark-400 mt-0.5">
                  Passez VIP pour gagner {l3Percent}% de commission sur un 3ème niveau de
                  parrainage.
                </p>
              </div>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Stats summary */}
      {stats && (
        <MotionDiv preset="fadeUp" delay={0.2}>
          <div className="card">
            <div className={`grid gap-4 text-center ${l3Active ? 'grid-cols-4' : 'grid-cols-3'}`}>
              <div>
                <div className="text-2xl font-bold text-primary-400">
                  <AnimatedCounter end={stats.totalLevel1} />
                </div>
                <div className="text-dark-500 text-sm">Filleuls N1</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-accent-400">
                  <AnimatedCounter end={stats.totalLevel2} />
                </div>
                <div className="text-dark-500 text-sm">Filleuls N2</div>
              </div>
              {l3Active && (
                <div>
                  <div className="text-2xl font-bold text-amber-400">
                    <AnimatedCounter end={stats.totalLevel3 || 0} />
                  </div>
                  <div className="text-dark-500 text-sm">Filleuls N3</div>
                </div>
              )}
              <div>
                <div className="text-2xl font-bold text-success-400">
                  {fmt(stats.totalCommissions)}
                </div>
                <div className="text-dark-500 text-sm">FCFA total</div>
              </div>
            </div>
          </div>
        </MotionDiv>
      )}

      {/* Tabs */}
      <MotionDiv preset="fadeUp" delay={0.25}>
        <div className="flex gap-1 bg-white/[0.02] rounded-xl p-1 border border-white/[0.04]">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? TAB_ACTIVE_STYLES[tab.color]
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4 inline mr-1.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </MotionDiv>

      {/* Tab content */}
      <MotionDiv preset="fadeUp" delay={0.3}>
        <div className="card">
          {activeTab === 'level1' && (
            <>
              <h2 className="text-lg font-semibold mb-4">Filleuls directs — Niveau 1</h2>
              {level1.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Aucun filleul</h3>
                  <p className="text-dark-400 text-sm max-w-xs">
                    Partagez votre lien pour commencer !
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {level1.map((ref, i: number) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-500/20 to-primary-500/5 rounded-full flex items-center justify-center">
                          <span className="text-primary-400 font-semibold">
                            {(ref.firstName || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            {ref.firstName} {ref.lastName}
                          </div>
                          <div className="text-dark-500 text-xs">
                            {new Date(ref.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`badge ${ref.status === 'ACTIVATED' ? 'badge-success' : 'badge-warning'}`}
                      >
                        {ref.status === 'ACTIVATED' ? 'Activé' : 'Gratuit'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'level2' && (
            <>
              <h2 className="text-lg font-semibold mb-4">Filleuls indirects — Niveau 2</h2>
              {level2.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <TrendingUp className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Aucun filleul N2</h3>
                  <p className="text-dark-400 text-sm max-w-xs">
                    Vos filleuls doivent aussi parrainer !
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {level2.map((ref, i: number) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-accent-500/20 to-accent-500/5 rounded-full flex items-center justify-center">
                          <span className="text-accent-400 font-semibold">
                            {(ref.firstName || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            {ref.firstName} {ref.lastName}
                          </div>
                          <div className="text-dark-500 text-xs">
                            {new Date(ref.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`badge ${ref.status === 'ACTIVATED' ? 'badge-success' : 'badge-warning'}`}
                      >
                        {ref.status === 'ACTIVATED' ? 'Activé' : 'Gratuit'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'level3' && l3Active && (
            <>
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" /> Filleuls — Niveau 3 (VIP)
              </h2>
              {level3.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Crown className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Aucun filleul N3</h3>
                  <p className="text-dark-400 text-sm max-w-xs">
                    Les filleuls de vos filleuls N2 apparaîtront ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {level3.map((ref, i: number) => (
                    <motion.div
                      key={ref.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-500/20 to-amber-500/5 rounded-full flex items-center justify-center">
                          <span className="text-amber-400 font-semibold">
                            {(ref.firstName || 'U')[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            {ref.firstName} {ref.lastName}
                          </div>
                          <div className="text-dark-500 text-xs">
                            {new Date(ref.createdAt).toLocaleDateString('fr-FR')}
                          </div>
                        </div>
                      </div>
                      <span
                        className={`badge ${ref.status === 'ACTIVATED' ? 'badge-success' : 'badge-warning'}`}
                      >
                        {ref.status === 'ACTIVATED' ? 'Activé' : 'Gratuit'}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === 'commissions' && (
            <>
              <h2 className="text-lg font-semibold mb-4">Historique des commissions</h2>
              {commissions.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <Award className="w-8 h-8" />
                  </div>
                  <h3 className="text-base font-semibold mb-1">Aucune commission</h3>
                  <p className="text-dark-400 text-sm max-w-xs">
                    Les commissions arrivent quand vos filleuls complètent des tâches !
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {commissions.map((c, i: number) => (
                    <motion.div
                      key={c.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center justify-between py-3 border-b border-white/[0.04] last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            c.level === 1
                              ? 'bg-gradient-to-br from-primary-500/20 to-primary-500/5'
                              : c.level === 2
                                ? 'bg-gradient-to-br from-accent-500/20 to-accent-500/5'
                                : 'bg-gradient-to-br from-amber-500/20 to-amber-500/5'
                          }`}
                        >
                          <ArrowDownRight
                            className={`w-5 h-5 ${
                              c.level === 1
                                ? 'text-primary-400'
                                : c.level === 2
                                  ? 'text-accent-400'
                                  : 'text-amber-400'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="font-medium text-sm text-white">
                            Commission N{c.level} — {c.sourceUser?.firstName}{' '}
                            {c.sourceUser?.lastName}
                          </div>
                          <div className="text-dark-500 text-xs">
                            {new Date(c.createdAt).toLocaleDateString('fr-FR')} · {c.percentage}%
                          </div>
                        </div>
                      </div>
                      <span className="text-success-400 font-semibold">+{fmt(c.amount)} FCFA</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </MotionDiv>
    </div>
  );
}
