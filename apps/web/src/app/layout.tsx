import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'XEARN - Gagnez de l\'argent en ligne',
  description: 'Plateforme panafricaine de micro-revenus digitaux. Gagnez de l\'argent en regardant des publicités et en parrainant vos proches.',
  keywords: ['gagner argent', 'publicités rémunérées', 'Afrique', 'micro-revenus', 'XEARN'],
  manifest: '/manifest.json',
  openGraph: {
    title: 'XEARN - Gagnez de l\'argent en ligne',
    description: 'Plateforme panafricaine de micro-revenus digitaux. Complétez des tâches simples et parrainez vos proches.',
    siteName: 'XEARN',
    type: 'website',
    locale: 'fr_FR',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XEARN - Gagnez de l\'argent en ligne',
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
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <Script id="sw-register" strategy="afterInteractive">
          {`if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(() => {});
            }`}
        </Script>
      </body>
    </html>
  );
}
