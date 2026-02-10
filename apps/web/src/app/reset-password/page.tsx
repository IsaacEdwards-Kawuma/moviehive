'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import api from '@/lib/api';
import { LogoIcon } from '@/components/Logo';

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams?.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const resetMu = useMutation({
    mutationFn: () => api.auth.resetPassword(token, password),
    onSuccess: () => setDone(true),
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    resetMu.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col bg-stream-bg">
        <header className="p-6">
          <Link href="/" className="inline-flex items-center gap-3 text-stream-accent font-bold text-2xl">
            <LogoIcon className="w-9 h-9" />
            MOVI HIVE
          </Link>
        </header>
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center max-w-md">
            <p className="text-stream-text-secondary mb-4">Invalid or missing reset link. Request a new one from the forgot password page.</p>
            <Link href="/forgot-password" className="text-stream-accent hover:underline">
              Forgot password
            </Link>
          </motion.div>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold mb-2">Set new password</h1>
          <p className="text-stream-text-secondary text-sm mb-6">Choose a new password (at least 8 characters).</p>
          {done ? (
            <p className="text-stream-text-secondary mb-4">
              Your password has been reset. You can now sign in with your new password.
            </p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <input
                type="password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent"
                required
                minLength={8}
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-stream-text-secondary focus:outline-none focus:ring-2 focus:ring-stream-accent"
                required
                minLength={8}
              />
              {error && <p className="text-stream-accent text-sm">{error}</p>}
              <button
                type="submit"
                disabled={resetMu.isPending}
                className="w-full bg-stream-accent text-white font-semibold py-3 rounded-lg hover:bg-red-600 disabled:opacity-50"
              >
                {resetMu.isPending ? 'Resetting…' : 'Reset password'}
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
