'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { LogoIcon } from '@/components/Logo';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const setAuth = useAuthStore((s) => s.setAuth);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Missing verification token. Use the link from your email or request a new one from Account.');
      return;
    }
    setStatus('loading');
    api.auth
      .verifyEmail(token)
      .then((res) => {
        setStatus('success');
        setMessage(res.message ?? 'Email verified.');
        return api.auth.me().catch(() => null);
      })
      .then((me) => {
        if (me) {
          setAuth(me, useAuthStore.getState().accessToken);
        }
      })
      .catch((err: Error) => {
        setStatus('error');
        setMessage(err.message ?? 'Verification failed.');
      });
  }, [token, setAuth]);

  return (
    <div className="min-h-screen flex flex-col bg-stream-bg">
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-3 text-stream-accent font-bold text-2xl">
          <LogoIcon className="w-9 h-9" />
          MOVI HIVE
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md w-full"
        >
          {status === 'loading' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
              <p className="text-stream-text-secondary">Verifying your email…</p>
            </>
          )}
          {status === 'success' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Email verified</h1>
              <p className="text-stream-text-secondary mb-6">{message}</p>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 bg-stream-accent text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Go to Account
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-2">Verification failed</h1>
              <p className="text-stream-text-secondary mb-6">{message}</p>
              <Link
                href="/account"
                className="inline-flex items-center gap-2 glass text-white px-6 py-3 rounded-lg font-semibold hover:bg-white/10 transition-colors"
              >
                Account (resend link)
              </Link>
            </>
          )}
          {status === 'idle' && token && (
            <p className="text-stream-text-secondary">Verifying…</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-stream-bg">
          <div className="w-12 h-12 border-4 border-stream-accent border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
