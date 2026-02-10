import Link from 'next/link';
import { Header } from '@/components/layout/Header';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <main className="pt-24 px-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <h1 className="text-6xl sm:text-8xl font-bold text-stream-accent mb-2">404</h1>
        <p className="text-xl text-stream-text-secondary mb-6">Page not found</p>
        <p className="text-stream-text-secondary/80 mb-8 max-w-md">
          The page you’re looking for doesn’t exist or has been moved.
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Go home
          </Link>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 glass text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
          >
            Browse
          </Link>
        </div>
      </main>
    </div>
  );
}
