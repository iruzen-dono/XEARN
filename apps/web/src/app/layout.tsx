import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'XEARN - Gagnez de l\'argent en ligne',
  description: 'Plateforme panafricaine de micro-revenus digitaux. Gagnez de l\'argent en regardant des publicités et en parrainant vos proches.',
  keywords: ['gagner argent', 'publicités rémunérées', 'Afrique', 'micro-revenus', 'XEARN'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
