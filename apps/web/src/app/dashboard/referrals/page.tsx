'use client';

import { Copy, Users, TrendingUp } from 'lucide-react';

export default function ReferralsPage() {
  const referralLink = 'https://xearn.com/register?ref=VOTRE_CODE';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    alert('Lien copié !');
  };

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
            className="input-field flex-1"
          />
          <button onClick={copyLink} className="btn-primary flex items-center gap-2">
            <Copy className="w-4 h-4" /> Copier
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
          <div className="text-3xl font-bold gradient-text">40%</div>
          <div className="text-dark-400 mt-1">Commission Niveau 1</div>
          <p className="text-dark-500 text-sm mt-2">Sur les gains de vos filleuls directs</p>
        </div>
        <div className="card text-center">
          <TrendingUp className="w-10 h-10 text-accent-400 mx-auto mb-3" />
          <div className="text-3xl font-bold gradient-text">10%</div>
          <div className="text-dark-400 mt-1">Commission Niveau 2</div>
          <p className="text-dark-500 text-sm mt-2">Sur les gains des filleuls de vos filleuls</p>
        </div>
      </div>

      {/* Referral list */}
      <div className="card">
        <h2 className="text-xl font-semibold mb-4">Mes filleuls</h2>
        <div className="text-dark-400 text-center py-8">
          Aucun filleul pour le moment. Partagez votre lien pour commencer à gagner !
        </div>
      </div>
    </div>
  );
}
