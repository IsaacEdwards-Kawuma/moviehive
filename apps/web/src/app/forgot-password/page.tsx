'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import api, { getApiBase } from '@/lib/api';
import { LogoIcon } from '@/components/Logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const forgotMu = useMutation({
    mutationFn: () => api.auth.forgotPassword(email),
    onSuccess: () => setSent(true),
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    forgotMu.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-stream-bg">
      <header className="p-6">
        <Link href="/" className="inline-flex items-center gap-3 text-stream-accent font-bold text-2xl">
          <LogoIcon className="w-9 h-9" />
          MOVI HIVE
        </Link>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass rounded-2xl p-8"
        >
          <h1 className="text-2xl font-bold mb-2">Forgot password</h1>
          <p className="text-stream-text-secondary text-sm mb-6">
            Enter your email and we&apos;ll send you a link to reset your password.
          </p>
          {sent ? (
            <p className="text-stream-text-secondary">
              If an account exists for that email, you&apos;ll receive a reset link. Check your inbox and spam folder.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent"
                required
              />
              {error && (
                <div className="text-stream-accent text-sm space-y-2">
                  <p>{error}</p>
                  {(error.includes("Can't reach") || error.includes("isn't responding")) && (
                    <a
                      href={`${getApiBase()}/health`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-white/90 hover:text-white underline text-xs"
                    >
                      Open API health check (may wake server) →
                    </a>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={forgotMu.isPending}
                className="w-full bg-stream-accent text-white font-semibold py-3 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {forgotMu.isPending ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          )}
          <Link href="/login" className="inline-block mt-6 text-sm text-stream-text-secondary hover:text-white">
            ← Back to sign in
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
