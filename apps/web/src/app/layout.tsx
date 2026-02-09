import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/Providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-netflix',
  display: 'swap',
  preload: true, // keep preload so the preloaded font is used immediately and the warning goes away
});

export const metadata: Metadata = {
  title: 'Movie Hive - Watch TV Shows & Movies Online',
  description: 'Movie Hive — unlimited movies and TV shows. Watch anywhere. Cancel anytime.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={`min-h-screen bg-stream-bg text-stream-text-primary antialiased ${inter.className}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
