import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Politique de confidentialité — XEARN',
};

export default function ConfidentialitePage() {
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
        <h1 className="text-4xl font-bold mb-2">Politique de confidentialité</h1>
        <p className="text-dark-400 mb-12">Dernière mise à jour : 11 février 2026</p>

        <div className="space-y-10 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Introduction</h2>
            <p>
              XEARN (ci-après « nous ») s&apos;engage à protéger la vie privée de ses utilisateurs
              (ci-après « vous »). La présente politique de confidentialité décrit les données
              personnelles que nous collectons, comment nous les utilisons et les droits dont vous disposez.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Données collectées</h2>
            <p>Nous collectons les catégories de données suivantes :</p>

            <h3 className="text-lg font-medium text-dark-200 mt-6 mb-3">2.1 Données fournies directement</h3>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-dark-200">Identité :</strong> nom, prénom</li>
              <li><strong className="text-dark-200">Contact :</strong> adresse e-mail</li>
              <li><strong className="text-dark-200">Authentification :</strong> mot de passe (stocké de manière chiffrée), identifiant Google (si connexion via Google)</li>
              <li><strong className="text-dark-200">Paiement :</strong> informations nécessaires au traitement des retraits (numéro de téléphone mobile money)</li>
            </ul>

            <h3 className="text-lg font-medium text-dark-200 mt-6 mb-3">2.2 Données collectées automatiquement</h3>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-dark-200">Données de connexion :</strong> adresse IP, type de navigateur, appareil utilisé</li>
              <li><strong className="text-dark-200">Données d&apos;utilisation :</strong> tâches complétées, gains accumulés, historique de retraits</li>
              <li><strong className="text-dark-200">Données de parrainage :</strong> code de parrainage, arbre de filleuls</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Finalités du traitement</h2>
            <p>Vos données sont utilisées pour :</p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Créer et gérer votre compte utilisateur</li>
              <li>Vous permettre de compléter des tâches et percevoir des gains</li>
              <li>Gérer le système de parrainage et calculer les commissions</li>
              <li>Traiter vos demandes de retrait</li>
              <li>Vous envoyer des communications liées au Service (vérification d&apos;e-mail, notifications)</li>
              <li>Prévenir et détecter les fraudes</li>
              <li>Améliorer la qualité du Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Base juridique</h2>
            <p>Le traitement de vos données repose sur :</p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li><strong className="text-dark-200">L&apos;exécution du contrat :</strong> les données sont nécessaires pour fournir le Service auquel vous avez souscrit</li>
              <li><strong className="text-dark-200">L&apos;intérêt légitime :</strong> prévention de la fraude, amélioration du Service</li>
              <li><strong className="text-dark-200">Le consentement :</strong> pour l&apos;envoi de communications marketing (le cas échéant)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Partage des données</h2>
            <p>
              Nous ne vendons jamais vos données personnelles. Vos données peuvent être partagées avec :
            </p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li><strong className="text-dark-200">Prestataires de paiement :</strong> FedaPay, pour le traitement des transactions financières</li>
              <li><strong className="text-dark-200">Hébergeurs :</strong> Vercel (frontend), Railway (API), Neon/Supabase (base de données)</li>
              <li><strong className="text-dark-200">Authentification :</strong> Google, si vous choisissez de vous connecter via votre compte Google</li>
            </ul>
            <p className="mt-4">
              Ces prestataires n&apos;ont accès qu&apos;aux données strictement nécessaires à l&apos;exécution
              de leurs services et sont tenus de respecter la confidentialité de vos données.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Durée de conservation</h2>
            <ul className="space-y-2 list-disc list-inside">
              <li><strong className="text-dark-200">Données de compte :</strong> conservées tant que le compte est actif, puis supprimées sous 12 mois après la clôture</li>
              <li><strong className="text-dark-200">Données financières :</strong> conservées pendant 5 ans conformément aux obligations légales</li>
              <li><strong className="text-dark-200">Données de connexion :</strong> conservées pendant 12 mois</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">7. Sécurité des données</h2>
            <p>Nous mettons en œuvre des mesures de sécurité appropriées pour protéger vos données :</p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li>Chiffrement des mots de passe (bcrypt)</li>
              <li>Connexions sécurisées via HTTPS</li>
              <li>Protection contre les attaques par force brute (rate limiting)</li>
              <li>En-têtes de sécurité HTTP (Helmet, HSTS, CSP)</li>
              <li>Contrôle d&apos;accès strict (CORS)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">8. Vos droits</h2>
            <p>Conformément à la réglementation applicable, vous disposez des droits suivants :</p>
            <ul className="mt-4 space-y-2 list-disc list-inside">
              <li><strong className="text-dark-200">Droit d&apos;accès :</strong> obtenir une copie de vos données personnelles</li>
              <li><strong className="text-dark-200">Droit de rectification :</strong> corriger des données inexactes ou incomplètes</li>
              <li><strong className="text-dark-200">Droit à l&apos;effacement :</strong> demander la suppression de vos données</li>
              <li><strong className="text-dark-200">Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
              <li><strong className="text-dark-200">Droit d&apos;opposition :</strong> vous opposer au traitement de vos données</li>
              <li><strong className="text-dark-200">Droit à la limitation :</strong> demander la limitation du traitement</li>
            </ul>
            <p className="mt-4">
              Pour exercer ces droits, contactez-nous à :
              <strong className="text-primary-400"> contact@xearn.com</strong>
            </p>
            <p className="mt-4">
              Nous nous engageons à répondre à votre demande dans un délai de 30 jours.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">9. Cookies</h2>
            <p>
              Le Site utilise des cookies techniques essentiels au fonctionnement du Service
              (session de connexion, préférences). Aucun cookie publicitaire ou de suivi tiers
              n&apos;est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">10. Modifications</h2>
            <p>
              Nous pouvons mettre à jour cette politique de confidentialité à tout moment. En cas de
              modification substantielle, vous serez informé par e-mail ou via une notification sur le Site.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">11. Contact</h2>
            <p>
              Pour toute question relative à la protection de vos données, contactez notre
              responsable de la protection des données à :
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
