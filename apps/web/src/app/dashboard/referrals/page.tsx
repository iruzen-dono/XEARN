'use client';

import { useEffect, useState } from 'react';
import { Copy, Users, TrendingUp, Loader2, CheckCircle, Award, ArrowDownRight } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { referralsApi } from '@/lib/api';
import { useToast } from '@/lib/toast';

export default function ReferralsPage() {
  const { user, token } = useAuth();
  const toast = useToast();
  const [level1, setLevel1] = useState<any[]>([]);
  const [level2, setLevel2] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'level1' | 'level2' | 'commissions'>('level1');

  const referralLink = typeof window !== 'undefined'
    ? `${window.location.origin}/register?ref=${user?.referralCode || ''}`
    : '';

  useEffect(() => {
    if (!token) return;

    const fetchData = async () => {
      try {
        const [tree, s, c] = await Promise.all([
          referralsApi.getTree(token).catch(() => ({ level1: [], level2: [] })),
          referralsApi.getStats(token).catch(() => null),
          referralsApi.getCommissions(token).catch(() => ({ commissions: [] })),
        ]);
        setLevel1((tree as any)?.level1 || []);
        setLevel2((tree as any)?.level2 || []);
        setStats(s);
        setCommissions((c as any)?.commissions || []);
      } catch (err) {
        console.error('Erreur chargement parrainages:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [token]);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    toast.success('Lien copié dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-400" />
      </div>
    );
  }

  const l1Percent = stats?.l1Percent || 40;
  const l2Percent = stats?.l2Percent || 10;

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Parrainage</h1>
      <p className="text-dark-400 mb-8">Partagez votre lien et gagnez des commissions</p>

      {/* Referral link */}
      <div className="card mb-8">
        <h2 className="text-xl font-semibold mb-4">Votre lien de parrainage</h2>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={referralLink}
            readOnly
            className="input-field flex-1 text-sm"
          />
          <button onClick={copyLink} className="btn-primary flex items-center gap-2 whitespace-nowrap">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copié !' : 'Copier'}
          </button>
        </div>
        <p className="text-dark-400 text-sm mt-3">
          Partagez ce lien. Quand quelqu&apos;un s&apos;inscrit via votre lien, vous gagnez des commissions sur ses activités.
        </p>
      </div>

      {/* Commission rates */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div className="card text-center">
          <Users className="w-10 h-10 text-primary-400 mx-auto mb-3" />
          <div className="text-3xl font-bold gradient-text">{l1Percent}%</div>
          <div className="text-dark-400 mt-1">Commission Niveau 1</div>
          <p className="text-dark-500 text-sm mt-2">Sur les gains de vos filleuls directs</p>
          {stats && (
            <div className="mt-3 pt-3 border-t border-dark-800">
              <span className="text-accent-400 font-semibold">{fmt(stats.commissionsL1)} FCFA</span>
              <span className="text-dark-500 text-sm ml-1">gagnés</span>
            </div>
          )}
        </div>
        <div className="card text-center">
          <TrendingUp className="w-10 h-10 text-accent-400 mx-auto mb-3" />
          <div className="text-3xl font-bold gradient-text">{l2Percent}%</div>
          <div className="text-dark-400 mt-1">Commission Niveau 2</div>
          <p className="text-dark-500 text-sm mt-2">Sur les gains des filleuls de vos filleuls</p>
          {stats && (
            <div className="mt-3 pt-3 border-t border-dark-800">
              <span className="text-accent-400 font-semibold">{fmt(stats.commissionsL2)} FCFA</span>
              <span className="text-dark-500 text-sm ml-1">gagnés</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats summary */}
      {stats && (
        <div className="card mb-8">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary-400">{stats.totalLevel1}</div>
              <div className="text-dark-500 text-sm">Filleuls N1</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent-400">{stats.totalLevel2}</div>
              <div className="text-dark-500 text-sm">Filleuls N2</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">{fmt(stats.totalCommissions)} FCFA</div>
              <div className="text-dark-500 text-sm">Total commissions</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-dark-900 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('level1')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'level1' ? 'bg-primary-500/20 text-primary-400' : 'text-dark-400 hover:text-white'}`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />Niveau 1 ({level1.length})
        </button>
        <button
          onClick={() => setActiveTab('level2')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'level2' ? 'bg-accent-500/20 text-accent-400' : 'text-dark-400 hover:text-white'}`}
        >
          <TrendingUp className="w-4 h-4 inline mr-1.5" />Niveau 2 ({level2.length})
        </button>
        <button
          onClick={() => setActiveTab('commissions')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${activeTab === 'commissions' ? 'bg-green-500/20 text-green-400' : 'text-dark-400 hover:text-white'}`}
        >
          <Award className="w-4 h-4 inline mr-1.5" />Commissions
        </button>
      </div>

      {/* Tab content */}
      <div className="card">
        {activeTab === 'level1' && (
          <>
            <h2 className="text-xl font-semibold mb-4">Filleuls directs — Niveau 1</h2>
            {level1.length === 0 ? (
              <div className="text-dark-400 text-center py-8">
                Aucun filleul pour le moment. Partagez votre lien pour commencer à gagner !
              </div>
            ) : (
              <div className="space-y-3">
                {level1.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-500/10 rounded-full flex items-center justify-center">
                        <span className="text-primary-400 font-semibold">{(ref.firstName || 'U')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{ref.firstName} {ref.lastName}</div>
                        <div className="text-dark-500 text-sm">{new Date(ref.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${ref.status === 'ACTIVATED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {ref.status === 'ACTIVATED' ? 'Activé' : 'Gratuit'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'level2' && (
          <>
            <h2 className="text-xl font-semibold mb-4">Filleuls indirects — Niveau 2</h2>
            {level2.length === 0 ? (
              <div className="text-dark-400 text-center py-8">
                Aucun filleul de niveau 2 pour le moment. Vos filleuls doivent aussi parrainer !
              </div>
            ) : (
              <div className="space-y-3">
                {level2.map((ref: any) => (
                  <div key={ref.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-accent-500/10 rounded-full flex items-center justify-center">
                        <span className="text-accent-400 font-semibold">{(ref.firstName || 'U')[0].toUpperCase()}</span>
                      </div>
                      <div>
                        <div className="font-medium">{ref.firstName} {ref.lastName}</div>
                        <div className="text-dark-500 text-sm">{new Date(ref.createdAt).toLocaleDateString('fr-FR')}</div>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${ref.status === 'ACTIVATED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                      {ref.status === 'ACTIVATED' ? 'Activé' : 'Gratuit'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === 'commissions' && (
          <>
            <h2 className="text-xl font-semibold mb-4">Historique des commissions</h2>
            {commissions.length === 0 ? (
              <div className="text-dark-400 text-center py-8">
                Aucune commission perçue pour le moment. Les commissions arrivent quand vos filleuls complètent des tâches !
              </div>
            ) : (
              <div className="space-y-3">
                {commissions.map((c: any) => (
                  <div key={c.id} className="flex items-center justify-between py-3 border-b border-dark-800 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${c.level === 1 ? 'bg-primary-500/10' : 'bg-accent-500/10'}`}>
                        <ArrowDownRight className={`w-5 h-5 ${c.level === 1 ? 'text-primary-400' : 'text-accent-400'}`} />
                      </div>
                      <div>
                        <div className="font-medium">
                          Commission N{c.level} — {c.sourceUser?.firstName} {c.sourceUser?.lastName}
                        </div>
                        <div className="text-dark-500 text-sm">
                          {new Date(c.createdAt).toLocaleDateString('fr-FR')} · {c.percentage}%
                        </div>
                      </div>
                    </div>
                    <span className="text-green-400 font-semibold">+{fmt(c.amount)} FCFA</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
