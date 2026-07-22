import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: "XEARN - Gagnez de l'argent en ligne",
  description:
    "Plateforme panafricaine de micro-revenus digitaux. Gagnez de l'argent en regardant des publicités et en parrainant vos proches.",
  keywords: ['gagner argent', 'publicités rémunérées', 'Afrique', 'micro-revenus', 'XEARN'],
  manifest: '/manifest.json',
  openGraph: {
    title: "XEARN - Gagnez de l'argent en ligne",
    description:
      'Plateforme panafricaine de micro-revenus digitaux. Complétez des tâches simples et parrainez vos proches.',
    siteName: 'XEARN',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: "XEARN - Gagnez de l'argent en ligne",
    description: 'Plateforme panafricaine de micro-revenus digitaux.',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'XEARN',
  },
};

export const viewport: Viewport = {
  themeColor: '#6366f1',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={inter.className}>
        {/* WCAG: Skip-to-content link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary-600 focus:text-white focus:rounded-xl focus:outline-2 focus:outline-offset-2 focus:outline-primary-400"
        >
          Aller au contenu principal
        </a>
        <div id="main-content">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
