'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useAuthStore } from '@/store/useAuthStore';

function GoogleCallbackContent() {
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const accessToken = searchParams?.get('accessToken');
    const userParam = searchParams?.get('user');

    if (!accessToken || !userParam) {
      setError('Authentication failed. Missing credentials from Google.');
      return;
    }

    try {
      const user = JSON.parse(decodeURIComponent(userParam));
      setAuth(user, accessToken);

      // Redirect based on role
      if (user.role === 'ADMIN') {
        window.location.href = '/admin';
      } else {
        window.location.href = '/';
      }
    } catch {
      setError('Failed to process authentication data.');
    }
  }, [searchParams, setAuth]);

  if (error) {
    return (
      <div className="min-h-screen bg-stream-bg flex items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl p-10 max-w-md text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-stream-accent/15 flex items-center justify-center">
            <svg className="w-8 h-8 text-stream-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold mb-2">Authentication Error</h1>
          <p className="text-stream-text-secondary mb-6">{error}</p>
          <a
            href="/"
            className="inline-block bg-stream-accent text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-red-600 transition-colors"
          >
            Back to Home
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stream-bg flex flex-col items-center justify-center gap-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
        <p className="text-stream-text-secondary animate-pulse">Signing you in with Google...</p>
      </motion.div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-stream-bg flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-stream-text-secondary animate-pulse">Signing you in...</p>
        </div>
      }
    >
      <GoogleCallbackContent />
    </Suspense>
  );
}
