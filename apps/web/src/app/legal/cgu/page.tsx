import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Conditions Générales d\'Utilisation — XEARN',
};

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-dark-950">
      {/* Header */}
      <header className="border-b border-dark-800 py-4 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Zap className="w-6 h-6 text-primary-400" />
            <span className="text-xl font-bold gradient-text">XEARN</span>
          </Link>
          <Link href="/" className="text-dark-400 hover:text-white text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Retour à l&apos;accueil
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-2">Conditions Générales d&apos;Utilisation</h1>
        <p className="text-dark-400 mb-12">Dernière mise à jour : 11 février 2026</p>

        <div className="space-y-10 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Objet</h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation (ci-après « CGU ») définissent les
              modalités et conditions dans lesquelles les utilisateurs (ci-après « l&apos;Utilisateur »)
              peuvent accéder et utiliser les services proposés par la plateforme XEARN (ci-après « le Service »).
            </p>
            <p className="mt-4">
              L&apos;inscription sur le Site implique l&apos;acceptation pleine et entière des présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Description du Service</h2>
            <p>
              XEARN est une plateforme de micro-revenus digitaux permettant aux Utilisateurs de :
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Gagner des revenus en complétant des tâches rémunérées (visionnage de publicités, sondages, etc.)</li>
              <li>Parrainer d&apos;autres Utilisateurs et percevoir des commissions sur leurs revenus</li>
              <li>Retirer leurs gains via les moyens de paiement mobile disponibles</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Inscription</h2>
            <p>
              Pour utiliser le Service, l&apos;Utilisateur doit créer un compte en fournissant des
              informations exactes et à jour (nom, prénom, adresse e-mail). L&apos;Utilisateur doit
              confirmer son adresse e-mail via le lien de vérification envoyé lors de l&apos;inscription.
            </p>
            <p className="mt-4">
              L&apos;Utilisateur est responsable de la confidentialité de ses identifiants de connexion
              et de toutes les activités effectuées sous son compte.
            </p>
            <p className="mt-4">
              L&apos;Utilisateur doit être âgé d&apos;au moins <strong className="text-white">18 ans</strong> pour
              s&apos;inscrire sur la plateforme.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Activation du compte</h2>
            <p>
              L&apos;accès aux fonctionnalités complètes du Service (tâches rémunérées, retraits,
              parrainage) requiert l&apos;activation du compte moyennant un paiement unique de
              <strong className="text-white"> 4 000 FCFA</strong>. Ce paiement est non remboursable.
            </p>
            <p className="mt-4">
              Un compte non activé (gratuit) peut consulter les tâches disponibles mais ne peut pas
              percevoir de revenus ni effectuer de retraits.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Système de parrainage</h2>
            <p>Le programme de parrainage fonctionne sur deux niveaux :</p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li><strong className="text-white">Niveau 1 (filleuls directs) :</strong> 40% de commission sur les frais d&apos;activation de chaque filleul direct</li>
              <li><strong className="text-white">Niveau 2 (filleuls indirects) :</strong> 10% de commission sur les frais d&apos;activation des filleuls de vos filleuls</li>
            </ul>
            <p className="mt-4">
              Les commissions sont créditées automatiquement sur le portefeuille de l&apos;Utilisateur
              après confirmation du paiement d&apos;activation du filleul.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Gains et retraits</h2>
            <p>
              Les gains perçus via les tâches et le parrainage sont comptabilisés en FCFA dans le
              portefeuille virtuel de l&apos;Utilisateur. Les retraits sont soumis aux conditions suivantes :
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Le compte doit être activé</li>
              <li>Le montant minimum de retrait est fixé par la plateforme</li>
              <li>Les retraits sont traités dans un délai raisonnable après validation par l&apos;équipe</li>
              <li>XEARN se réserve le droit de demander des justificatifs avant tout retrait</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Comportements interdits</h2>
            <p>L&apos;Utilisateur s&apos;engage à ne pas :</p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Créer plusieurs comptes</li>
              <li>Utiliser des robots, scripts ou tout moyen automatisé pour compléter des tâches</li>
              <li>Fournir de fausses informations lors de l&apos;inscription</li>
              <li>Tenter de manipuler le système de gains ou de parrainage</li>
              <li>Utiliser le Service à des fins illégales ou frauduleuses</li>
              <li>Revendre ou céder son compte à un tiers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Suspension et résiliation</h2>
            <p>
              XEARN se réserve le droit de suspendre ou de résilier le compte d&apos;un Utilisateur,
              sans préavis ni indemnité, en cas de :
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Non-respect des présentes CGU</li>
              <li>Activité frauduleuse ou suspicion de fraude</li>
              <li>Utilisation abusive du Service</li>
              <li>Création de comptes multiples</li>
            </ul>
            <p className="mt-4">
              En cas de résiliation pour fraude, les gains non retirés seront annulés.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Limitation de responsabilité</h2>
            <p>
              XEARN ne garantit pas un niveau de revenus minimum. Les gains dépendent de
              l&apos;activité de l&apos;Utilisateur, de la disponibilité des tâches et du nombre de filleuls.
            </p>
            <p className="mt-4">
              XEARN ne saurait être tenu responsable des interruptions de service, pertes de données
              ou dommages indirects liés à l&apos;utilisation du Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Modification des CGU</h2>
            <p>
              XEARN se réserve le droit de modifier les présentes CGU à tout moment. Les Utilisateurs
              seront informés des modifications par e-mail ou via une notification sur le Site.
              L&apos;utilisation continue du Service après modification vaut acceptation des nouvelles CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Droit applicable</h2>
            <p>
              Les présentes CGU sont régies par le droit applicable dans le pays d&apos;établissement
              de XEARN. En cas de litige, les parties s&apos;engagent à rechercher une solution amiable
              avant toute action judiciaire.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">12. Contact</h2>
            <p>
              Pour toute question relative aux présentes CGU, contactez-nous à :
              <strong className="text-primary-400"> contact@xearn.com</strong>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-dark-800">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-dark-500 text-sm">© 2026 XEARN. Tous droits réservés.</p>
          <div className="flex gap-6 text-sm text-dark-400">
            <Link href="/legal/mentions-legales" className="hover:text-white">Mentions légales</Link>
            <Link href="/legal/cgu" className="hover:text-white">CGU</Link>
            <Link href="/legal/confidentialite" className="hover:text-white">Confidentialité</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
