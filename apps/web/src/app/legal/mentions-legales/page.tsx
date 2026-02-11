import Link from 'next/link';
import { Zap, ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mentions légales — XEARN',
};

export default function MentionsLegalesPage() {
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
        <h1 className="text-4xl font-bold mb-2">Mentions légales</h1>
        <p className="text-dark-400 mb-12">Dernière mise à jour : 11 février 2026</p>

        <div className="space-y-10 text-dark-300 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-white mb-4">1. Éditeur du site</h2>
            <p>
              Le site <strong className="text-white">XEARN</strong> (ci-après « le Site ») est édité par :
            </p>
            <ul className="mt-4 space-y-2 list-none">
              <li><strong className="text-dark-200">Raison sociale :</strong> XEARN</li>
              <li><strong className="text-dark-200">Responsable de la publication :</strong> Jules Zhou</li>
              <li><strong className="text-dark-200">Adresse e-mail :</strong> contact@xearn.com</li>
              <li><strong className="text-dark-200">Statut :</strong> Entrepreneur individuel</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">2. Hébergement</h2>
            <p>Le Site est hébergé par :</p>
            <ul className="mt-4 space-y-2 list-none">
              <li><strong className="text-dark-200">Hébergeur frontend :</strong> Vercel Inc.</li>
              <li><strong className="text-dark-200">Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
              <li><strong className="text-dark-200">Site web :</strong> https://vercel.com</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">3. Propriété intellectuelle</h2>
            <p>
              L&apos;ensemble des éléments du Site (textes, images, logos, icônes, logiciels, base de données, structure)
              est protégé par les lois en vigueur relatives à la propriété intellectuelle.
            </p>
            <p className="mt-4">
              Toute reproduction, représentation, modification, publication, transmission ou dénaturation,
              totale ou partielle, du Site ou de son contenu, par quelque procédé que ce soit, sans
              l&apos;autorisation expresse et préalable de XEARN est interdite et constitue une contrefaçon.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">4. Limitation de responsabilité</h2>
            <p>
              XEARN s&apos;efforce d&apos;assurer l&apos;exactitude des informations diffusées sur le Site.
              Toutefois, XEARN ne peut garantir l&apos;exactitude, la complétude et l&apos;actualité des
              informations publiées.
            </p>
            <p className="mt-4">
              XEARN décline toute responsabilité en cas d&apos;interruption du Site, de survenance de bugs,
              d&apos;inexactitude des informations ou de tout dommage résultant d&apos;une intrusion frauduleuse
              d&apos;un tiers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">5. Liens hypertextes</h2>
            <p>
              Le Site peut contenir des liens vers d&apos;autres sites internet. XEARN n&apos;exerce aucun
              contrôle sur ces sites et n&apos;assume aucune responsabilité quant à leur contenu.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mb-4">6. Contact</h2>
            <p>
              Pour toute question relative aux présentes mentions légales, vous pouvez nous contacter
              à l&apos;adresse : <strong className="text-primary-400">contact@xearn.com</strong>
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
