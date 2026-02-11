import Link from 'next/link';
import { ArrowRight, Zap, Users, Wallet, Shield, TrendingUp, Smartphone } from 'lucide-react';
import Navbar from '@/components/Navbar';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-500/5 to-transparent" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-primary-500/10 border border-primary-500/20 rounded-full px-4 py-2 mb-8">
            <Zap className="w-4 h-4 text-primary-400" />
            <span className="text-primary-300 text-sm font-medium">La plateforme #1 de micro-revenus en Afrique</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Gagnez de l&apos;argent{' '}
            <span className="gradient-text">simplement</span>{' '}
            depuis votre téléphone
          </h1>

          <p className="text-xl text-dark-300 max-w-2xl mx-auto mb-10">
            Regardez des publicités, complétez des tâches et parrainez vos proches pour générer des revenus en ligne. Accessible à tous.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/register" className="btn-primary text-lg py-4 px-8 flex items-center gap-2">
              Commencer gratuitement <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#how-it-works" className="btn-secondary text-lg py-4 px-8">
              En savoir plus
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-20 max-w-lg mx-auto">
            <div>
              <div className="text-3xl font-bold gradient-text">4K</div>
              <div className="text-dark-400 text-sm">FCFA pour démarrer</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text">40%</div>
              <div className="text-dark-400 text-sm">Commission N1</div>
            </div>
            <div>
              <div className="text-3xl font-bold gradient-text">2K</div>
              <div className="text-dark-400 text-sm">FCFA retrait min</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Pourquoi choisir <span className="gradient-text">XEARN</span> ?</h2>
            <p className="text-dark-400 max-w-xl mx-auto">Une plateforme pensée pour l&apos;Afrique, simple et transparente.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Smartphone, title: 'Accessible', desc: 'Un smartphone et une connexion Internet suffisent.' },
              { icon: Wallet, title: 'Retraits rapides', desc: 'Retirez vos gains via Mobile Money, cartes ou PayPal.' },
              { icon: Users, title: 'Parrainage 2 niveaux', desc: '40% niveau 1, 10% niveau 2. Gagnez sur votre réseau.' },
              { icon: TrendingUp, title: 'Revenus croissants', desc: 'Plus vous êtes actif, plus vous gagnez.' },
              { icon: Shield, title: 'Sécurisé', desc: 'Anti-triche, détection multi-comptes, données protégées.' },
              { icon: Zap, title: 'Instantané', desc: 'Validation automatique des tâches et crédits immédiats.' },
            ].map((feature, i) => (
              <div key={i} className="card hover:border-primary-500/30 transition-colors group">
                <feature.icon className="w-10 h-10 text-primary-400 mb-4 group-hover:text-primary-300 transition-colors" />
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-dark-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-dark-900/30">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Comment ça <span className="gradient-text">marche</span> ?</h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { step: '1', title: 'Inscrivez-vous', desc: 'Créez votre compte gratuitement avec votre email ou téléphone.' },
              { step: '2', title: 'Activez votre compte', desc: 'Payez 4 000 FCFA pour débloquer les retraits et l\'affiliation.' },
              { step: '3', title: 'Complétez des tâches', desc: 'Regardez des publicités et gagnez de l\'argent automatiquement.' },
              { step: '4', title: 'Retirez vos gains', desc: 'Retirez à partir de 2 000 FCFA via Mobile Money ou PayPal.' },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 bg-primary-500/20 border border-primary-500/30 rounded-2xl flex items-center justify-center text-primary-400 text-xl font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-dark-400 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4"><span className="gradient-text">Tarifs</span> simples</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="card border-dark-600">
              <h3 className="text-xl font-bold mb-2">Gratuit</h3>
              <div className="text-3xl font-bold mb-4">0 <span className="text-lg text-dark-400">FCFA</span></div>
              <ul className="space-y-3 text-dark-300 mb-6">
                <li>✅ Accès aux tâches publicitaires</li>
                <li>❌ Pas de retrait</li>
                <li>❌ Pas d&apos;affiliation</li>
              </ul>
              <Link href="/register" className="btn-secondary w-full text-center block">Commencer</Link>
            </div>

            <div className="card border-primary-500/50 relative">
              <div className="absolute -top-3 right-4 bg-primary-500 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAIRE</div>
              <h3 className="text-xl font-bold mb-2">Activé</h3>
              <div className="text-3xl font-bold mb-4">4 000 <span className="text-lg text-dark-400">FCFA</span></div>
              <ul className="space-y-3 text-dark-300 mb-6">
                <li>✅ Toutes les tâches</li>
                <li>✅ Retraits illimités</li>
                <li>✅ Lien d&apos;affiliation</li>
                <li>✅ Commissions 40% + 10%</li>
              </ul>
              <Link href="/register" className="btn-primary w-full text-center block">Activer mon compte</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-dark-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-primary-400" />
              <span className="text-xl font-bold gradient-text">XEARN</span>
            </div>
            <div className="flex gap-6 text-sm text-dark-400">
              <Link href="/legal/mentions-legales" className="hover:text-white transition-colors">Mentions légales</Link>
              <Link href="/legal/cgu" className="hover:text-white transition-colors">CGU</Link>
              <Link href="/legal/confidentialite" className="hover:text-white transition-colors">Confidentialité</Link>
            </div>
          </div>
          <div className="mt-6 text-center md:text-left">
            <p className="text-dark-500 text-sm">© 2026 XEARN. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
