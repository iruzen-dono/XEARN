'use client';

import { useEffect, useState } from 'react';
import { Copy, Users, TrendingUp, CheckCircle, Award, ArrowDownRight, Share2 } from 'lucide-react';
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

  const shareText = `Rejoins XEARN et gagne de l'argent en complétant des tâches simples ! Inscris-toi avec mon lien : ${referralLink}`;

  const shareWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
  const shareTelegram = () => window.open(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Rejoins XEARN et gagne de l'argent en complétant des tâches simples !")}`, '_blank');
  const shareFacebook = () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`, '_blank');

  const fmt = (n: any) => Number(n || 0).toLocaleString('fr-FR');

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-48 bg-dark-800 rounded animate-pulse mb-2" />
          <div className="h-4 w-72 bg-dark-800 rounded animate-pulse mb-8" />
        </div>
        <div className="card">
          <div className="h-5 w-52 bg-dark-800 rounded animate-pulse mb-4" />
          <div className="flex items-center gap-3">
            <div className="h-10 flex-1 bg-dark-800 rounded-lg animate-pulse" />
            <div className="h-10 w-24 bg-dark-800 rounded-lg animate-pulse" />
          </div>
          <div className="flex gap-2 mt-4">
            <div className="h-10 w-10 bg-dark-800 rounded-lg animate-pulse" />
            <div className="h-10 w-10 bg-dark-800 rounded-lg animate-pulse" />
            <div className="h-10 w-10 bg-dark-800 rounded-lg animate-pulse" />
          </div>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="card h-48 animate-pulse bg-dark-800/50" />
          <div className="card h-48 animate-pulse bg-dark-800/50" />
        </div>
        <div className="card h-20 animate-pulse bg-dark-800/50" />
        <div className="card h-64 animate-pulse bg-dark-800/50" />
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

        {/* Share buttons */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-800">
          <span className="text-dark-400 text-sm flex items-center gap-1.5">
            <Share2 className="w-4 h-4" /> Partager via :
          </span>
          <button
            onClick={shareWhatsApp}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#25D366]/10 text-[#25D366] hover:bg-[#25D366]/20 transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </button>
          <button
            onClick={shareTelegram}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#0088cc]/10 text-[#0088cc] hover:bg-[#0088cc]/20 transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0 12 12 0 0011.944 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
            Telegram
          </button>
          <button
            onClick={shareFacebook}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1877F2]/10 text-[#1877F2] hover:bg-[#1877F2]/20 transition-colors text-sm font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Facebook
          </button>
        </div>
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-primary-500/10 rounded-full flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucun filleul pour le moment</h3>
                <p className="text-dark-400 text-sm max-w-xs mx-auto">Partagez votre lien de parrainage pour commencer à gagner des commissions !</p>
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-accent-500/10 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-8 h-8 text-accent-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucun filleul de niveau 2</h3>
                <p className="text-dark-400 text-sm max-w-xs mx-auto">Vos filleuls directs doivent aussi parrainer pour que vous receviez des commissions N2 !</p>
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
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/10 rounded-full flex items-center justify-center">
                  <Award className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Aucune commission perçue</h3>
                <p className="text-dark-400 text-sm max-w-xs mx-auto">Les commissions arrivent automatiquement quand vos filleuls complètent des tâches !</p>
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
