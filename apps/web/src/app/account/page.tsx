'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Header } from '@/components/layout/Header';

function DeleteAccountButton({
  confirmValue,
  onSuccess,
  onReset,
}: {
  confirmValue: string;
  onSuccess: () => void;
  onReset: () => void;
}) {
  const deleteMu = useMutation({
    mutationFn: () => api.auth.deleteAccount(),
    onSuccess: () => onSuccess(),
    onError: () => onReset(),
  });
  const canDelete = confirmValue.trim().toUpperCase() === 'DELETE';
  return (
    <button
      type="button"
      disabled={!canDelete || deleteMu.isPending}
      onClick={() => deleteMu.mutate()}
      className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:pointer-events-none"
    >
      {deleteMu.isPending ? 'Deleting…' : 'Delete account'}
    </button>
  );
}

export default function AccountPage() {
  const { user, logout, setAuth } = useAuthStore();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.payments.subscriptionStatus(),
    enabled: !!user?.id,
  });

  const { data: me } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => api.auth.me(),
    enabled: !!user?.id,
  });

  const sendVerificationMu = useMutation({
    mutationFn: () => api.auth.sendVerification(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      api.auth.me().then((u) => setAuth(u, useAuthStore.getState().accessToken));
    },
  });

  const emailVerified = me?.emailVerified ?? user?.emailVerified ?? false;

  return (
    <div className="min-h-screen bg-stream-bg">
      <Header />
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="pt-24 px-6 md:px-12 pb-12 max-w-2xl"
      >
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-8"
        >
          <span className="w-1.5 h-8 bg-stream-accent rounded-full" />
          <h1 className="text-3xl font-bold">Account</h1>
        </motion.div>

        {!emailVerified && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
          >
            <div>
              <p className="font-medium text-amber-200">Verify your email</p>
              <p className="text-sm text-stream-text-secondary mt-0.5">
                We sent a verification link to your email. Click it to verify, or resend below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => sendVerificationMu.mutate()}
              disabled={sendVerificationMu.isPending}
              className="px-4 py-2 rounded-lg bg-amber-500/20 text-amber-200 font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50 shrink-0"
            >
              {sendVerificationMu.isPending ? 'Sending…' : 'Resend verification email'}
            </button>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass rounded-2xl p-8 space-y-6"
        >
          <div>
            <p className="text-stream-text-secondary text-sm mb-1">Email</p>
            <p className="font-medium text-lg">{user?.email ?? '—'}</p>
          </div>
          <div className="border-t border-white/10 pt-6">
            <p className="text-stream-text-secondary text-sm mb-1">Plan</p>
            <p className="font-medium text-lg capitalize">{subscription?.tier ?? user?.subscriptionTier ?? '—'}</p>
          </div>
          {user?.role === 'ADMIN' && (
            <div className="border-t border-white/10 pt-6">
              <p className="text-stream-text-secondary text-sm mb-1">Role</p>
              <span className="inline-flex items-center gap-1.5 bg-stream-accent/15 text-stream-accent px-3 py-1 rounded-full text-sm font-medium">
                <span className="w-2 h-2 rounded-full bg-stream-accent animate-pulse" />
                Admin
              </span>
            </div>
          )}
        </motion.div>

        <div className="border-t border-white/10 pt-6 mt-6 flex flex-wrap gap-4 text-sm">
          <Link href="/privacy" className="text-stream-text-secondary hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-stream-text-secondary hover:text-white transition-colors">
            Terms of Service
          </Link>
        </div>

        <div className="border-t border-white/10 pt-6 mt-6">
          <p className="text-stream-text-secondary text-sm mb-2">Delete account</p>
          {!emailVerified && (
            <p className="text-amber-200/90 text-sm mb-2">
              We recommend verifying your email first for account security. You can still delete below.
            </p>
          )}
          <p className="text-stream-text-secondary/80 text-sm mb-3">
            Permanently delete your account and all profiles, watch history, and data. This cannot be undone.
          </p>
          {!showDeleteForm ? (
            <button
              type="button"
              onClick={() => setShowDeleteForm(true)}
              className="text-red-400 hover:text-red-300 text-sm font-medium"
            >
              Delete my account
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-stream-text-secondary text-sm">Type &quot;DELETE&quot; to confirm.</p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm w-full max-w-xs"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setShowDeleteForm(false); setDeleteConfirmText(''); }}
                  className="px-3 py-1.5 rounded-lg glass text-sm"
                >
                  Cancel
                </button>
                <DeleteAccountButton
                  confirmValue={deleteConfirmText}
                  onSuccess={() => {
                    logout();
                    router.push('/login');
                  }}
                  onReset={() => { setShowDeleteForm(false); setDeleteConfirmText(''); }}
                />
              </div>
            </div>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 mt-8 text-stream-text-secondary hover:text-white transition-colors group"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
        </motion.div>
      </motion.main>
    </div>
  );
}
