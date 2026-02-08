'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { Header } from '@/components/layout/Header';

export default function AccountPage() {
  const { user } = useAuthStore();
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => api.payments.subscriptionStatus(),
    enabled: !!user?.id,
  });

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
