import type { Metadata } from 'next';
import { Geist, Newsreader } from 'next/font/google';

import { ZyncatTheme } from '@zyncat/ui/theme';

import { SiteJsonLd } from '@/components/JsonLd';
import { DOCS_THEMES } from '@/lib/themes';

import '@/styles/docs.css';
import '@zyncat/ui/styles.css';

const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['italic'],
  weight: 'variable',
  variable: '--font-newsreader',
  display: 'swap',
});

const geist = Geist({ subsets: ['latin'], weight: 'variable', variable: '--font-geist', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL('https://ui.zyncat.app'),
  title: { template: '%s - Zyncat UI', default: 'Zyncat UI — the $400 design system, minus the $400' },
  description:
    'Open-source, motion-first React 19 design system for dashboards and data-heavy apps. 30+ polished components on a small token vocabulary — no Tailwind, no CSS-in-JS. MIT.',
  applicationName: 'Zyncat UI',
  authors: [{ name: 'Tabsir Ahammed', url: 'https://github.com/Tabsir99' }],
  creator: 'Tabsir Ahammed',
  publisher: 'Zyncat UI',
  category: 'technology',
  alternates: { canonical: '/' },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 },
  },
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Zyncat UI — the $400 design system, minus the $400',
    description:
      'Motion-first React components for dashboards and data-heavy apps, polished to paid-kit level. Token-driven theming, no Tailwind, MIT.',
    url: 'https://ui.zyncat.app',
    siteName: 'Zyncat UI',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zyncat UI — the $400 design system, minus the $400',
    description:
      'Motion-first React components for dashboards and data-heavy apps, polished to paid-kit level. Token-driven theming, no Tailwind, MIT.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${newsreader.variable} ${geist.variable}`}>
      <body>
        <ZyncatTheme themes={DOCS_THEMES} transition={{ effect: 'tide' }} />
        <SiteJsonLd />
        {children}
      </body>
    </html>
  );
}
