import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const LandingContent = dynamic(() => import('@/components/LandingContent'), {
  ssr: true,
});

export const metadata: Metadata = {
  title: "XEARN — Gagnez de l'argent simplement depuis votre téléphone",
  description:
    'Plateforme panafricaine de micro-revenus digitaux. Regardez des publicités, complétez des tâches et parrainez vos proches pour générer des revenus en ligne.',
  openGraph: {
    title: 'XEARN — Micro-revenus digitaux en Afrique',
    description:
      "Gagnez de l'argent simplement depuis votre téléphone. Retraits via MTN, Flooz, TMoney, Orange Money.",
    type: 'website',
  },
};

/** Static revalidation — regenerate every hour */
export const revalidate = 3600;

export default function HomePage() {
  return <LandingContent />;
}
