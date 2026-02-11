import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';
import { SentryInit } from '@/components/SentryInit';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-netflix',
  display: 'swap',
  preload: false, // avoid "preload was not used" warning; font still loads with CSS
});

export const metadata: Metadata = {
  title: 'MOVI HIVE - Movies, Anytime, Anywhere',
  description: 'MOVI HIVE — movies and TV shows. Watch anytime, anywhere.',
  icons: { icon: '/icon.svg' },
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'MOVI HIVE' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`min-h-screen bg-stream-bg text-stream-text-primary antialiased ${inter.className}`}>
        <SentryInit />
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
