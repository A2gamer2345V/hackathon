import type { Metadata, Viewport } from 'next';
import { Fraunces, Noto_Sans_Bengali, Noto_Sans_Devanagari, Nunito } from 'next/font/google';
import { Providers } from '@/lib/providers';
import { OfflineBanner } from '@/components/system/offline-banner';
import { ServiceWorkerRegistrar } from '@/components/system/service-worker';
import './globals.css';

/**
 * Nunito carries the friendly, rounded UI voice; Fraunces gives headings a warm,
 * human note without looking clinical. The two Noto families are loaded so the
 * Devanagari and Bengali/Meitei scripts render properly instead of falling back
 * to a system font that may not be installed.
 */
const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-nunito',
  display: 'swap',
});

// `axes` is only allowed on a variable font, so the weight axis stays variable
// rather than being pinned to a list — SOFT and WONK are what give the headings
// their warmth, so they are worth keeping.
const fraunces = Fraunces({
  subsets: ['latin'],
  weight: 'variable',
  axes: ['SOFT', 'WONK'],
  variable: '--font-fraunces',
  display: 'swap',
});

const devanagari = Noto_Sans_Devanagari({
  subsets: ['devanagari'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-devanagari',
  display: 'swap',
});

const bengali = Noto_Sans_Bengali({
  subsets: ['bengali'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-bengali',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'ElderEase — Care, support, better days',
    template: '%s · ElderEase',
  },
  description:
    'ElderEase is a calm, multilingual companion for memory activities, daily plans and reminders, with an adaptive caregiver dashboard for the family.',
  applicationName: 'ElderEase',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'ElderEase', statusBarStyle: 'default' },
  icons: {
    icon: [{ url: '/icons/icon.svg', type: 'image/svg+xml' }],
    apple: [{ url: '/icons/icon-192.png' }],
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#faf6ee',
  width: 'device-width',
  initialScale: 1,
  // Elderly users pinch-zoom. Never lock it down.
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      dir="ltr"
      data-text-scale="normal"
      data-contrast="normal"
      data-motion="full"
      suppressHydrationWarning
    >
      <body
        className={`${nunito.variable} ${fraunces.variable} ${devanagari.variable} ${bengali.variable} antialiased`}
      >
        <Providers>
          <a href="#main" className="skip-link">
            Skip to main content
          </a>
          <OfflineBanner />
          {children}
          <ServiceWorkerRegistrar />
        </Providers>
      </body>
    </html>
  );
}
